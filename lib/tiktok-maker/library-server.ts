/**
 * lib/tiktok-maker/library-server.ts — the TikTok maker's permanent record
 * (server only). Nothing is ever deleted or overwritten:
 *   tiktokScripts/{id}     every script written or pasted; edits push the
 *                          previous version onto `revisions`; removing one
 *                          from the batch only sets `archived`.
 *   tiktokDrafts/{id}      drafts the form check rejected, with the reason.
 *   tiktokVoiceovers/{id}  every ElevenLabs take, with the exact text spoken;
 *                          the MP3 lives in Storage at tiktok-maker/voiceovers/.
 *   tiktokImages/{id}      every background image added to the pool: uploads
 *                          (Storage, tiktok-maker/images/) or Pexels/Unsplash
 *                          picks (their CDN URL + credit). Removing one from the
 *                          pool only sets `archived`.
 *   tiktokRenders/{id}     every exported MP4 (Storage, tiktok-maker/renders/),
 *                          with the script, take, image and settings it used.
 *   tiktokMusic/{id}       every background-sound file (Storage, tiktok-maker/music/).
 *   tiktokSettings/default the shared style (text, background, sound, music id);
 *                          each save first copies the previous one to `history`.
 *   tiktokRenderJobs/{id}  the bulk render queue (queued → rendering → done/failed).
 *
 * Big files never pass through an API route (Vercel caps bodies at ~4.5 MB):
 * the browser uploads straight to Storage through a resumable session made
 * here, and reads them back through short-lived signed URLs.
 */
import admin from 'firebase-admin';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

export const SCRIPTS = 'tiktokScripts';
export const DRAFTS = 'tiktokDrafts';
export const VOICEOVERS = 'tiktokVoiceovers';
export const IMAGES = 'tiktokImages';
export const RENDERS = 'tiktokRenders';
export const MUSIC = 'tiktokMusic';
export const SETTINGS = 'tiktokSettings';
export const JOBS = 'tiktokRenderJobs';
/** Signed read links last a week (the V4 maximum); the library re-signs on every load. */
const SIGNED_URL_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BUCKET = 'grateful-today-761f2.appspot.com';

export interface ScriptRecord {
  id: string;
  day: number;
  title: string;
  script: string;
  source: 'generated' | 'pasted';
  batchId: string;
  direction: string;
  archived: boolean;
  /** Background image chosen for this script; null = the pool's round-robin. */
  imageId: string | null;
  /** Optional image per on-screen line (null entries use `imageId`); null = off. */
  lineImageIds: (string | null)[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceoverRecord {
  id: string;
  scriptId: string | null;
  text: string;
  voiceId: string;
  model: string;
  stability: number;
  storagePath: string;
  bytes: number;
  createdAt: string;
}

const now = () => new Date().toISOString();

export async function saveScripts(
  scripts: { day: number; title: string; script: string }[],
  meta: { source: ScriptRecord['source']; direction?: string },
): Promise<ScriptRecord[]> {
  const { db } = getFirebaseAdmin();
  const batchId = db.collection(SCRIPTS).doc().id;
  const at = now();
  const batch = db.batch();
  const records = scripts.map((s) => {
    const ref = db.collection(SCRIPTS).doc();
    const record: ScriptRecord = {
      id: ref.id,
      day: s.day,
      title: s.title,
      script: s.script,
      source: meta.source,
      batchId,
      direction: meta.direction ?? '',
      archived: false,
      imageId: null,
      lineImageIds: null,
      createdAt: at,
      updatedAt: at,
    };
    batch.set(ref, { ...record, revisions: [] });
    return record;
  });
  await batch.commit();
  return records;
}

export async function saveRejectedDrafts(drafts: string[], direction: string): Promise<void> {
  if (drafts.length === 0) return;
  const { db } = getFirebaseAdmin();
  const batch = db.batch();
  const at = now();
  drafts.forEach((text) => batch.set(db.collection(DRAFTS).doc(), { text, direction, createdAt: at }));
  await batch.commit();
}

/** Edit a script; the version being replaced goes onto `revisions`. */
export async function updateScript(
  id: string,
  patch: Partial<Pick<ScriptRecord, 'day' | 'title' | 'script' | 'archived' | 'imageId' | 'lineImageIds'>>,
): Promise<void> {
  const { db } = getFirebaseAdmin();
  const ref = db.collection(SCRIPTS).doc(id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error('Script not found.');
    const prev = snap.data() as ScriptRecord;
    const changed =
      (patch.day !== undefined && patch.day !== prev.day) ||
      (patch.title !== undefined && patch.title !== prev.title) ||
      (patch.script !== undefined && patch.script !== prev.script);
    const update: admin.firestore.DocumentData = { ...patch, updatedAt: now() };
    if (changed) {
      update.revisions = admin.firestore.FieldValue.arrayUnion({
        day: prev.day,
        title: prev.title,
        script: prev.script,
        savedAt: prev.updatedAt,
      });
    }
    tx.update(ref, update);
  });
}

export async function listScripts(): Promise<ScriptRecord[]> {
  const { db } = getFirebaseAdmin();
  const snap = await db.collection(SCRIPTS).get();
  return snap.docs
    .map((d) => {
      const { revisions: _revisions, ...rest } = d.data() as ScriptRecord & { revisions?: unknown };
      return { ...rest, imageId: rest.imageId ?? null, lineImageIds: rest.lineImageIds ?? null, id: d.id };
    })
    .sort((a, b) => a.day - b.day || a.createdAt.localeCompare(b.createdAt));
}

export async function saveVoiceover(
  mp3: Buffer,
  meta: Omit<VoiceoverRecord, 'id' | 'storagePath' | 'bytes' | 'createdAt'>,
): Promise<VoiceoverRecord> {
  const { db, storage } = getFirebaseAdmin();
  const ref = db.collection(VOICEOVERS).doc();
  const storagePath = `tiktok-maker/voiceovers/${meta.scriptId ?? 'unlinked'}/${ref.id}.mp3`;
  await storage.bucket(BUCKET).file(storagePath).save(mp3, { contentType: 'audio/mpeg', resumable: false });
  const record: VoiceoverRecord = { ...meta, id: ref.id, storagePath, bytes: mp3.length, createdAt: now() };
  await ref.set(record);
  return record;
}

export async function listVoiceovers(): Promise<VoiceoverRecord[]> {
  const { db } = getFirebaseAdmin();
  const snap = await db.collection(VOICEOVERS).get();
  return snap.docs.map((d) => ({ ...(d.data() as VoiceoverRecord), id: d.id })).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function readVoiceover(id: string): Promise<Buffer> {
  const { db, storage } = getFirebaseAdmin();
  const snap = await db.collection(VOICEOVERS).doc(id).get();
  if (!snap.exists) throw new Error('Voiceover not found.');
  const { storagePath } = snap.data() as VoiceoverRecord;
  const [bytes] = await storage.bucket(BUCKET).file(storagePath).download();
  return bytes;
}

// ─── Images and renders ─────────────────────────────────────────────────────

export interface ImageRecord {
  id: string;
  kind: 'upload' | 'stock';
  name: string;
  /** Uploads: Storage path. */
  storagePath: string | null;
  /** Stock: the provider's 1080×1920 CDN URL and thumbnail. */
  url: string | null;
  thumb: string | null;
  /** "Photo by X on Pexels" for stock picks. */
  credit: string | null;
  source: 'pexels' | 'unsplash' | null;
  pageUrl: string | null;
  photographerUrl: string | null;
  stockId: string | null;
  archived: boolean;
  createdAt: string;
}

export interface RenderRecord {
  id: string;
  scriptId: string;
  voiceoverId: string | null;
  imageId: string | null;
  fileName: string;
  storagePath: string;
  bytes: number;
  durationSec: number;
  /** The text/background/sound settings it was rendered with. */
  settings: Record<string, unknown>;
  createdAt: string;
}

function bucket() {
  return getFirebaseAdmin().storage.bucket(BUCKET);
}

async function signedReadUrl(storagePath: string, downloadName?: string): Promise<string> {
  const [url] = await bucket()
    .file(storagePath)
    .getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + SIGNED_URL_TTL_MS,
      ...(downloadName ? { responseDisposition: `attachment; filename="${downloadName.replace(/"/g, '')}"` } : {}),
    });
  return url;
}

/**
 * A resumable upload session the browser PUTs the file to directly. GCS
 * answers CORS for the `origin` the session was made for.
 */
export async function createUploadSession(input: {
  kind: 'image' | 'render' | 'music';
  contentType: string;
  origin: string;
  scriptId?: string;
  extension?: string;
}): Promise<{ id: string; storagePath: string; uploadUrl: string }> {
  const { db } = getFirebaseAdmin();
  const collection = input.kind === 'image' ? IMAGES : input.kind === 'music' ? MUSIC : RENDERS;
  const id = db.collection(collection).doc().id;
  const storagePath =
    input.kind === 'image'
      ? `tiktok-maker/images/${id}.jpg`
      : input.kind === 'music'
        ? `tiktok-maker/music/${id}.${input.extension ?? 'mp3'}`
        : `tiktok-maker/renders/${input.scriptId ?? 'unlinked'}/${id}.mp4`;
  const [uploadUrl] = await bucket()
    .file(storagePath)
    .createResumableUpload({ origin: input.origin, metadata: { contentType: input.contentType } });
  return { id, storagePath, uploadUrl };
}

async function uploadedSize(storagePath: string): Promise<number> {
  const file = bucket().file(storagePath);
  const [exists] = await file.exists();
  if (!exists) throw new Error('The upload did not reach Storage.');
  const [meta] = await file.getMetadata();
  return Number(meta.size ?? 0);
}

export async function finalizeImageUpload(input: { id: string; storagePath: string; name: string }): Promise<ImageRecord> {
  if (!input.storagePath.startsWith('tiktok-maker/images/')) throw new Error('Bad storage path.');
  await uploadedSize(input.storagePath);
  const record: ImageRecord = {
    id: input.id,
    kind: 'upload',
    name: input.name.slice(0, 200),
    storagePath: input.storagePath,
    url: null,
    thumb: null,
    credit: null,
    source: null,
    pageUrl: null,
    photographerUrl: null,
    stockId: null,
    archived: false,
    createdAt: now(),
  };
  await getFirebaseAdmin().db.collection(IMAGES).doc(input.id).set(record);
  return record;
}

export async function saveStockImage(input: {
  name: string;
  url: string;
  thumb: string;
  source: 'pexels' | 'unsplash';
  pageUrl: string;
  photographerUrl: string;
  stockId: string;
}): Promise<ImageRecord> {
  const { db } = getFirebaseAdmin();
  // The same photo picked again reuses (and un-archives) its record.
  const existing = await db.collection(IMAGES).where('stockId', '==', input.stockId).limit(1).get();
  if (!existing.empty) {
    const doc = existing.docs[0];
    await doc.ref.update({ archived: false });
    return { ...(doc.data() as ImageRecord), id: doc.id, archived: false };
  }
  const ref = db.collection(IMAGES).doc();
  const record: ImageRecord = {
    id: ref.id,
    kind: 'stock',
    name: input.name,
    storagePath: null,
    url: input.url,
    thumb: input.thumb,
    credit: input.name,
    source: input.source,
    pageUrl: input.pageUrl,
    photographerUrl: input.photographerUrl,
    stockId: input.stockId,
    archived: false,
    createdAt: now(),
  };
  await ref.set(record);
  return record;
}

export async function setImageArchived(id: string, archived: boolean): Promise<void> {
  await getFirebaseAdmin().db.collection(IMAGES).doc(id).update({ archived });
}

/** Images with a usable URL: stock → CDN, upload → signed Storage link. */
export async function listImages(): Promise<(ImageRecord & { displayUrl: string })[]> {
  const snap = await getFirebaseAdmin().db.collection(IMAGES).get();
  const records = snap.docs
    .map((d) => ({ ...(d.data() as ImageRecord), id: d.id }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return Promise.all(
    records.map(async (r) => ({
      ...r,
      displayUrl: r.kind === 'stock' ? (r.url ?? '') : await signedReadUrl(r.storagePath ?? ''),
    })),
  );
}

export async function finalizeRender(input: Omit<RenderRecord, 'bytes' | 'createdAt'>): Promise<RenderRecord> {
  if (!input.storagePath.startsWith('tiktok-maker/renders/')) throw new Error('Bad storage path.');
  const bytes = await uploadedSize(input.storagePath);
  const record: RenderRecord = { ...input, bytes, createdAt: now() };
  await getFirebaseAdmin().db.collection(RENDERS).doc(input.id).set(record);
  return record;
}

/** Every render, each with a signed download link. */
export async function listRenders(): Promise<(RenderRecord & { downloadUrl: string })[]> {
  const snap = await getFirebaseAdmin().db.collection(RENDERS).get();
  const records = snap.docs
    .map((d) => ({ ...(d.data() as RenderRecord), id: d.id }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return Promise.all(
    records.map(async (r) => ({ ...r, downloadUrl: await signedReadUrl(r.storagePath, r.fileName) })),
  );
}

export async function renderDownloadUrl(record: RenderRecord): Promise<string> {
  return signedReadUrl(record.storagePath, record.fileName);
}

// ─── Music, shared style and the render queue ───────────────────────────────

export interface MusicRecord {
  id: string;
  name: string;
  storagePath: string;
  contentType: string;
  bytes: number;
  createdAt: string;
}

export async function finalizeMusic(input: { id: string; storagePath: string; name: string; contentType: string }): Promise<MusicRecord> {
  if (!input.storagePath.startsWith('tiktok-maker/music/')) throw new Error('Bad storage path.');
  const bytes = await uploadedSize(input.storagePath);
  const record: MusicRecord = { ...input, name: input.name.slice(0, 200), bytes, createdAt: now() };
  await getFirebaseAdmin().db.collection(MUSIC).doc(input.id).set(record);
  return record;
}

export async function getMusic(id: string): Promise<MusicRecord | null> {
  const snap = await getFirebaseAdmin().db.collection(MUSIC).doc(id).get();
  return snap.exists ? ({ ...(snap.data() as MusicRecord), id: snap.id }) : null;
}

/** A read stream for a music file (streamed, so size isn't capped by the API body limit). */
export function musicReadStream(record: MusicRecord): NodeJS.ReadableStream {
  return bucket().file(record.storagePath).createReadStream();
}

export async function getSettings(): Promise<Record<string, unknown> | null> {
  const snap = await getFirebaseAdmin().db.collection(SETTINGS).doc('default').get();
  return snap.exists ? (snap.data() as Record<string, unknown>) : null;
}

/** Save the shared style; the version it replaces is kept in `history`. */
export async function saveSettings(settings: Record<string, unknown>): Promise<void> {
  const { db } = getFirebaseAdmin();
  const ref = db.collection(SETTINGS).doc('default');
  await db.runTransaction(async (tx) => {
    const prev = await tx.get(ref);
    if (prev.exists) tx.set(ref.collection('history').doc(), prev.data() as admin.firestore.DocumentData);
    tx.set(ref, { ...settings, updatedAt: now() });
  });
}

export type JobStatus = 'queued' | 'rendering' | 'done' | 'failed' | 'cancelled';

export interface RenderJobRecord {
  id: string;
  scriptId: string;
  status: JobStatus;
  error: string | null;
  renderId: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

/** Queue scripts for rendering; a script already queued or rendering isn't queued twice. */
export async function enqueueJobs(scriptIds: string[]): Promise<RenderJobRecord[]> {
  const { db } = getFirebaseAdmin();
  const active = await db.collection(JOBS).where('status', 'in', ['queued', 'rendering']).get();
  const busy = new Set(active.docs.map((d) => (d.data() as RenderJobRecord).scriptId));
  const at = now();
  const created: RenderJobRecord[] = [];
  const unique = [...new Set(scriptIds)].filter((id) => !busy.has(id));
  for (let i = 0; i < unique.length; i += 400) {
    const batch = db.batch();
    unique.slice(i, i + 400).forEach((scriptId, j) => {
      const ref = db.collection(JOBS).doc();
      // Spread createdAt by index so queue order is stable.
      const createdAt = new Date(Date.parse(at) + i + j).toISOString();
      const job: RenderJobRecord = { id: ref.id, scriptId, status: 'queued', error: null, renderId: null, attempts: 0, createdAt, updatedAt: at };
      batch.set(ref, job);
      created.push(job);
    });
    await batch.commit();
  }
  return created;
}

/** Jobs still to do, plus the last 500 finished ones. */
export async function listJobs(): Promise<RenderJobRecord[]> {
  const snap = await getFirebaseAdmin().db.collection(JOBS).get();
  const all = snap.docs.map((d) => ({ ...(d.data() as RenderJobRecord), id: d.id }));
  const open = all.filter((j) => j.status === 'queued' || j.status === 'rendering');
  const closed = all
    .filter((j) => j.status !== 'queued' && j.status !== 'rendering')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 500);
  return [...open, ...closed].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function updateJob(
  id: string,
  patch: Partial<Pick<RenderJobRecord, 'status' | 'error' | 'renderId'>> & { attempt?: boolean },
): Promise<void> {
  const { attempt, ...rest } = patch;
  await getFirebaseAdmin()
    .db.collection(JOBS)
    .doc(id)
    .update({
      ...rest,
      ...(attempt ? { attempts: admin.firestore.FieldValue.increment(1) } : {}),
      updatedAt: now(),
    });
}

/** Cancel everything still queued (rendering jobs finish or fail on their own). */
export async function cancelQueuedJobs(): Promise<number> {
  const { db } = getFirebaseAdmin();
  const snap = await db.collection(JOBS).where('status', '==', 'queued').get();
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = db.batch();
    snap.docs.slice(i, i + 400).forEach((d) => batch.update(d.ref, { status: 'cancelled', updatedAt: now() }));
    await batch.commit();
  }
  return snap.size;
}

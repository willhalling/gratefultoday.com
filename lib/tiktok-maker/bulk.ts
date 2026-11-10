/**
 * lib/tiktok-maker/bulk.ts — client helpers for the bulk (one script → one
 * video) flow: Claude-written scripts with ElevenLabs v3 audio tags, the
 * on-screen lines derived from them, and the admin-authed API calls.
 */
import { firestoreAuth } from '@/firebase/firebase-config';
import { MAX_LINES } from './signature/scene';

export interface GeneratedScript {
  day: number;
  title: string;
  /** Voiceover text with ElevenLabs v3 audio tags, e.g. "[softly] ...". */
  script: string;
}

/** Remove [audio tags] — what's spoken, without the direction. */
export function stripAudioTags(script: string): string {
  return script.replace(/\[[^\]]*\]/g, '').replace(/[ \t]+/g, ' ');
}

/**
 * On-screen typewriter lines: one per spoken line (tags and blank pause
 * lines dropped), max 6 — anything past the sixth joins the sixth.
 */
export function scriptToLines(script: string): string[] {
  const lines = stripAudioTags(script)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length <= MAX_LINES) return lines;
  return [...lines.slice(0, MAX_LINES - 1), lines.slice(MAX_LINES - 1).join(' ')];
}

/** Parse pasted "DAY 12 — TITLE" blocks (title line optional per block). */
export function parsePastedScripts(text: string, fallbackStartDay: number): GeneratedScript[] {
  const blocks: GeneratedScript[] = [];
  let current: GeneratedScript | null = null;
  const header = /^\s*DAY\s+(\d+)\s*(?:[—–\-:]\s*(.*))?$/i;
  for (const raw of text.split('\n')) {
    const m = raw.match(header);
    if (m) {
      if (current) blocks.push(current);
      current = { day: Number(m[1]), title: (m[2] ?? '').trim(), script: '' };
      continue;
    }
    if (!current) {
      if (!raw.trim()) continue;
      current = { day: fallbackStartDay, title: '', script: '' };
    }
    current.script += `${raw}\n`;
  }
  if (current) blocks.push(current);
  return blocks
    .map((b) => ({ ...b, script: b.script.trim() }))
    .filter((b) => b.script.length > 0);
}

export async function authHeaders(): Promise<Record<string, string>> {
  const user = firestoreAuth?.currentUser;
  if (!user) throw new Error('Sign in as an admin first.');
  return { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' };
}

async function errorFrom(res: Response): Promise<Error> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return new Error(body?.error ?? `Request failed (${res.status}).`);
}

/** Generate a batch; the server saves it to the library before returning. */
export async function generateScripts(input: {
  count: number;
  startDay: number;
  direction: string;
  previous: { day: number; title: string; text: string }[];
}): Promise<LibraryScript[]> {
  const res = await fetch('/api/tiktok-maker/scripts', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await errorFrom(res);
  const body = (await res.json()) as { scripts: (GeneratedScript & Partial<LibraryScript>)[]; saveError?: string };
  // The server couldn't save — retry from here so the batch isn't lost.
  if (body.saveError) return saveToLibrary(body.scripts);
  return body.scripts as LibraryScript[];
}

/** ElevenLabs v3 voiceover for a tagged script; the server keeps every take. */
export async function generateVoiceover(
  script: string,
  stability: number,
  scriptId: string | null,
): Promise<{ mp3: Blob; voiceoverId: string | null; saveError: string | null }> {
  const res = await fetch('/api/tiktok-maker/voiceover', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ text: script, stability, scriptId }),
  });
  if (!res.ok) throw await errorFrom(res);
  return {
    mp3: await res.blob(),
    voiceoverId: res.headers.get('X-Voiceover-Id'),
    saveError: res.headers.get('X-Save-Error'),
  };
}

// ─── Library (Firestore + Storage, nothing is ever deleted) ─────────────────

export interface LibraryScript extends GeneratedScript {
  id: string;
  source: 'generated' | 'pasted';
  archived: boolean;
  /** Chosen background image; null = the pool's round-robin. */
  imageId: string | null;
  /** Optional image per on-screen line (null entries use the video's image); null = off. */
  lineImageIds: (string | null)[] | null;
  createdAt: string;
}

export interface LibraryImage {
  id: string;
  kind: 'upload' | 'stock';
  name: string;
  /** Loadable URL: provider CDN (stock) or a signed Storage link (upload). */
  displayUrl: string;
  thumb: string | null;
  credit: string | null;
  source: 'pexels' | 'unsplash' | null;
  stockId: string | null;
  archived: boolean;
  createdAt: string;
}

export interface LibraryRender {
  id: string;
  scriptId: string;
  voiceoverId: string | null;
  imageId: string | null;
  fileName: string;
  bytes: number;
  durationSec: number;
  createdAt: string;
  /** Signed download link (valid a week; re-signed on every library load). */
  downloadUrl: string;
  /** What it was rendered from (script text, lines, style…). */
  settings?: { script?: string } & Record<string, unknown>;
}

export interface LibraryVoiceover {
  id: string;
  scriptId: string | null;
  text: string;
  stability: number;
  createdAt: string;
}

export async function loadLibrary(): Promise<{
  scripts: LibraryScript[];
  voiceovers: LibraryVoiceover[];
  images: LibraryImage[];
  renders: LibraryRender[];
}> {
  const res = await fetch('/api/tiktok-maker/library', { headers: await authHeaders() });
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}

export async function saveToLibrary(scripts: GeneratedScript[]): Promise<LibraryScript[]> {
  const res = await fetch('/api/tiktok-maker/library', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ scripts }),
  });
  if (!res.ok) throw await errorFrom(res);
  return ((await res.json()) as { scripts: LibraryScript[] }).scripts;
}

/** Edit (or archive) a saved script — the server keeps the previous version. */
export async function updateLibraryScript(
  id: string,
  patch: Partial<Pick<LibraryScript, 'day' | 'title' | 'script' | 'archived' | 'imageId' | 'lineImageIds'>>,
): Promise<void> {
  const res = await fetch('/api/tiktok-maker/library', {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify({ id, ...patch }),
  });
  if (!res.ok) throw await errorFrom(res);
}

export async function fetchSavedVoiceover(id: string): Promise<Blob> {
  const res = await fetch(`/api/tiktok-maker/library/voiceover/${encodeURIComponent(id)}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw await errorFrom(res);
  return res.blob();
}

/** Upload straight to Storage through a one-off resumable session (no API body limit). */
async function uploadToStorage(
  kind: 'image' | 'render' | 'music',
  blob: Blob,
  scriptId?: string,
): Promise<{ id: string; storagePath: string; contentType: string }> {
  const res = await fetch('/api/tiktok-maker/library/upload', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ kind, scriptId, contentType: blob.type }),
  });
  if (!res.ok) throw await errorFrom(res);
  const session = (await res.json()) as { id: string; storagePath: string; uploadUrl: string; contentType: string };
  const put = await fetch(session.uploadUrl, { method: 'PUT', headers: { 'Content-Type': session.contentType }, body: blob });
  if (!put.ok) throw new Error(`Upload to Storage failed (${put.status}).`);
  return { id: session.id, storagePath: session.storagePath, contentType: session.contentType };
}

/** Longest side capped at 2560px, JPEG — small enough for the image proxy, plenty for 1080×1920. */
async function downscaleImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the image.'))), 'image/jpeg', 0.9),
  );
}

async function postImage(body: Record<string, unknown>): Promise<LibraryImage> {
  const res = await fetch('/api/tiktok-maker/library/images', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await errorFrom(res);
  return ((await res.json()) as { image: LibraryImage }).image;
}

export async function saveUploadedImage(file: File): Promise<LibraryImage> {
  const { id, storagePath } = await uploadToStorage('image', await downscaleImage(file));
  return postImage({ action: 'finalize', id, storagePath, name: file.name });
}

export async function saveStockPick(photo: {
  id: string;
  source: 'pexels' | 'unsplash';
  full: string;
  thumb: string;
  pageUrl: string;
  photographerUrl: string;
  name: string;
}): Promise<LibraryImage> {
  return postImage({
    action: 'stock',
    stockId: photo.id,
    source: photo.source,
    url: photo.full,
    thumb: photo.thumb,
    pageUrl: photo.pageUrl,
    photographerUrl: photo.photographerUrl,
    name: photo.name,
  });
}

export async function setImageArchived(id: string, archived: boolean): Promise<void> {
  const res = await fetch('/api/tiktok-maker/library/images', {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify({ id, archived }),
  });
  if (!res.ok) throw await errorFrom(res);
}

/** Upload a finished MP4 and record what it was made from. */
export async function saveRender(
  mp4: Blob,
  meta: {
    scriptId: string;
    voiceoverId: string | null;
    imageId: string | null;
    fileName: string;
    durationSec: number;
    settings: Record<string, unknown>;
  },
): Promise<LibraryRender> {
  const { id, storagePath } = await uploadToStorage('render', mp4, meta.scriptId);
  const res = await fetch('/api/tiktok-maker/library/renders', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ id, storagePath, ...meta }),
  });
  if (!res.ok) throw await errorFrom(res);
  return ((await res.json()) as { render: LibraryRender }).render;
}

// ─── Background music, shared style, render queue ───────────────────────────

export interface LibraryMusic {
  id: string;
  name: string;
  contentType: string;
  bytes: number;
}

/** Keep a background-sound file in the library (uploaded straight to Storage). */
export async function saveMusic(file: File): Promise<LibraryMusic> {
  const { id, storagePath, contentType } = await uploadToStorage('music', file);
  const res = await fetch('/api/tiktok-maker/library/music', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ id, storagePath, name: file.name, contentType }),
  });
  if (!res.ok) throw await errorFrom(res);
  return ((await res.json()) as { music: LibraryMusic }).music;
}

export async function fetchMusic(id: string): Promise<Blob> {
  const res = await fetch(`/api/tiktok-maker/library/music/${encodeURIComponent(id)}`, { headers: await authHeaders() });
  if (!res.ok) throw await errorFrom(res);
  return res.blob();
}

export interface SavedStyle {
  typewriter: Record<string, unknown>;
  background: Record<string, unknown>;
  sound: Record<string, unknown>;
  musicId: string | null;
}

export async function loadSavedStyle(): Promise<{ settings: SavedStyle | null; music: LibraryMusic | null }> {
  const res = await fetch('/api/tiktok-maker/library/settings', { headers: await authHeaders() });
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}

export async function saveStyle(style: SavedStyle): Promise<void> {
  const res = await fetch('/api/tiktok-maker/library/settings', {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(style),
  });
  if (!res.ok) throw await errorFrom(res);
}

export type JobStatus = 'queued' | 'rendering' | 'done' | 'failed' | 'cancelled';

export interface RenderJob {
  id: string;
  scriptId: string;
  status: JobStatus;
  error: string | null;
  renderId: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

export async function listRenderJobs(): Promise<RenderJob[]> {
  const res = await fetch('/api/tiktok-maker/library/jobs', { headers: await authHeaders() });
  if (!res.ok) throw await errorFrom(res);
  return ((await res.json()) as { jobs: RenderJob[] }).jobs;
}

export async function enqueueRenderJobs(scriptIds: string[]): Promise<RenderJob[]> {
  const res = await fetch('/api/tiktok-maker/library/jobs', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ scriptIds }),
  });
  if (!res.ok) throw await errorFrom(res);
  return ((await res.json()) as { jobs: RenderJob[] }).jobs;
}

export async function updateRenderJob(
  id: string,
  patch: { status?: JobStatus; error?: string | null; renderId?: string | null; attempt?: boolean },
): Promise<void> {
  const res = await fetch('/api/tiktok-maker/library/jobs', {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify({ id, ...patch }),
  });
  if (!res.ok) throw await errorFrom(res);
}

export async function cancelQueuedRenderJobs(): Promise<number> {
  const res = await fetch('/api/tiktok-maker/library/jobs', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ action: 'cancel-queued' }),
  });
  if (!res.ok) throw await errorFrom(res);
  return ((await res.json()) as { cancelled: number }).cancelled;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

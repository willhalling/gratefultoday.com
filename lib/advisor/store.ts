import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import type { Chunk } from './library';

/**
 * Firestore layout (server-only; the client rules don't open `advisor`):
 *   advisor/{uid}                 { notes: string[], updatedAt }  what it remembers about you
 *   advisor/{uid}/entries/{id}    one journal entry and the reply
 *   advisor/{uid}/saved/{chunkId} the commonplace book
 */
const ROOT = 'advisor';
export const MAX_NOTES = 80;

export interface Passage {
  chunkId: string;
  quote: string;
  why: string;
  author: string;
  work: string;
  translator: string | null;
  location: string | null;
  source: string;
}

export interface Reply {
  opening: string;
  passages: Passage[];
  closing: string;
}

export interface Entry {
  id: string;
  entry: string;
  voice: string;
  reply: Reply;
  createdAt: string;
}

export interface SavedPassage extends Passage {
  note: string;
  savedAt: string;
}

const db = () => getFirebaseAdmin().db;
const userDoc = (uid: string) => db().collection(ROOT).doc(uid);
const iso = (t: Timestamp | undefined) => (t ? t.toDate().toISOString() : new Date(0).toISOString());

export async function getNotes(uid: string): Promise<string[]> {
  const snap = await userDoc(uid).get();
  return (snap.get('notes') as string[] | undefined) ?? [];
}

export async function setNotes(uid: string, notes: string[]): Promise<string[]> {
  const clean = [...new Set(notes.map((n) => n.trim()).filter(Boolean))].slice(-MAX_NOTES);
  await userDoc(uid).set({ notes: clean, updatedAt: Timestamp.now() }, { merge: true });
  return clean;
}

/** Applies the model's memory changes: drop notes it says are outdated, then add new ones. */
export async function updateNotes(uid: string, remember: string[], forget: string[]): Promise<string[]> {
  if (!remember.length && !forget.length) return getNotes(uid);
  const drop = new Set(forget.map((f) => f.trim().toLowerCase()));
  const current = (await getNotes(uid)).filter((n) => !drop.has(n.trim().toLowerCase()));
  return setNotes(uid, [...current, ...remember]);
}

export async function addEntry(uid: string, entry: Omit<Entry, 'id' | 'createdAt'>): Promise<Entry> {
  const now = Timestamp.now();
  const ref = await userDoc(uid).collection('entries').add({ ...entry, createdAt: now });
  return { ...entry, id: ref.id, createdAt: iso(now) };
}

export async function recentEntries(uid: string, limit = 20): Promise<Entry[]> {
  const snap = await userDoc(uid).collection('entries').orderBy('createdAt', 'desc').limit(limit).get();
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, entry: data.entry, voice: data.voice, reply: data.reply, createdAt: iso(data.createdAt) };
  });
}

export async function deleteEntry(uid: string, id: string): Promise<void> {
  await userDoc(uid).collection('entries').doc(id).delete();
}

/** Firestore ids can't contain "/", and chunk ids do. */
const savedId = (chunkId: string) => chunkId.replace(/\//g, '__');

export async function savePassage(uid: string, passage: Passage, note = ''): Promise<SavedPassage> {
  const now = Timestamp.now();
  await userDoc(uid).collection('saved').doc(savedId(passage.chunkId)).set({ ...passage, note, savedAt: now });
  return { ...passage, note, savedAt: iso(now) };
}

export async function listSaved(uid: string): Promise<SavedPassage[]> {
  const snap = await userDoc(uid).collection('saved').orderBy('savedAt', 'desc').get();
  return snap.docs.map((d) => {
    const data = d.data();
    return { ...(data as Omit<SavedPassage, 'savedAt'>), savedAt: iso(data.savedAt) };
  });
}

export async function unsavePassage(uid: string, chunkId: string): Promise<void> {
  await userDoc(uid).collection('saved').doc(savedId(chunkId)).delete();
}

/** Citation fields for a passage, taken from the library rather than trusted from the model. */
export function passageFromChunk(chunk: Chunk, quote: string, why: string): Passage {
  return {
    chunkId: chunk.id,
    quote,
    why,
    author: chunk.author,
    work: chunk.work,
    translator: chunk.translator,
    location: chunk.location,
    source: chunk.source,
  };
}

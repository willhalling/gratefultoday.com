import 'server-only';
import fs from 'fs';
import path from 'path';

/** One passage from knowledge/chunks.jsonl (see knowledge/README.md). */
export interface Chunk {
  id: string;
  author: string;
  work: string;
  translator: string | null;
  location: string | null;
  speaker: 'author' | 'commentary';
  words: number;
  text: string;
  file: string;
  source: string;
  rightsNote?: string;
}

export interface SearchOptions {
  /** Only passages by these authors (as written in chunks.jsonl). Empty = everyone. */
  authors?: string[];
  /** Include translators' / editors' commentary. Default false. */
  includeCommentary?: boolean;
  /** How many passages to return. */
  limit?: number;
  /** At most this many passages from any one work, so results aren't all one book. */
  perWork?: number;
}

const CHUNKS_PATH = path.join(process.cwd(), 'knowledge', 'chunks.jsonl');

// BM25 parameters (standard values).
const K1 = 1.2;
const B = 0.75;

const STOPWORDS = new Set(
  `a about above after again against all am an and any are as at be because been before being below between both but by
  can could did do does doing down during each few for from further had has have having he her here hers herself him
  himself his how i if in into is it its itself just me more most my myself no nor not now of off on once only or other
  our ours ourselves out over own same she should so some such than that the their theirs them themselves then there
  these they this those through to too under until up very was we were what when where which while who whom why will
  with would you your yours yourself yourselves thee thou thy thine ye hath doth unto upon also may might must shall
  one us let yet even every`.split(/\s+/),
);

/** Lowercase words with light stemming, so "grateful"/"gratitude" and "habits"/"habit" meet. */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').match(/[a-z]+/g) || [])
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    .map(stem);
}

function stem(w: string): string {
  if (w.length <= 4) return w;
  for (const suffix of ['fulness', 'iveness', 'ousness', 'ational', 'itude', 'ation', 'ness', 'ment', 'ings', 'ing', 'edly', 'ful', 'ies', 'ied', 'ed', 'ly', 'es', 's']) {
    if (w.endsWith(suffix) && w.length - suffix.length >= 4) {
      return suffix === 'ies' || suffix === 'ied' ? w.slice(0, -3) + 'y' : w.slice(0, -suffix.length);
    }
  }
  return w;
}

interface Index {
  chunks: Chunk[];
  byId: Map<string, Chunk>;
  /** term -> list of [chunk index, term frequency] */
  postings: Map<string, [number, number][]>;
  lengths: Uint32Array;
  avgLength: number;
}

let index: Index | null = null;

/** Loads chunks.jsonl and builds the keyword index once per server instance. */
function getIndex(): Index {
  if (index) return index;
  const chunks: Chunk[] = fs
    .readFileSync(CHUNKS_PATH, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  const postings = new Map<string, [number, number][]>();
  const lengths = new Uint32Array(chunks.length);
  let total = 0;

  chunks.forEach((c, i) => {
    // Title and location count too, so "habit" finds "The Laws of Habit".
    const tokens = tokenize(`${c.text} ${c.work} ${c.location ?? ''}`);
    lengths[i] = tokens.length;
    total += tokens.length;
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const [t, n] of tf) {
      let list = postings.get(t);
      if (!list) postings.set(t, (list = []));
      list.push([i, n]);
    }
  });

  index = { chunks, byId: new Map(chunks.map((c) => [c.id, c])), postings, lengths, avgLength: total / chunks.length };
  return index;
}

export function getChunk(id: string): Chunk | undefined {
  return getIndex().byId.get(id);
}

/** All authors in the library, for building voices. */
export function libraryAuthors(): string[] {
  return [...new Set(getIndex().chunks.map((c) => c.author))].sort();
}

function bm25(query: string, idx: Index, allowed: (c: Chunk) => boolean): Map<number, number> {
  const scores = new Map<number, number>();
  const N = idx.chunks.length;
  for (const term of new Set(tokenize(query))) {
    const list = idx.postings.get(term);
    if (!list) continue;
    const idf = Math.log(1 + (N - list.length + 0.5) / (list.length + 0.5));
    for (const [i, tf] of list) {
      if (!allowed(idx.chunks[i])) continue;
      const norm = tf + K1 * (1 - B + (B * idx.lengths[i]) / idx.avgLength);
      scores.set(i, (scores.get(i) ?? 0) + idf * ((tf * (K1 + 1)) / norm));
    }
  }
  return scores;
}

/**
 * Searches the library with several queries and merges the results
 * (reciprocal rank fusion), so a passage that several phrasings find ranks highest.
 */
export function searchLibrary(queries: string[], options: SearchOptions = {}): Chunk[] {
  const idx = getIndex();
  const { authors = [], includeCommentary = false, limit = 30, perWork = 4 } = options;
  const authorSet = new Set(authors);
  const allowed = (c: Chunk) =>
    (includeCommentary || c.speaker === 'author') && (authorSet.size === 0 || authorSet.has(c.author)) && c.words >= 25;

  const fused = new Map<number, number>();
  for (const q of queries) {
    const ranked = [...bm25(q, idx, allowed)].sort((a, b) => b[1] - a[1]).slice(0, 60);
    ranked.forEach(([i], rank) => fused.set(i, (fused.get(i) ?? 0) + 1 / (60 + rank)));
  }

  const perWorkCount = new Map<string, number>();
  const out: Chunk[] = [];
  for (const [i] of [...fused].sort((a, b) => b[1] - a[1])) {
    const c = idx.chunks[i];
    const key = `${c.author}|${c.work}`;
    const n = perWorkCount.get(key) ?? 0;
    if (n >= perWork) continue;
    perWorkCount.set(key, n + 1);
    out.push(c);
    if (out.length >= limit) break;
  }
  return out;
}

/** Normalises text for quote checking: quotes, dashes, whitespace and case. */
function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[—–]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * True when every part of the quote appears word for word in the chunk.
 * An ellipsis ("…" or "...") may join parts that appear in order.
 */
export function quoteAppearsIn(quote: string, chunkText: string): boolean {
  const haystack = normalizeForMatch(chunkText);
  const parts = normalizeForMatch(quote)
    .replace(/^["']|["']$/g, '')
    .split(/\s*(?:\.\.\.|…)\s*/)
    .map((p) => p.replace(/^[\s"',.;:-]+|[\s"',;:-]+$/g, ''))
    .filter(Boolean);
  if (!parts.length) return false;
  let from = 0;
  for (const part of parts) {
    const at = haystack.indexOf(part, from);
    if (at === -1) return false;
    from = at + part.length;
  }
  return true;
}

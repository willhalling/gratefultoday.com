import 'server-only';
import fs from 'fs';
import path from 'path';
import { getChunk, searchLibrary, type Chunk, type SearchOptions } from './library';

/**
 * Meaning-based search over knowledge/embeddings.* (made by scripts/embed-knowledge.js),
 * blended with keyword search. Needs OPENAI_API_KEY to embed the entry.
 */

const META_PATH = path.join(process.cwd(), 'knowledge', 'embeddings.json');
const VECTORS_PATH = path.join(process.cwd(), 'knowledge', 'embeddings.i8');

interface Embeddings {
  model: string;
  dimensions: number;
  ids: string[];
  vectors: Int8Array;
}

let cache: Embeddings | null | undefined;

function loadEmbeddings(): Embeddings | null {
  if (cache !== undefined) return cache;
  try {
    const meta = JSON.parse(fs.readFileSync(META_PATH, 'utf8'));
    const buf = fs.readFileSync(VECTORS_PATH);
    const vectors = new Int8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    if (vectors.length !== meta.ids.length * meta.dimensions) throw new Error('embeddings.i8 does not match embeddings.json');
    cache = { model: meta.model, dimensions: meta.dimensions, ids: meta.ids, vectors };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') console.error('Advisor: could not load embeddings', e);
    cache = null;
  }
  return cache;
}

/** True when the embeddings exist and an OpenAI key is set, so semantic search can run. */
export function semanticSearchAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY && !!loadEmbeddings();
}

async function embedQuery(text: string, emb: Embeddings): Promise<Float32Array> {
  const res = await fetch(`${process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'}/embeddings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: emb.model, input: text.slice(0, 8000), dimensions: emb.dimensions }),
  });
  if (!res.ok) throw new Error(`OpenAI embeddings failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const v: number[] = (await res.json()).data[0].embedding;
  return Float32Array.from(v);
}

/**
 * Finds passages close in meaning to `query`, merged with keyword matches
 * (reciprocal rank fusion), filtered like searchLibrary and spread across works.
 */
export async function semanticSearch(query: string, options: SearchOptions = {}): Promise<Chunk[]> {
  const emb = loadEmbeddings();
  if (!emb) throw new Error('Embeddings are missing: run scripts/embed-knowledge.js.');
  const { authors = [], includeCommentary = false, limit = 16, perWork = 3 } = options;
  const authorSet = new Set(authors);

  const q = await embedQuery(query, emb);
  const dims = emb.dimensions;
  const scored: [number, number][] = [];
  for (let i = 0; i < emb.ids.length; i++) {
    let dot = 0;
    const off = i * dims;
    for (let d = 0; d < dims; d++) dot += q[d] * emb.vectors[off + d];
    scored.push([i, dot]);
  }
  scored.sort((a, b) => b[1] - a[1]);

  const allowed = (c: Chunk | undefined): c is Chunk =>
    !!c && (includeCommentary || c.speaker === 'author') && (authorSet.size === 0 || authorSet.has(c.author)) && c.words >= 25;

  const semantic: Chunk[] = [];
  for (const [i] of scored) {
    const c = getChunk(emb.ids[i]);
    if (allowed(c)) semantic.push(c);
    if (semantic.length >= 80) break;
  }
  const keyword = searchLibrary([query], { authors, includeCommentary, limit: 40, perWork: 40 });

  // Meaning counts for more than shared words.
  const fused = new Map<string, { chunk: Chunk; score: number }>();
  const add = (list: Chunk[], weight: number) =>
    list.forEach((c, rank) => {
      const e = fused.get(c.id) ?? { chunk: c, score: 0 };
      e.score += weight / (60 + rank);
      fused.set(c.id, e);
    });
  add(semantic, 1);
  add(keyword, 0.5);

  const perWorkCount = new Map<string, number>();
  const out: Chunk[] = [];
  for (const { chunk } of [...fused.values()].sort((a, b) => b.score - a.score)) {
    const key = `${chunk.author}|${chunk.work}`;
    const n = perWorkCount.get(key) ?? 0;
    if (n >= perWork) continue;
    perWorkCount.set(key, n + 1);
    out.push(chunk);
    if (out.length >= limit) break;
  }
  return out;
}

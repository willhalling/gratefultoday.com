/**
 * Embeds every passage in knowledge/chunks.jsonl for meaning-based search.
 *
 * Writes:
 *   knowledge/embeddings.json  { model, dimensions, count, ids: [...] }  (same order as the vectors)
 *   knowledge/embeddings.i8    count × dimensions signed bytes: each unit vector × 127
 *
 * Int8 keeps the file small (~6 MB) and loads instantly; ranking by dot product
 * on these is effectively the same as cosine similarity on the full floats.
 *
 * Run with:  OPENAI_API_KEY=... node scripts/embed-knowledge.js
 * Behind a proxy: add NODE_USE_ENV_PROXY=1.
 * Rerun after `npm run knowledge:chunk` changes the chunks.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'knowledge');
const MODEL = 'text-embedding-3-small';
const DIMENSIONS = 512;
const BATCH = 200;

/** The text embedded for each passage: its citation, then the passage. */
const embedText = (c) => `${c.author}, ${c.work}${c.location ? `, ${c.location}` : ''}\n\n${c.text}`;

async function embed(inputs, attempt = 1) {
  const res = await fetch(`${process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'}/embeddings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, input: inputs, dimensions: DIMENSIONS }),
  });
  if (!res.ok) {
    const body = await res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
      return embed(inputs, attempt + 1);
    }
    throw new Error(`OpenAI embeddings failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error('Set OPENAI_API_KEY first.');
  const chunks = fs
    .readFileSync(path.join(ROOT, 'chunks.jsonl'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));

  const out = new Int8Array(chunks.length * DIMENSIONS);
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const vectors = await embed(batch.map(embedText));
    vectors.forEach((v, j) => {
      const norm = Math.hypot(...v) || 1;
      for (let d = 0; d < DIMENSIONS; d++) out[(i + j) * DIMENSIONS + d] = Math.round((v[d] / norm) * 127);
    });
    process.stdout.write(`\rEmbedded ${Math.min(i + BATCH, chunks.length)} / ${chunks.length}`);
  }

  fs.writeFileSync(path.join(ROOT, 'embeddings.i8'), Buffer.from(out.buffer));
  fs.writeFileSync(
    path.join(ROOT, 'embeddings.json'),
    JSON.stringify({ model: MODEL, dimensions: DIMENSIONS, count: chunks.length, ids: chunks.map((c) => c.id) }) + '\n',
  );
  console.log(`\nWrote knowledge/embeddings.i8 (${(out.length / 1048576).toFixed(1)} MB) and knowledge/embeddings.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

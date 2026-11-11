/**
 * Downloads public-domain English translations of Arthur Schopenhauer's
 * essays and books from Project Gutenberg into knowledge/schopenhauer/.
 *
 * Each work is saved as clean plain text (Gutenberg header/footer and
 * license boilerplate stripped) plus a manifest.json with metadata, so the
 * folder can be used as a knowledge base for future content.
 *
 * Run with: node scripts/fetch-schopenhauer.js
 * Behind an HTTP(S) proxy: NODE_USE_ENV_PROXY=1 node scripts/fetch-schopenhauer.js
 * Re-running overwrites existing files.
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'knowledge', 'schopenhauer');

// Project Gutenberg ebook IDs (English translations only).
const WORKS = [
  // Essays from "Parerga and Paralipomena" (T. Bailey Saunders translations)
  { id: 10741, slug: 'the-wisdom-of-life', type: 'essays' },
  { id: 10715, slug: 'counsels-and-maxims', type: 'essays' },
  { id: 10732, slug: 'studies-in-pessimism', type: 'essays' },
  { id: 10739, slug: 'on-human-nature', type: 'essays' },
  { id: 10714, slug: 'the-art-of-literature', type: 'essays' },
  { id: 10731, slug: 'the-art-of-controversy', type: 'essays' },
  { id: 10833, slug: 'religion-a-dialogue-etc', type: 'essays' },
  // Selection translated by Mrs. Rudolf Dircks (overlaps the above)
  { id: 11945, slug: 'essays-of-schopenhauer-dircks', type: 'essays' },
  // Books
  { id: 38427, slug: 'the-world-as-will-and-idea-vol-1', type: 'book' },
  { id: 40097, slug: 'the-world-as-will-and-idea-vol-2', type: 'book' },
  { id: 40868, slug: 'the-world-as-will-and-idea-vol-3', type: 'book' },
  { id: 44929, slug: 'the-basis-of-morality', type: 'book' },
  { id: 50966, slug: 'fourfold-root-and-will-in-nature', type: 'book' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(id) {
  const urls = [
    `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
    `https://www.gutenberg.org/ebooks/${id}.txt.utf-8`,
  ];
  for (const url of urls) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'knowledge-base-fetcher' },
        });
        if (res.ok) return { text: await res.text(), url };
        if (res.status === 404) break;
      } catch (err) {
        if (attempt === 3) console.warn(`  ${url}: ${err.message}`);
      }
      await sleep(2000 * attempt);
    }
  }
  throw new Error(`Could not download ebook ${id}`);
}

function headerField(header, name) {
  const m = header.match(new RegExp(`^${name}:[ \\t]*(.+(?:\\n[ \\t]{2,}.+)*)`, 'mi'));
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

function clean(raw) {
  const text = raw.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const start = text.search(/^\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG.*$/m);
  const end = text.search(/^\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG.*$/m);
  if (start === -1 || end === -1) throw new Error('Gutenberg markers not found');

  const header = text.slice(0, start);
  let body = text.slice(text.indexOf('\n', start) + 1, end);
  body = body
    .replace(/^\s*Produced by[\s\S]*?\n\n/, '') // producer credits at top
    .replace(/^End of (the )?Project Gutenberg.*$/gim, '') // trailing credit line
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();

  return {
    body: body + '\n',
    meta: {
      title: headerField(header, 'Title'),
      author: headerField(header, 'Author'),
      translator: headerField(header, 'Translator'),
      editor: headerField(header, 'Editor'),
      releaseDate: headerField(header, 'Release date')?.replace(/\s*\[.*$/, '') ?? null,
      language: headerField(header, 'Language'),
    },
  };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = [];

  for (const work of WORKS) {
    process.stdout.write(`Fetching #${work.id} ${work.slug} ... `);
    const { text, url } = await download(work.id);
    const { body, meta } = clean(text);
    const file = `${work.slug}.txt`;
    fs.writeFileSync(path.join(OUT_DIR, file), body);

    const words = body.split(/\s+/).filter(Boolean).length;
    manifest.push({
      file,
      gutenbergId: work.id,
      type: work.type,
      ...meta,
      words,
      source: `https://www.gutenberg.org/ebooks/${work.id}`,
      downloadedFrom: url,
    });
    console.log(`${words.toLocaleString()} words`);
    await sleep(1000); // be polite to gutenberg.org
  }

  fs.writeFileSync(
    path.join(OUT_DIR, 'manifest.json'),
    JSON.stringify(
      {
        author: 'Arthur Schopenhauer (1788–1860)',
        license:
          'Public domain in the USA. Texts sourced from Project Gutenberg; ' +
          'Gutenberg headers, footers and trademark removed.',
        generatedAt: new Date().toISOString(),
        works: manifest,
      },
      null,
      2
    ) + '\n'
  );
  console.log(`\nSaved ${manifest.length} works to ${path.relative(process.cwd(), OUT_DIR)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

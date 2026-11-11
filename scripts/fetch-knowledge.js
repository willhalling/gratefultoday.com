/**
 * Builds the knowledge base in knowledge/ from public-domain texts on
 * Project Gutenberg (philosophy, wellbeing, gratitude and recovery classics).
 *
 * Each work is saved as clean plain text (Gutenberg header/footer and
 * license boilerplate stripped) under knowledge/<author>/, and
 * knowledge/manifest.json lists every work with its metadata.
 *
 * Run with: node scripts/fetch-knowledge.js
 * Behind an HTTP(S) proxy: NODE_USE_ENV_PROXY=1 node scripts/fetch-knowledge.js
 * Only some authors: node scripts/fetch-knowledge.js seneca epictetus
 * Re-running overwrites existing files.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'knowledge');

// Project Gutenberg ebook IDs, grouped by author folder. English only, and
// only translations old enough to be public domain.
const SOURCES = {
  schopenhauer: {
    author: 'Arthur Schopenhauer (1788–1860)',
    works: [
      // Essays from "Parerga and Paralipomena" (T. Bailey Saunders)
      { id: 10741, slug: 'the-wisdom-of-life', type: 'essays' },
      { id: 10715, slug: 'counsels-and-maxims', type: 'essays' },
      { id: 10732, slug: 'studies-in-pessimism', type: 'essays' },
      { id: 10739, slug: 'on-human-nature', type: 'essays' },
      { id: 10714, slug: 'the-art-of-literature', type: 'essays' },
      { id: 10731, slug: 'the-art-of-controversy', type: 'essays' },
      { id: 10833, slug: 'religion-a-dialogue-etc', type: 'essays' },
      // Selection by Mrs. Rudolf Dircks (overlaps the Saunders essays)
      { id: 11945, slug: 'essays-of-schopenhauer-dircks', type: 'essays' },
      { id: 38427, slug: 'the-world-as-will-and-idea-vol-1', type: 'book' },
      { id: 40097, slug: 'the-world-as-will-and-idea-vol-2', type: 'book' },
      { id: 40868, slug: 'the-world-as-will-and-idea-vol-3', type: 'book' },
      { id: 44929, slug: 'the-basis-of-morality', type: 'book' },
      { id: 50966, slug: 'fourfold-root-and-will-in-nature', type: 'book' },
    ],
  },
  'marcus-aurelius': {
    author: 'Marcus Aurelius (121–180)',
    works: [
      // George Long translation. Book 1 is a gratitude list.
      { id: 15877, slug: 'meditations-long', type: 'book' },
    ],
  },
  epictetus: {
    author: 'Epictetus (c. 50–135)',
    works: [
      { id: 10661, slug: 'discourses-and-enchiridion-long', type: 'book' },
      { id: 45109, slug: 'enchiridion-higginson', type: 'book' },
    ],
  },
  seneca: {
    author: 'Lucius Annaeus Seneca (c. 4 BC–AD 65)',
    works: [
      // Includes On the Shortness of Life, On the Happy Life,
      // On Tranquillity of Mind, On Providence, consolations.
      { id: 64576, slug: 'minor-dialogues', type: 'essays' },
      // Seneca's treatise on giving, receiving and gratitude.
      { id: 3794, slug: 'on-benefits', type: 'book' },
    ],
  },
  'william-james': {
    author: 'William James (1842–1910)',
    works: [
      { id: 621, slug: 'the-varieties-of-religious-experience', type: 'book' },
      // Includes "The Laws of Habits", "The Gospel of Relaxation",
      // "On a Certain Blindness in Human Beings".
      { id: 16287, slug: 'talks-to-teachers', type: 'essays' },
      // Includes "The Energies of Men".
      { id: 20768, slug: 'memories-and-studies', type: 'essays' },
    ],
  },
  'james-allen': {
    author: 'James Allen (1864–1912)',
    works: [{ id: 4507, slug: 'as-a-man-thinketh', type: 'book' }],
  },
  emerson: {
    author: 'Ralph Waldo Emerson (1803–1882)',
    works: [
      // Self-Reliance, Compensation, Friendship, ...
      { id: 2944, slug: 'essays-first-series', type: 'essays' },
      // Experience, Character, Gifts, Nature, ...
      { id: 2945, slug: 'essays-second-series', type: 'essays' },
    ],
  },
  thoreau: {
    author: 'Henry David Thoreau (1817–1862)',
    works: [{ id: 205, slug: 'walden-and-civil-disobedience', type: 'book' }],
  },
  boethius: {
    author: 'Boethius (c. 477–524)',
    works: [{ id: 14328, slug: 'the-consolation-of-philosophy', type: 'book' }],
  },
  dhammapada: {
    author: 'Traditional (Buddhist canon)',
    works: [{ id: 2017, slug: 'dhammapada-max-muller', type: 'book' }],
  },
  laozi: {
    author: 'Laozi',
    works: [{ id: 216, slug: 'tao-te-ching-legge', type: 'book' }],
  },
  montaigne: {
    author: 'Michel de Montaigne (1533–1592)',
    works: [{ id: 3600, slug: 'essays-complete-cotton', type: 'essays' }],
  },
  'arnold-bennett': {
    author: 'Arnold Bennett (1867–1931)',
    works: [{ id: 2274, slug: 'how-to-live-on-24-hours-a-day', type: 'book' }],
  },
  'ralph-waldo-trine': {
    author: 'Ralph Waldo Trine (1866–1958)',
    works: [{ id: 23559, slug: 'in-tune-with-the-infinite', type: 'book' }],
  },
  'bertrand-russell': {
    author: 'Bertrand Russell (1872–1970)',
    works: [
      {
        id: 77894,
        slug: 'the-conquest-of-happiness',
        type: 'book',
        rightsNote:
          'Published 1930: public domain in the USA since 2026, but still in ' +
          'copyright in the UK/EU (author died 1970). Avoid quoting at length ' +
          'in content served outside the USA.',
      },
    ],
  },
};

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
      translator: headerField(header, 'Translator'),
      editor: headerField(header, 'Editor'),
      releaseDate: headerField(header, 'Release date')?.replace(/\s*\[.*$/, '') ?? null,
      language: headerField(header, 'Language'),
    },
  };
}

async function main() {
  const only = process.argv.slice(2);
  const manifestPath = path.join(ROOT, 'manifest.json');
  const previous = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')).works
    : [];
  const works = [];

  for (const [folder, { author, works: list }] of Object.entries(SOURCES)) {
    if (only.length && !only.includes(folder)) {
      works.push(...previous.filter((w) => w.folder === folder));
      continue;
    }
    fs.mkdirSync(path.join(ROOT, folder), { recursive: true });

    for (const work of list) {
      process.stdout.write(`Fetching ${folder}/${work.slug} (#${work.id}) ... `);
      const { text, url } = await download(work.id);
      const { body, meta } = clean(text);
      const file = `${folder}/${work.slug}.txt`;
      fs.writeFileSync(path.join(ROOT, file), body);

      const words = body.split(/\s+/).filter(Boolean).length;
      works.push({
        file,
        folder,
        author,
        gutenbergId: work.id,
        type: work.type,
        ...meta,
        words,
        source: `https://www.gutenberg.org/ebooks/${work.id}`,
        downloadedFrom: url,
        ...(work.rightsNote && { rightsNote: work.rightsNote }),
      });
      console.log(`${words.toLocaleString()} words`);
      await sleep(1000); // be polite to gutenberg.org
    }
  }

  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        license:
          'Public domain in the USA. Texts sourced from Project Gutenberg; ' +
          'Gutenberg headers, footers and trademark removed. See rightsNote ' +
          'on individual works for exceptions outside the USA.',
        generatedAt: new Date().toISOString(),
        totalWords: works.reduce((n, w) => n + w.words, 0),
        works,
      },
      null,
      2
    ) + '\n'
  );
  console.log(`\nSaved ${works.length} works to ${path.relative(process.cwd(), ROOT)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

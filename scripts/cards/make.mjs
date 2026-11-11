#!/usr/bin/env node
/**
 * make — render video cards from their scripts in scripts/cards/cards/.
 *
 *   node scripts/cards/make.mjs                 list the cards
 *   node scripts/cards/make.mjs magic-mum       render one
 *   node scripts/cards/make.mjs all             render every card
 *
 * Output: public/dev-media/cards/<id>/<id>.mp4 and sheet.jpg (a frame per line
 * of text). New images cost about $0.06 each from fal and are cached; changing
 * words, timings or sound is free.
 *
 * A new idea = copy a file in cards/, change the shots, words and sound, run it.
 */
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderCard } from './engine.mjs';
import { COST_PER_IMAGE, stats } from './images.mjs';

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'cards');
const ids = readdirSync(DIR).filter((f) => f.endsWith('.mjs')).map((f) => f.replace(/\.mjs$/, ''));
const wanted = process.argv.slice(2);

if (!wanted.length) {
  console.log(`Cards: ${ids.join(', ')}\nRender with: node scripts/cards/make.mjs <id> | all`);
  process.exit(0);
}

const fmt = (s) => s.toFixed(1).padStart(5);
for (const id of wanted[0] === 'all' ? ids : wanted) {
  if (!ids.includes(id)) throw new Error(`No card "${id}". Have: ${ids.join(', ')}`);
  const card = (await import(pathToFileURL(join(DIR, `${id}.mjs`)).href)).default;
  const started = Date.now();
  const r = await renderCard(card);
  console.log(`\n${card.id} — ${card.title} — ${r.total.toFixed(1)} s (rendered in ${Math.round((Date.now() - started) / 1000)} s)`);
  for (const s of r.shots) {
    console.log(`  ${fmt(s.start)}–${fmt(s.start + s.len)}  ${s.name}`);
    for (const x of r.texts.filter((x) => x.shot === s.name)) {
      console.log(`      ${fmt(x.in)}–${x.out == null ? '  end' : fmt(x.out)}  ${x.type.padEnd(9)} ${x.lines.join(' / ')}`);
    }
  }
  console.log(`  ${r.mp4}\n  ${r.sheet}`);
}
if (stats.generated) console.log(`\n${stats.generated} new image${stats.generated === 1 ? '' : 's'} generated, about $${(stats.generated * COST_PER_IMAGE).toFixed(2)}.`);

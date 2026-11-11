#!/usr/bin/env node
/**
 * song-test — the riskiest part of the Christmas song card, tested on its own:
 * can a model sing a 60-second personalised song clearly, names included?
 *
 *   node scripts/experiments/song-test.mjs
 *
 * Makes the same lyrics on two fal models:
 *   - ElevenLabs Music ($0.60 a minute): a section plan with exact durations, so exactly 60 s
 *   - MiniMax Music 2.6 ($0.15 a song): style prompt + tagged lyrics, length follows the lyrics
 * then transcribes each back with Whisper (word timings) and scores how many of
 * the lyric's words came back in order. The word timings are also what a lyric
 * video needs.
 *
 * Output: public/dev-media/song-test/<model>.mp3 and report.json (gitignored).
 * FAL_KEY from the environment or the WaveCanvas worktree's .env.local.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'dev-media', 'song-test');
const ENV = '/Users/will/Documents/wavecanvas-christmas/.env.local';
const FAL_KEY =
  process.env.FAL_KEY ??
  readFileSync(ENV, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('FAL_KEY='))
    ?.slice('FAL_KEY='.length)
    .replace(/^["']|["']$/g, '')
    .trim();

/** A card to Mum from two daughters with names a model could easily get wrong. */
const SONG = {
  style: ['warm acoustic Christmas folk ballad', 'fingerpicked acoustic guitar', 'soft piano', 'gentle sleigh bells', 'warm intimate female vocal', 'clear diction', 'slow, about 78 bpm'],
  avoid: ['electronic', 'heavy drums', 'autotune', 'rap', 'big choir'],
  sections: [
    { name: 'Intro', seconds: 4, lines: [] },
    {
      name: 'Verse',
      seconds: 23,
      lines: ['You burn the sprouts every year, Mum', 'And swear the oven’s to blame', 'You fall asleep before the film is done', 'And we love you just the same'],
    },
    {
      name: 'Chorus',
      seconds: 24,
      lines: ['Merry Christmas, Mum, from all of us', 'The magic was always you', 'Merry Christmas, Mum, from Siobhan and Niamh', 'We’d be lost without you'],
    },
    { name: 'Outro', seconds: 9, lines: ['Merry Christmas, Mum'] },
  ],
};
const LYRIC_WORDS = SONG.sections.flatMap((s) => s.lines).join(' ');

async function fal(endpoint, body) {
  const res = await fetch(`https://fal.run/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Key ${FAL_KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${endpoint} ${res.status}: ${(await res.text()).slice(0, 500)}`);
  return res.json();
}

const MODELS = {
  elevenlabs: () =>
    fal('fal-ai/elevenlabs/music', {
      composition_plan: {
        positive_global_styles: SONG.style,
        negative_global_styles: SONG.avoid,
        sections: SONG.sections.map((s) => ({
          section_name: s.name,
          positive_local_styles: s.lines.length ? [] : ['instrumental'],
          negative_local_styles: [],
          duration_ms: s.seconds * 1000,
          lines: s.lines,
        })),
      },
      respect_sections_durations: true,
    }),
  minimax: () =>
    fal('fal-ai/minimax-music/v2.6', {
      prompt: `${SONG.style.join(', ')}. About one minute long.`,
      lyrics: SONG.sections.map((s) => `[${s.name}]${s.lines.length ? `\n${s.lines.join('\n')}` : ''}`).join('\n'),
    }),
  // The same, with the two names spelt the way they sound.
  'minimax-phonetic': () =>
    fal('fal-ai/minimax-music/v2.6', {
      prompt: `${SONG.style.join(', ')}. About one minute long.`,
      lyrics: SONG.sections
        .map((s) => `[${s.name}]${s.lines.length ? `\n${s.lines.join('\n')}` : ''}`)
        .join('\n')
        .replace('Siobhan and Niamh', 'Shi-vawn and Neev'),
    }),
};

const norm = (s) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

/** Words of `want` found in `got`, in order (longest common subsequence). */
function inOrder(want, got) {
  const dp = Array.from({ length: want.length + 1 }, () => new Array(got.length + 1).fill(0));
  for (let i = 1; i <= want.length; i++) for (let j = 1; j <= got.length; j++) dp[i][j] = want[i - 1] === got[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const hit = new Set();
  for (let i = want.length, j = got.length; i > 0 && j > 0; ) {
    if (want[i - 1] === got[j - 1]) (hit.add(i - 1), i--, j--);
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return hit;
}

mkdirSync(OUT, { recursive: true });
const report = { lyrics: SONG.sections, models: {} };
for (const [name, make] of Object.entries(MODELS)) {
  const file = join(OUT, `${name}.mp3`);
  const meta = join(OUT, `${name}.json`);
  let url;
  if (existsSync(meta)) url = JSON.parse(readFileSync(meta, 'utf8')).url;
  else {
    const started = Date.now();
    url = (await make()).audio.url;
    writeFileSync(file, Buffer.from(await (await fetch(url)).arrayBuffer()));
    writeFileSync(meta, JSON.stringify({ url, seconds: Math.round((Date.now() - started) / 1000) }));
  }
  const took = JSON.parse(readFileSync(meta, 'utf8')).seconds;
  const heard = await fal('fal-ai/whisper', { audio_url: url, task: 'transcribe', language: 'en', chunk_level: 'word' });
  const want = norm(LYRIC_WORDS);
  const hit = inOrder(want, norm(heard.text));
  const missed = want.filter((_, i) => !hit.has(i));
  report.models[name] = {
    file,
    generatedIn: `${took} s`,
    heard: heard.text.trim(),
    wordsHeard: `${hit.size} of ${want.length}`,
    missed,
    words: (heard.chunks ?? []).map((c) => ({ word: c.text.trim(), start: c.timestamp?.[0], end: c.timestamp?.[1] })),
  };
  console.log(`\n${name}: generated in ${took} s → ${file}\n  heard: ${heard.text.trim()}\n  ${hit.size} of ${want.length} lyric words heard in order; missed: ${missed.join(', ') || 'none'}`);
}
writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));

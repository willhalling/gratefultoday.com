/**
 * Christmas letters to people who are no longer here: words and music only
 * (no voice). Each letter is set at reading pace over a choir track that
 * fades out once the letter ends, then rendered on WaveCanvas with a
 * different photo, type and look. For the WaveCanvas dev page dev/christmas.
 *
 *   WAVECANVAS_API_URL=http://localhost:3002/api/v1 \
 *   npx -y tsx@4.20.6 --env-file=.env --conditions=react-server --tsconfig ./tsconfig.json \
 *     scripts/experiments/letters.ts [ids...] [--out <dir>]
 *
 * Photos go in through the render API's `background` field, which only exists
 * on the WaveCanvas worktree branch so far, so point WAVECANVAS_API_URL at
 * that branch's dev server. Without --out, files stay in Firebase Storage
 * under experiments/letters/.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { saveFile, signedUrl } from '@/lib/orders/store';
import { createRender, getRender, type Render } from '@/lib/wavecanvas';

const CHOIR = process.env.LETTERS_MUSIC || '/Users/will/Documents/wavecanvas/poshpony-church-choir-297898.mp3';
const DIR = 'experiments/letters';
const GRADIENT_VIDEO = 'back-to-the-strobe-mv8d39xkunmx';
/** A saved portrait video with a photo of an elderly man (stand-in). */
const PHOTO_VIDEO = 'ytdowncom-youtube-media-xth5vuepx5w-freya-ridings-black-friday-by-tom-odell-011-128kmp3-mw8a4qqyinwi';

const pexels = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1080&h=1920`;
// From WaveCanvas's frozen Christmas aesthetic pools (public/aesthetics/pools.json).
const IMAGES = {
  dinnerTable: pexels(19626656),
  mug: pexels(34988200),
  smallFire: pexels(35586404),
  stove: pexels(5490204),
  treeDark: pexels(14733017),
  bokeh: pexels(13612166),
  quietRoom: pexels(14977711),
  // Your own images (WaveCanvas checkout root).
  emptyChair: '/Users/will/Documents/wavecanvas/xmas-lonely.png',
  /** A foggy terraced street at night: one window lit by a Christmas tree, a streetlamp. */
  foggyStreet: '/Users/will/Documents/wavecanvas/test.png',
};

/**
 * Your christmas_memory_all_9 set (WaveCanvas checkout root), trimmed of the
 * grid's white edges and upscaled to 1080×1920 into e2e-output/christmas_memory/.
 */
const MEMORY = (n: number) => `e2e-output/christmas_memory/memory_0${n}.jpg`;

/** A background for the render API: a URL as is, or a local file uploaded and signed. */
async function imageUrl(image: string): Promise<string> {
  if (/^https:\/\//.test(image)) return image;
  const name = image.split('/').pop()!;
  const path = `${DIR}/images/${name}`;
  const type = name.endsWith('.png') ? 'image/png' : name.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  await saveFile(path, readFileSync(image), type);
  return signedUrl(path, 2);
}

/* ---------- Letters ---------- */

const LETTERS = {
  mum: [
    'Dear Mum,',
    'I still buy the Quality Street.',
    'Nobody eats the coconut ones.',
    'I keep them for you anyway.',
    'I set the table for six this year,',
    'then put your plate back.',
    'I never told you',
    'the best part of Christmas',
    'was watching you watch us.',
    'I’m learning to do it now.',
    'Merry Christmas, Mum.',
    'Love always, Jo.',
  ],
  dad: [
    'Dear Dad,',
    'The lights went up today.',
    'Half of them don’t work,',
    'which you’d have fixed in a minute',
    'and moaned about for an hour.',
    'I’ve left them as they are.',
    'This year I’m carving.',
    'I’ll do it wrong,',
    'the way you always said I would.',
    'I’d give anything to hear you say it.',
    'Happy Christmas, Dad.',
    'Your son, always.',
  ],
  grandad: [
    'Dear Grandad,',
    'Your chair is still by the window.',
    'Nobody sits in it,',
    'not even the dog.',
    'You’d pretend to sleep through the King’s speech,',
    'then tell us all what he said.',
    'I was nine before I worked it out.',
    'I’m forty now,',
    'and I still save you a cracker.',
    'Merry Christmas, Grandad.',
    'Love, Amy.',
  ],
  nan: [
    'Dear Nan,',
    'The biscuit tin with the sewing kit inside.',
    'Your handwriting on every gift tag.',
    'A sherry at eleven, “because it’s Christmas”.',
    'Carols on the radio, far too loud.',
    'Your hand on my cheek at the door.',
    'All of it, every year.',
    'I didn’t know I was keeping it.',
    'I’m so glad I did.',
    'Merry Christmas, Nan.',
    'Love, your Ellie.',
  ],
  friend: [
    'Dear Sam,',
    'Twelve Christmases of terrible jumpers.',
    'This year I wore yours.',
    'It’s still awful.',
    'Everyone asked where I got it,',
    'so I told them about you',
    'for the whole of dinner.',
    'You’d have loved that.',
    'Save me a seat, mate.',
    'Merry Christmas.',
    'Tom.',
  ],
} satisfies Record<string, string[]>;

/* ---------- Audio: reading pace, choir fading out at the end ---------- */

const work = mkdtempSync(join(tmpdir(), 'letters-'));
const ff = (args: string[]) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args]);
const tokens = (s: string) => s.trim().split(/\s+/).filter(Boolean);

const INTRO = 3.5;
const TAIL = 5;

interface Timed {
  words: { word: string; start: number; end: number }[];
  /** When the last line has had its time. */
  end: number;
}

/**
 * Word timings at reading pace: each line gets time to be read and felt
 * (longer for longer lines), with a breath after the greeting and before
 * the sign-off. Words are spread over the first part of the line's slot so
 * word-by-word styles reveal at reading speed, and the last word ends near
 * the end of the slot so whole-line styles hold the line until the next.
 */
function readingPace(lines: string[]): Timed {
  const words: Timed['words'] = [];
  let t = INTRO;
  lines.forEach((line, i) => {
    const ws = tokens(line);
    const slot = Math.max(2.6, ws.length * 0.42 + 1.4);
    const reveal = Math.min(slot * 0.6, ws.length * 0.32);
    ws.forEach((word, j) => {
      const start = t + (reveal * j) / ws.length;
      const end = j === ws.length - 1 ? t + slot - 0.25 : t + (reveal * (j + 1)) / ws.length;
      words.push({ word, start: round(start), end: round(end) });
    });
    t += slot;
    if (i === 0 || i === lines.length - 3) t += 1.2;
  });
  return { words, end: t };
}

const round = (n: number) => Math.round(n * 100) / 100;

const audioCache = new Map<string, Promise<{ path: string; duration: number; words: Timed['words'] }>>();
function choirFor(letter: keyof typeof LETTERS) {
  if (!audioCache.has(letter)) {
    audioCache.set(
      letter,
      (async () => {
        const { words, end } = readingPace(LETTERS[letter]);
        const total = Math.ceil(end + TAIL);
        const file = join(work, `${letter}.mp3`);
        ff([
          '-i', CHOIR, '-t', String(total),
          '-af', `afade=t=in:st=0:d=2,afade=t=out:st=${round(end + 0.5)}:d=${TAIL - 0.5}`,
          '-b:a', '192k', file,
        ]);
        const path = `${DIR}/${letter}.mp3`;
        await saveFile(path, readFileSync(file), 'audio/mpeg');
        return { path, duration: total, words };
      })(),
    );
  }
  return audioCache.get(letter)!;
}

/* ---------- Looks ---------- */

const CREAM = '#FFF6E5';
const GOLD = '#F5C542';

/** Shared by every letter: nothing on the beat, no visualizer or socials, calm text. */
const BASE = {
  beatReaction: { amount: 0 },
  visualizer: { visualizer: 'none' },
  atmosphere: { atmosphere: 'none' },
  layout: { layout: 'minimal' },
  socialLinks: { clear: true },
  lyricsVisibility: { show: true },
  adjustLyrics: { uppercase: false, backdropOpacity: 0 },
  textOutline: { amount: 0 },
  textShadow: { on: true },
  backgroundTint: { off: true },
};

/** The greeting and the sign-off in handwriting. */
const handwrittenEnds = (n: number, font = 'romantic') => ({ lyricEmphasis: { font, lines: [0, n - 2, n - 1] } });

interface Variant {
  id: string;
  title: string;
  notes: string;
  letter: keyof typeof LETTERS;
  image?: string;
  video?: string;
  style?: string;
  changes: (n: number) => Record<string, unknown>;
  /**
   * Their portrait for the last lines: a second render over just the sign-off,
   * on a saved video with their photo (or a photo via `image`) in a signature
   * style, cross-faded in over the letter.
   */
  reveal?: { video?: string; image?: string; style: string; changes: (n: number) => Record<string, unknown> };
}

const VARIANTS: Variant[] = [
  {
    id: 'mum-table',
    title: 'Dear Mum: the table',
    notes: 'A Christmas table set for dinner. Calm serif, the greeting and sign-off in handwriting. Warm film grade, a slow push in.',
    letter: 'mum',
    image: IMAGES.dinnerTable,
    changes: (n) => ({
      ...BASE,
      camera: { motion: 'push-in', amount: 0.25 },
      colourGrade: { grade: 'warm-film', strength: 0.6 },
      backgroundBrightness: { brightness: 0.42 },
      lyricsStyle: { style: 'clean-fade', size: 'large' },
      font: { font: 'serif' },
      ...handwrittenEnds(n),
      colours: { accent: GOLD, text: CREAM },
      overlays: { clear: true, add: ['dust', 'vignette'] },
    }),
  },
  {
    id: 'mum-handwritten',
    title: 'Dear Mum: all handwritten',
    notes: 'The same letter entirely in handwriting, over a single mug by the tree. Analog film grade with grain.',
    letter: 'mum',
    image: IMAGES.mug,
    changes: () => ({
      ...BASE,
      camera: { motion: 'breathing', amount: 0.2 },
      colourGrade: { grade: 'analog', strength: 0.7 },
      backgroundBrightness: { brightness: 0.58 },
      lyricsStyle: { style: 'clean-fade', size: 'large' },
      font: { font: 'romantic' },
      lyricEmphasis: { off: true },
      colours: { accent: GOLD, text: CREAM },
      overlays: { clear: true, add: ['grain', 'vignette'] },
    }),
  },
  {
    id: 'mum-page',
    title: 'Dear Mum: the page',
    notes: 'Spotlight style: the line before and after stay on screen, like reading down a page. Soft tree-light bokeh.',
    letter: 'mum',
    image: IMAGES.bokeh,
    changes: (n) => ({
      ...BASE,
      camera: { motion: 'static' },
      colourGrade: { grade: 'dream', strength: 0.5 },
      backgroundBrightness: { brightness: 0.45 },
      backgroundBlur: { amount: 0.3 },
      lyricsStyle: { style: 'spotlight', size: 'medium' },
      font: { font: 'serif' },
      ...handwrittenEnds(n),
      colours: { accent: CREAM, text: CREAM },
      overlays: { clear: true, add: ['vignette'] },
    }),
  },
  {
    id: 'dad-fire',
    title: 'Dear Dad: the street, headline',
    notes: 'Your image: a foggy street at night, one window lit by a Christmas tree. Retro film look (film grain, a soft light leak, vignette). Headline style: one big word at a time.',
    letter: 'dad',
    image: IMAGES.foggyStreet,
    changes: (n) => ({
      ...BASE,
      camera: { motion: 'push-in', amount: 0.2 },
      colourGrade: { grade: 'original' },
      backgroundBrightness: { brightness: 0.85 },
      lyricsStyle: { style: 'headline', size: 'large' },
      font: { font: 'cinematic' },
      ...handwrittenEnds(n),
      colours: { accent: '#F7C47A', text: CREAM },
      adjustLyrics: { uppercase: false, backdropOpacity: 0, highlightColor: 'default' },
      overlays: { clear: true, add: ['grain', 'light-leak', 'vignette'], lightLeak: 0.3 },
    }),
  },
  {
    id: 'dad-typewriter',
    title: 'Dear Dad: typewriter',
    notes: 'Typed word by word as you read, by an empty wood stove. Cold night grade, film grain.',
    letter: 'dad',
    image: IMAGES.stove,
    changes: () => ({
      ...BASE,
      camera: { motion: 'drift-right', amount: 0.15 },
      colourGrade: { grade: 'cold-night', strength: 0.55 },
      backgroundBrightness: { brightness: 0.55 },
      lyricsStyle: { style: 'kinetic', size: 'medium' },
      font: { font: 'data' },
      lyricEmphasis: { off: true },
      colours: { accent: CREAM, text: CREAM },
      overlays: { clear: true, add: ['grain', 'vignette'] },
    }),
  },
  {
    id: 'grandad-fading',
    title: 'Dear Grandad: his photo, fading',
    notes: 'His photo in the Fading signature style (an old photo in a drawer, only the eyes keep their colour). Stand-in photo.',
    letter: 'grandad',
    video: PHOTO_VIDEO,
    style: 'fading',
    changes: (n) => ({
      ...BASE,
      tuneSignatureStyle: { pulse: 0.2, strength: 0.6, movement: 0.4 },
      lyricsStyle: { style: 'calm-waves', size: 'large' },
      font: { font: 'cinematic' },
      ...handwrittenEnds(n),
      colours: { accent: CREAM, text: CREAM },
      titleStyle: { color: CREAM },
      overlays: { clear: true, add: ['dust', 'vignette'] },
    }),
  },
  {
    id: 'nan-list',
    title: 'Dear Nan: the little things',
    notes: 'The list-poem letter: small things, building to one line. Tree in a dark room, calm waves, handwritten ends.',
    letter: 'nan',
    image: IMAGES.treeDark,
    changes: (n) => ({
      ...BASE,
      camera: { motion: 'vertical-float', amount: 0.15 },
      colourGrade: { grade: 'analog', strength: 0.5 },
      backgroundBrightness: { brightness: 0.55 },
      lyricsStyle: { style: 'calm-waves', size: 'large' },
      font: { font: 'serif' },
      ...handwrittenEnds(n),
      colours: { accent: GOLD, text: CREAM },
      overlays: { clear: true, add: ['dust', 'light-leak', 'vignette'], lightLeak: 0.25 },
    }),
  },
  {
    id: 'friend-marker',
    title: 'Dear Sam: a friend',
    notes: 'Lighter and funnier, for a best friend. Handwritten marker, a quiet living room with the tree on, gentle snow.',
    letter: 'friend',
    image: IMAGES.quietRoom,
    changes: () => ({
      ...BASE,
      camera: { motion: 'drift-left', amount: 0.15 },
      colourGrade: { grade: 'warm-film', strength: 0.5 },
      backgroundBrightness: { brightness: 0.6 },
      lyricsStyle: { style: 'clean-fade', size: 'large' },
      font: { font: 'sketchy' },
      lyricEmphasis: { off: true },
      colours: { accent: GOLD, text: CREAM },
      overlays: { clear: true, add: ['snow', 'vignette'] },
    }),
  },
  ...memoryVariants(),
];

/* ---------- Your fog-and-one-warm-light set ---------- */

/** The look for your images: their own colours, retro film grain, a soft light leak, text up in the fog. */
function memoryLook(lyrics: Record<string, unknown>, font: string, n: number, opts: { handwrittenEnds?: boolean; raise?: number } = {}) {
  return {
    ...BASE,
    camera: { motion: 'push-in', amount: 0.15 },
    colourGrade: { grade: 'original' },
    backgroundBrightness: { brightness: 0.9 },
    lyricsStyle: lyrics,
    font: { font },
    ...(opts.handwrittenEnds === false ? { lyricEmphasis: { off: true } } : handwrittenEnds(n)),
    colours: { accent: '#F7C47A', text: CREAM },
    adjustLyrics: { uppercase: false, backdropOpacity: 0, offsetY: -(opts.raise ?? 0.12) },
    overlays: { clear: true, add: ['grain', 'light-leak', 'vignette'], lightLeak: 0.25 },
  };
}

function memoryVariants(): Variant[] {
  const v = (
    n: number,
    letter: keyof typeof LETTERS,
    title: string,
    notes: string,
    lyrics: Record<string, unknown>,
    font: string,
    opts?: { handwrittenEnds?: boolean; raise?: number },
  ): Variant => ({
    id: `memory-${n}`,
    title: `Memory ${n}: ${title}`,
    notes,
    letter,
    image: MEMORY(n),
    changes: (count) => memoryLook(lyrics, font, count, opts),
  });
  return [
    v(1, 'mum', 'Dear Mum', 'Teal street, the tree in one window. Clean fade, cinematic serif, handwritten ends.', { style: 'clean-fade', size: 'large' }, 'cinematic'),
    v(2, 'nan', 'Dear Nan', 'Snow on the pavement under bare branches. Calm waves, refined serif.', { style: 'calm-waves', size: 'large' }, 'serif'),
    v(3, 'friend', 'Dear Sam', 'Purple street, fairy lights on the houses. Clean fade, handwritten marker throughout.', { style: 'clean-fade', size: 'large' }, 'sketchy', { handwrittenEnds: false }),
    v(4, 'grandad', 'Dear Grandad', 'Lights along the gutter, frost on the hedge. Clean fade, cinematic serif, handwritten ends.', { style: 'clean-fade', size: 'large' }, 'cinematic', { raise: 0.18 }),
    v(5, 'dad', 'Dear Dad', 'A lone tree in a foggy field. Headline: one big word at a time.', { style: 'headline', size: 'large' }, 'cinematic', { handwrittenEnds: false, raise: 0.08 }),
    v(6, 'mum', 'Dear Mum, handwritten', 'Wet pavement, a bush strung with coloured lights, the lamp. All in handwriting.', { style: 'clean-fade', size: 'large' }, 'romantic', { handwrittenEnds: false }),
    v(7, 'dad', 'Dear Dad, word by word', 'An empty wet road, two lamps. Kinetic: each line revealed word by word as you read.', { style: 'kinetic', size: 'large' }, 'serif', { handwrittenEnds: false }),
    v(8, 'nan', 'Dear Nan, the page', 'Full moon over a house, the tree in the window. Spotlight: the lines before and after stay, like a page.', { style: 'spotlight', size: 'medium' }, 'serif'),
    {
      ...v(4, 'grandad', 'Dear Grandad, then his face', 'As Memory 4, then his portrait arrives for the sign-off in the Fading style (only the eyes keep their colour). Stand-in photo.', { style: 'clean-fade', size: 'large' }, 'cinematic', { raise: 0.18 }),
      id: 'memory-4-reveal',
      reveal: {
        video: PHOTO_VIDEO,
        style: 'fading',
        changes: (n) => ({
          ...BASE,
          tuneSignatureStyle: { pulse: 0.15, strength: 0.6, movement: 0.35 },
          lyricsStyle: { style: 'clean-fade', size: 'large' },
          font: { font: 'cinematic' },
          ...handwrittenEnds(n),
          colours: { accent: '#F7C47A', text: CREAM },
          adjustLyrics: { uppercase: false, backdropOpacity: 0, offsetY: 0.22 },
          overlays: { clear: true, add: ['grain', 'vignette'] },
        }),
      },
    },
    v(9, 'grandad', 'Dear Grandad, waves', 'Mauve street under bare branches. Calm waves, handwritten throughout.', { style: 'calm-waves', size: 'large' }, 'romantic', { handwrittenEnds: false }),
  ];
}

/* ---------- Run ---------- */

interface Made {
  id: string;
  title: string;
  notes: string;
  videoPath: string;
  file: string;
  duration: number;
  madeIn: number;
  madeAt: string;
}

/** Starts a render and waits for it; returns the MP4. */
async function render(id: string, input: Parameters<typeof createRender>[0]): Promise<Buffer> {
  let r: Render = await createRender(input);
  while (r.status === 'queued' || r.status === 'rendering') {
    await new Promise((x) => setTimeout(x, 5000));
    r = await getRender(r.id);
  }
  if (r.status !== 'succeeded' || !r.url) throw new Error(`${id}: render ${r.status}: ${r.error}`);
  return Buffer.from(await (await fetch(r.url)).arrayBuffer());
}

/** Seconds into the audio where line `index` starts. */
function lineStart(lines: string[], words: Timed['words'], index: number): number {
  const before = lines.slice(0, index).reduce((n, l) => n + tokens(l).length, 0);
  return words[before].start;
}

const XFADE = 1.5;

async function make(v: Variant): Promise<Made> {
  const t0 = Date.now();
  const lines = LETTERS[v.letter];
  const audio = await choirFor(v.letter);
  const song = { audioUrl: await signedUrl(audio.path, 2), duration: audio.duration, words: audio.words, lines };
  const base = { orientation: 'portrait' as const, title: '', subtitle: '', song };

  // The portrait arrives as the sign-off begins, fading in over XFADE seconds.
  const revealAt = v.reveal ? Math.max(0, lineStart(lines, audio.words, lines.length - 2) - 1.2) : null;

  const [main, reveal] = await Promise.all([
    render(v.id, {
      ...base,
      videoId: v.video ?? GRADIENT_VIDEO,
      ...(v.style ? { style: v.style } : {}),
      ...(v.image ? { background: { imageUrl: await imageUrl(v.image) } } : {}),
      changes: v.changes(lines.length),
      metadata: { experiment: `letters/${v.id}` },
    }),
    v.reveal && revealAt !== null
      ? render(`${v.id} reveal`, {
          ...base,
          videoId: v.reveal.video ?? GRADIENT_VIDEO,
          style: v.reveal.style,
          ...(v.reveal.image ? { background: { imageUrl: await imageUrl(v.reveal.image) } } : {}),
          start: revealAt,
          end: audio.duration,
          changes: v.reveal.changes(lines.length),
          metadata: { experiment: `letters/${v.id}/reveal` },
        })
      : null,
  ]);

  let video = main;
  if (reveal && revealAt !== null) {
    // Letter until the reveal, a cross-fade, then the portrait; the original choir under it all.
    const m = join(work, `${v.id}-main.mp4`);
    const r = join(work, `${v.id}-reveal.mp4`);
    const out = join(work, `${v.id}.mp4`);
    writeFileSync(m, main);
    writeFileSync(r, reveal);
    ff([
      '-i', m, '-i', r, '-i', join(work, `${v.letter}.mp3`),
      '-filter_complex',
      `[0:v]trim=0:${revealAt + XFADE},setpts=PTS-STARTPTS,fps=30,format=yuv420p[a];` +
        `[1:v]setpts=PTS-STARTPTS,fps=30,format=yuv420p[b];` +
        `[a][b]xfade=transition=fade:duration=${XFADE}:offset=${revealAt}[v]`,
      '-map', '[v]', '-map', '2:a', '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-c:a', 'aac', '-b:a', '192k', '-shortest', out,
    ]);
    video = readFileSync(out);
  }

  const videoPath = `${DIR}/${v.id}.mp4`;
  await saveFile(videoPath, video, 'video/mp4');
  const madeIn = Math.round((Date.now() - t0) / 1000);
  console.log(`${v.id}: done in ${madeIn}s (${audio.duration}s video${reveal ? `, portrait from ${revealAt?.toFixed(1)}s` : ''})`);
  return { id: v.id, title: v.title, notes: v.notes, videoPath, file: `${v.id}.mp4`, duration: audio.duration, madeIn, madeAt: new Date().toISOString() };
}

async function main() {
  const args = process.argv.slice(2);
  const o = args.indexOf('--out');
  const out = o >= 0 ? args[o + 1] : null;
  const only = args.filter((_, i) => !(o >= 0 && (i === o || i === o + 1)));
  const chosen = only.length ? VARIANTS.filter((v) => only.includes(v.id)) : VARIANTS;
  console.log(`Rendering ${chosen.length} on ${process.env.WAVECANVAS_API_URL || 'wavecanvas.io'}`);

  // WaveCanvas allows 5 renders in progress per key: run 4 at a time.
  const results: PromiseSettledResult<Made>[] = new Array(chosen.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, chosen.length) }, async () => {
      while (next < chosen.length) {
        const i = next++;
        results[i] = await make(chosen[i]).then(
          (value) => ({ status: 'fulfilled' as const, value }),
          (reason) => ({ status: 'rejected' as const, reason }),
        );
      }
    }),
  );
  results.forEach((r, i) => r.status === 'rejected' && console.error(`${chosen[i].id} failed:`, r.reason));

  const bucket = getFirebaseAdmin().storage.bucket();
  const file = bucket.file(`${DIR}/manifest.json`);
  const [exists] = await file.exists();
  const old: Made[] = exists ? JSON.parse((await file.download())[0].toString()) : [];
  const byId = new Map(old.map((e) => [e.id, e]));
  for (const r of results) if (r.status === 'fulfilled') byId.set(r.value.id, r.value);
  const manifest = VARIANTS.map((v) => byId.get(v.id)).filter((m): m is Made => Boolean(m));
  await saveFile(`${DIR}/manifest.json`, Buffer.from(JSON.stringify(manifest, null, 2)), 'application/json');
  console.log(`manifest: ${manifest.length} letters`);

  if (out) {
    mkdirSync(out, { recursive: true });
    for (const m of manifest) writeFileSync(join(out, m.file), (await bucket.file(m.videoPath).download())[0]);
    writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`copied to ${out}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

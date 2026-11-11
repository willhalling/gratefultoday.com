/**
 * Christmas experiments: one message made several ways, rendered on
 * WaveCanvas, for /experiments/christmas (dev only).
 *
 *   npx -y tsx@4.20.6 --env-file=.env --conditions=react-server --tsconfig ./tsconfig.json \
 *     scripts/experiments/christmas.ts [ids...] [--out <dir>]
 *
 * With no ids it makes every version. Files go to Firebase Storage under
 * experiments/christmas/, with manifest.json listing them. --out also copies
 * every version and the manifest to <dir>: the WaveCanvas dev page
 * (app/dev/christmas) reads them from its public/dev-media/christmas/.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lookChanges, PHOTO_STYLE } from '@/lib/looks';
import { narrate } from '@/lib/narration';
import { saveFile, signedUrl } from '@/lib/orders/store';
import { createRender, getRender, type Render, type RenderSong } from '@/lib/wavecanvas';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

interface Experiment {
  id: string;
  title: string;
  notes: string;
  videoPath: string;
  /** File name when copied with --out. */
  file: string;
  /** Seconds. */
  duration: number;
  /** Seconds from start to finished MP4, audio included. */
  madeIn: number;
  madeAt: string;
}

const LINES = [
  'Merry Christmas, Mrs Patel.',
  'Amara was afraid to read aloud.',
  'So you handed her the register.',
  'By summer, a story for the whole class.',
  'You built her voice, name by name.',
  'Thank you, this Christmas and always.',
];
const TITLE = 'Thank you, Mrs Patel';
const FROM = 'From Amara and Jo';

/** A saved WaveCanvas video with a portrait photo background (a stand-in photo). */
const PHOTO_VIDEO = 'ytdowncom-youtube-media-xth5vuepx5w-freya-ridings-black-friday-by-tom-odell-011-128kmp3-mw8a4qqyinwi';
const GRADIENT_VIDEO = 'back-to-the-strobe-mv8d39xkunmx';

const DIR = 'experiments/christmas';
const work = mkdtempSync(join(tmpdir(), 'xmas-'));
const ff = (args: string[]) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args]);
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);

/* ---------- Audio ---------- */

/** ElevenLabs allows 2 requests at once on this plan; queue the rest. */
let running = 0;
const waiting: (() => void)[] = [];
async function limited<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= 2) await new Promise<void>((go) => waiting.push(go));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

type Audio = Omit<RenderSong, 'audioUrl'> & { file: string };

async function eleven(path: string, body: unknown, accept = 'audio/mpeg'): Promise<Response> {
  const res = await limited(() => fetch(`https://api.elevenlabs.io/v1${path}`, {
    method: 'POST',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY!, 'Content-Type': 'application/json', Accept: accept },
    body: JSON.stringify(body),
  }));
  if (!res.ok) throw new Error(`ElevenLabs ${path} returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res;
}

/** The narrator alone, as production makes it today. */
async function narrated(): Promise<Audio> {
  const n = await limited(() => narrate(LINES, { names: ['Mrs Patel'] }));
  const file = join(work, 'voice.mp3');
  writeFileSync(file, n.audio);
  return { file, duration: n.duration, words: n.words, lines: LINES };
}

/**
 * The narrator over an instrumental Christmas score: a 2.5 s intro, a pause
 * between lines (longer before the last), music up at the start and end.
 */
async function scored(voice: Audio): Promise<Audio> {
  const INTRO = 2.5;
  const starts: number[] = [];
  let w = 0;
  for (const l of LINES) {
    starts.push(w);
    w += words(l).length;
  }
  const cuts = starts.slice(1).map((i) => (voice.words[i - 1].end + voice.words[i].start) / 2);
  const gaps = cuts.map((_, i) => (i === cuts.length - 1 ? 1.4 : 0.7));
  const bounds = [0, ...cuts, voice.duration];
  const parts: string[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    ff(['-i', voice.file, '-ss', String(bounds[i]), '-to', String(bounds[i + 1]), '-ar', '44100', '-ac', '2', join(work, `seg${i}.wav`)]);
    parts.push(`seg${i}.wav`);
    if (i < gaps.length) {
      ff(['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', String(gaps[i]), join(work, `gap${i}.wav`)]);
      parts.push(`gap${i}.wav`);
    }
  }
  writeFileSync(join(work, 'list.txt'), parts.map((p) => `file '${p}'`).join('\n'));
  ff(['-f', 'concat', '-safe', '0', '-i', join(work, 'list.txt'), join(work, 'paced.wav')]);
  const shift = (t: number) => {
    let s = INTRO;
    cuts.forEach((c, i) => {
      if (t >= c) s += gaps[i];
    });
    return t + s;
  };
  const timed = voice.words.map((x) => ({ ...x, start: shift(x.start), end: shift(x.end) }));
  const voiceEnd = timed[timed.length - 1].end;
  const total = Math.ceil(voiceEnd + 4);

  const music = await eleven('/music?output_format=mp3_44100_128', {
    prompt:
      'Gentle, cinematic Christmas underscore: soft felt piano, warm strings, a little celesta and distant sleigh bells. Tender and hopeful, slow tempo, no drums, no vocals. Swells softly at the end.',
    music_length_ms: (total + 2) * 1000,
    force_instrumental: true,
  });
  const musicFile = join(work, 'score.mp3');
  writeFileSync(musicFile, Buffer.from(await music.arrayBuffer()));

  const file = join(work, 'scored.mp3');
  ff([
    '-i', musicFile, '-i', join(work, 'paced.wav'), '-filter_complex',
    `[1:a]adelay=${INTRO * 1000}|${INTRO * 1000},apad,volume=1.6[v];` +
      `[0:a]volume='if(lt(t,${INTRO - 0.5}),0.55,if(lt(t,${voiceEnd + 0.3}),0.16,0.55))':eval=frame,afade=t=out:st=${total - 2.5}:d=2.5[m];` +
      `[m][v]amix=inputs=2:duration=first:normalize=0,atrim=0:${total},alimiter=limit=0.95[out]`,
    '-map', '[out]', '-b:a', '192k', file,
  ]);
  return { file, duration: total, words: timed, lines: LINES };
}

/** The message sung, with ElevenLabs' own word timings. The last line comes back as a refrain. */
async function sung(name: string, globalStyles: string[], vocals: string): Promise<Audio> {
  const lines = [...LINES, LINES[LINES.length - 1]];
  const res = await eleven(
    '/music/detailed?output_format=mp3_44100_128',
    {
      model_id: 'music_v1',
      with_timestamps: true,
      composition_plan: {
        positive_global_styles: globalStyles,
        negative_global_styles: ['rap', 'heavy drums', 'distorted guitar', 'explicit'],
        sections: [
          { section_name: 'Intro', positive_local_styles: ['instrumental', 'sleigh bells'], negative_local_styles: ['vocals'], duration_ms: 5000, lines: [] },
          { section_name: 'Verse', positive_local_styles: [vocals, 'intimate'], negative_local_styles: [], duration_ms: 16000, lines: lines.slice(0, 3) },
          { section_name: 'Chorus', positive_local_styles: [vocals, 'lifting', 'fuller'], negative_local_styles: [], duration_ms: 14000, lines: lines.slice(3, 6) },
          { section_name: 'Outro', positive_local_styles: [vocals, 'soft', 'fading'], negative_local_styles: [], duration_ms: 9000, lines: lines.slice(6) },
        ],
      },
    },
    'multipart/mixed',
  );
  // multipart/mixed: a JSON part (with words_timestamps), then the MP3.
  const raw = Buffer.from(await res.arrayBuffer());
  const boundary = `--${res.headers.get('content-type')!.match(/boundary=([^;]+)/)![1]}`;
  let json: { words_timestamps?: { word: string; start_ms: number; end_ms: number }[] } = {};
  let audio: Buffer | null = null;
  let at = raw.indexOf(boundary);
  while (at >= 0) {
    const next = raw.indexOf(boundary, at + boundary.length);
    const part = raw.subarray(at + boundary.length, next < 0 ? raw.length : next);
    const split = part.indexOf('\r\n\r\n');
    if (split >= 0) {
      const head = part.subarray(0, split).toString();
      const body = part.subarray(split + 4, part.length - 2);
      if (head.includes('application/json')) json = JSON.parse(body.toString());
      else if (head.includes('audio/')) audio = Buffer.from(body);
    }
    at = next;
  }
  if (!audio) throw new Error('No audio in the music response.');
  const file = join(work, `${name}.mp3`);
  writeFileSync(file, audio);
  const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());
  const sungWords = (json.words_timestamps ?? []).map((w) => ({ word: w.word, start: w.start_ms / 1000, end: w.end_ms / 1000 }));
  // Lines only if every word came back, so on-screen lines group correctly.
  const expected = lines.reduce((n, l) => n + words(l).length, 0);
  return { file, duration, words: sungWords, lines: sungWords.length === expected ? lines : [] };
}

/* ---------- Versions ---------- */

interface Version {
  id: string;
  title: string;
  notes: string;
  audio: () => Promise<Audio>;
  video: string;
  style?: string;
  changes: (lineCount: number) => Record<string, unknown>;
}

const photoLook = (lineCount: number) => ({
  ...PHOTO_STYLE,
  beatReaction: { amount: 0 },
  layout: { layout: 'minimal' },
  visualizer: { visualizer: 'none' },
  socialLinks: { clear: true },
  lyricsVisibility: { show: true },
  lyricsStyle: { style: 'calm-waves', size: 'large' },
  font: { font: 'cinematic' },
  colours: { accent: '#F5C542', text: '#FFF6E5' },
  titleStyle: { color: '#F5C542' },
  lyricEmphasis: { font: 'script', lines: [lineCount - 1] },
  adjustLyrics: { uppercase: false, backdropOpacity: 0 },
  textShadow: { on: true },
  overlays: { remove: ['dust'], add: ['snow', 'light-leak', 'grain'], lightLeak: 0.4 },
});

let voice: Promise<Audio> | null = null;
let score: Promise<Audio> | null = null;
let ballad: Promise<Audio> | null = null;
const getVoice = () => (voice ??= narrated());
const getScore = () => (score ??= getVoice().then(scored));
const getBallad = () =>
  (ballad ??= sung('ballad', ['gentle christmas ballad', 'piano', 'soft strings', 'sleigh bells', 'warm', 'slow'], 'warm female vocals'));

const VERSIONS: Version[] = [
  {
    id: 'narrated',
    title: 'Narrated (today)',
    notes: 'What production makes now: the narrator alone, Christmas Eve look.',
    audio: getVoice,
    video: GRADIENT_VIDEO,
    changes: (n) => lookChanges('christmas', n),
  },
  {
    id: 'narrated-score',
    title: 'Narrated + Christmas score',
    notes: 'Same voice, paced with pauses, over an original instrumental score (ElevenLabs Music). Christmas Eve look.',
    audio: getScore,
    video: GRADIENT_VIDEO,
    changes: (n) => lookChanges('christmas', n),
  },
  {
    id: 'song-ballad',
    title: 'Sung: piano ballad',
    notes: 'The message as an original song (ElevenLabs Music sings our lyrics, last line as a refrain). Christmas Eve look.',
    audio: getBallad,
    video: GRADIENT_VIDEO,
    changes: (n) => lookChanges('christmas', n),
  },
  {
    id: 'song-pop',
    title: 'Sung: Christmas pop',
    notes: 'A brighter, classic-Christmas-pop arrangement with sleigh bells and a male vocal. Candlelight look.',
    audio: () =>
      sung('pop', ['classic christmas pop', 'sleigh bells', 'glockenspiel', 'warm brass', 'joyful', 'mid tempo'], 'warm male vocals'),
    video: GRADIENT_VIDEO,
    changes: (n) => lookChanges('candlelight', n),
  },
  {
    id: 'photo-score',
    title: 'Their photo + narrated score',
    notes: 'The narrated score over the recipient’s photo in the Grace signature style, with snow. (Stand-in photo.)',
    audio: getScore,
    video: PHOTO_VIDEO,
    style: 'grace',
    changes: photoLook,
  },
  {
    id: 'photo-ballad',
    title: 'Their photo + sung ballad',
    notes: 'The piano ballad over the recipient’s photo in Grace. (Stand-in photo.)',
    audio: getBallad,
    video: PHOTO_VIDEO,
    style: 'grace',
    changes: photoLook,
  },
];

/* ---------- Run ---------- */

async function make(v: Version): Promise<Experiment> {
  const t0 = Date.now();
  const a = await v.audio();
  const audioPath = `${DIR}/${v.id}.mp3`;
  await saveFile(audioPath, readFileSync(a.file), 'audio/mpeg');
  const lineCount = a.lines.length || LINES.length;
  let r: Render = await createRender({
    videoId: v.video,
    orientation: 'portrait',
    title: TITLE,
    subtitle: FROM,
    ...(v.style ? { style: v.style } : {}),
    changes: v.changes(lineCount),
    song: { audioUrl: await signedUrl(audioPath, 2), duration: a.duration, words: a.words, lines: a.lines.length ? a.lines : undefined } as RenderSong,
    metadata: { experiment: `christmas/${v.id}` },
  });
  while (r.status === 'queued' || r.status === 'rendering') {
    await new Promise((x) => setTimeout(x, 5000));
    r = await getRender(r.id);
  }
  if (r.status !== 'succeeded' || !r.url) throw new Error(`${v.id}: render ${r.status}: ${r.error}`);
  const videoPath = `${DIR}/${v.id}.mp4`;
  await saveFile(videoPath, Buffer.from(await (await fetch(r.url)).arrayBuffer()), 'video/mp4');
  const seconds = Math.round((Date.now() - t0) / 1000);
  console.log(`${v.id}: done in ${seconds}s (${a.duration.toFixed(1)}s video)`);
  return { id: v.id, title: v.title, notes: v.notes, videoPath, file: `${v.id}.mp4`, duration: Math.round(a.duration), madeIn: seconds, madeAt: new Date().toISOString() };
}

async function main() {
  const args = process.argv.slice(2);
  const o = args.indexOf('--out');
  const out = o >= 0 ? args[o + 1] : null;
  const only = args.filter((a, i) => !(o >= 0 && (i === o || i === o + 1)));
  const chosen = only.length ? VERSIONS.filter((v) => only.includes(v.id)) : VERSIONS;
  const results = await Promise.allSettled(chosen.map(make));
  results.forEach((r, i) => r.status === 'rejected' && console.error(`${chosen[i].id} failed:`, r.reason));

  // Merge into the manifest, keeping versions not remade this run, in VERSIONS order.
  const file = getFirebaseAdmin().storage.bucket().file(`${DIR}/manifest.json`);
  const [exists] = await file.exists();
  const old: Experiment[] = exists ? JSON.parse((await file.download())[0].toString()) : [];
  const byId = new Map(old.map((e) => [e.id, e]));
  for (const r of results) if (r.status === 'fulfilled') byId.set(r.value.id, r.value);
  const manifest = VERSIONS.map((v) => byId.get(v.id)).filter(Boolean);
  await saveFile(`${DIR}/manifest.json`, Buffer.from(JSON.stringify(manifest, null, 2)), 'application/json');
  console.log(`manifest: ${manifest.length} versions`);

  if (out) {
    mkdirSync(out, { recursive: true });
    for (const e of manifest as Experiment[]) {
      const file = e.file ?? `${e.id}.mp4`;
      writeFileSync(join(out, file), (await getFirebaseAdmin().storage.bucket().file(e.videoPath).download())[0]);
      e.file = file;
    }
    writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`copied to ${out}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

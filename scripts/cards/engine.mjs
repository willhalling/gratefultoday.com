/**
 * cards/engine — turns a card script (see cards/*.mjs) into a 1080×1920 MP4
 * with ffmpeg, locally. A card is plain data:
 *
 *   shots  what you see, in order: an image (a fal prompt, or a file), how long
 *          it lasts, a slow camera move, and the words that appear over it
 *   sound  layers (wind, room air, a clock, a fire, a music box, any audio
 *          file), each with a volume envelope
 *
 * Times never need adding up by hand: a shot starts where the last one ended
 * (minus its dissolve), words are timed from the start of their shot, and
 * sound envelopes can say 'kitchen+1.5' or 'end-3'.
 *
 * Images are generated once and cached (public/dev-media/cards/_cache), so
 * changing words, timing or sound re-renders in under a minute for free.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { generateImage, hash } from './images.mjs';
import { musicBox } from './music-box.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const MEDIA = join(ROOT, 'public', 'dev-media');
const CACHE = join(MEDIA, 'cards', '_cache');
const ROOMS = join(MEDIA, 'room-sound', 'rooms');
/** A fog-set image, as a light style reference for foggy exteriors. */
export const FOG_REF = '/Users/will/Documents/wavecanvas-christmas/public/dev-media/christmas/live/memory_08.jpg';

const W = 1080;
const H = 1920;
const FPS = 30;
const UP = 3; // zoom on a 3x image so slow moves don't step a pixel at a time

/** Shared prompt endings, so every image in a card comes from the same camera. */
export const STYLES = {
  fogNight:
    'Cinematic 35mm film photograph, England, night, thick fog, deep teal and blue-grey fog with one warm amber light, soft halation, fine film grain, muted colours, quiet, empty, tender, nostalgic. No people, no text, no signs.',
  warm90s:
    'Candid 35mm film photograph taken in a British family home in the 1990s at Christmas, warm tungsten lamplight, deep soft shadows, gentle halation, fine film grain, slightly faded colours, intimate, unstaged, real. No text, no logos.',
  winterDoorstep:
    'Candid 35mm film photograph on a British residential street on a foggy Christmas Eve night, lit by warm light spilling from an open front door and by lanterns, cold blue fog behind, visible breath, shallow depth of field, fine film grain, natural colours, real, unstaged. No text, no logos.',
  warmNow:
    'Candid 35mm film photograph in a British family home at Christmas, warm lamplight and fairy lights, shallow depth of field, soft shadows, fine film grain, natural colours, intimate, unstaged, real. No text, no logos.',
};

/** Grades applied after generation (ffmpeg filter graphs on input 0). */
const LOOKS = {
  // Thicker fog: screen a heavy blur over the picture, lower the contrast, push towards teal.
  fog: '[0]format=gbrp,split[a][b];[b]gblur=sigma=45[h];[a][h]blend=all_mode=screen:all_opacity=0.5,eq=contrast=0.85:saturation=0.75:gamma=1.03,colorbalance=rs=-0.06:gs=0.03:bs=0.05:rm=-0.06:gm=0.02:bm=0.03,format=yuvj444p',
  // A faded film memory: warm, lifted blacks, softer contrast, a gentle glow.
  memory:
    '[0]format=gbrp,split[a][b];[b]gblur=sigma=30[g];[a][g]blend=all_mode=screen:all_opacity=0.22,curves=all=0/0.07 0.5/0.5 1/0.93,eq=contrast=0.9:saturation=0.78,colorbalance=rs=0.05:gs=0.01:bs=-0.05:rm=0.04:bm=-0.04:rh=0.02:bh=-0.03,format=yuvj444p',
  // Just a little glow and softness, for present-day warm interiors.
  soft: '[0]format=gbrp,split[a][b];[b]gblur=sigma=24[g];[a][g]blend=all_mode=screen:all_opacity=0.12,curves=all=0/0.03 0.5/0.5 1/0.97,eq=saturation=0.92,format=yuvj444p',
};

/**
 * Somewhere in December type, by role. Never stark white. Keep text between
 * 12% and 78% of the height: TikTok covers the rest.
 */
const CREAM = '#EDE4D3';
const BLUE_GREY = '#C8D2D8';
const TYPE = {
  // The hook and the closing line: Baskerville, lowercase, generously spaced.
  cinematic: { family: 'Baskerville', style: 'normal', weight: 400, size: 70, lh: 1.3, spacing: 4, color: CREAM, opacity: 0.94, lower: true },
  // Their own words: Georgia Italic, as written.
  letter: { family: 'Georgia', style: 'italic', weight: 400, size: 60, lh: 1.4, spacing: 0.5, color: CREAM, opacity: 0.94, lower: false },
  // Quiet scene labels: a light sans, lowercase, wide spacing.
  caption: { family: 'Avenir Next', style: 'normal', weight: 300, size: 32, lh: 1.4, spacing: 10, color: BLUE_GREY, opacity: 0.85, lower: true },
};

const ffmpeg = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
const n3 = (x) => +x.toFixed(3);

/* ---------- Images ---------- */

async function prepareImage(shot, card) {
  let raw;
  if (shot.file) {
    raw = join(CACHE, `file-${hash({ file: shot.file, position: shot.position })}.jpg`);
    if (!existsSync(raw)) await sharp(shot.file).resize(W, H, { fit: 'cover', position: shot.position ?? 'centre' }).jpeg({ quality: 93 }).toFile(raw);
  } else {
    // {name} in a prompt is replaced by the card's subject of that name, so a dog or a person is described the same way in every shot.
    const subject = shot.prompt.replace(/\{(\w+)\}/g, (m, k) => card.subjects?.[k] ?? m);
    const style = STYLES[shot.style ?? card.style];
    if (!style) throw new Error(`${card.id}/${shot.name}: no style "${shot.style ?? card.style}"`);
    raw = await generateImage({ prompt: `${subject} ${style}`, take: shot.take, ref: shot.ref }, CACHE);
  }
  const look = shot.look === undefined ? card.look : shot.look;
  let graded = raw;
  if (look) {
    if (!LOOKS[look]) throw new Error(`${card.id}/${shot.name}: no look "${look}"`);
    graded = raw.replace(/\.jpg$/, `-${look}.jpg`);
    if (!existsSync(graded)) ffmpeg(['-i', raw, '-filter_complex', LOOKS[look], graded]);
  }
  const big = graded.replace(/\.jpg$/, '-big.jpg');
  if (!existsSync(big)) await sharp(graded).resize(W * UP, H * UP, { kernel: 'lanczos3' }).jpeg({ quality: 94 }).toFile(big);
  return { still: graded, big };
}

/* ---------- Words ---------- */

async function textPng(file, { lines, y, type, scrim }) {
  const t = TYPE[type];
  if (!t) throw new Error(`No text type "${type}"`);
  const lh = t.size * t.lh;
  const top = H * y - ((lines.length - 1) * lh) / 2;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const rows = lines
    .map(
      (l, i) =>
        // Spacing adds a gap after the last letter too, so nudge right by half to stay centred.
        `<text x="${W / 2 + t.spacing / 2}" y="${top + i * lh}" text-anchor="middle" font-family="${t.family}" font-style="${t.style}" font-weight="${t.weight}" font-size="${t.size}" letter-spacing="${t.spacing}" fill="${t.color}" fill-opacity="${t.opacity}" filter="url(#s)">${esc(t.lower ? l.toLowerCase() : l)}</text>`,
    )
    .join('');
  // A soft dark gradient behind words over a busy picture: from the bottom for low text, from the top for high text.
  let shade = '';
  if (scrim) {
    const low = y >= 0.5;
    const stops = '<stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.55" stop-color="#000" stop-opacity="0.5"/><stop offset="1" stop-color="#000" stop-opacity="0.68"/>';
    shade = low
      ? `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient><rect x="0" y="${H * (y - 0.2)}" width="${W}" height="${H * (1.2 - y)}" fill="url(#g)"/>`
      : `<linearGradient id="g" x1="0" y1="1" x2="0" y2="0">${stops}</linearGradient><rect x="0" y="0" width="${W}" height="${H * (y + 0.2)}" fill="url(#g)"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><filter id="s" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="10"/><feComponentTransfer><feFuncA type="linear" slope="0.65"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>${shade}${rows}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(file);
}

/* ---------- Sound ---------- */

/** Keyframes [[time, level], …] → an ffmpeg expression in t (straight lines between them, held before and after). */
function envelope(keys, when) {
  const k = keys.map(([t, v]) => [when(t), v]).sort((a, b) => a[0] - b[0]);
  let e = String(k[0][1]);
  for (let i = 0; i < k.length - 1; i++) {
    const d = k[i + 1][1] - k[i][1];
    if (d !== 0) e += `+(${n3(d)})*clip((t-${n3(k[i][0])})/${n3(Math.max(0.01, k[i + 1][0] - k[i][0]))},0,1)`;
  }
  return e;
}

/** Every file or music layer is brought to this loudness before mixing, so an envelope level means the same for all of them. */
const LAYER_LUFS = -20;

/**
 * A file or music layer, processed (slice, filters, room) and measured once,
 * then cached: returns the processed file and the gain that brings it to
 * LAYER_LUFS. Filters and rooms change loudness a lot (a room can add 15 dB),
 * so without this a muffled copy of a song can come out louder than the clean one.
 */
function levelled(l) {
  const src = l.kind === 'music' ? musicBox(l.tune, { bpm: l.bpm }, CACHE) : l.file;
  const file = join(CACHE, `layer-${hash({ src, from: l.from, len: l.len, hp: l.highpass, lp: l.lowpass, mono: l.mono, filters: l.filters, room: l.room, mix: l.roomMix })}.wav`);
  const meta = file.replace(/\.wav$/, '.json');
  if (!existsSync(meta)) {
    const args = [...(l.from != null ? ['-ss', String(l.from)] : []), ...(l.len != null ? ['-t', String(l.len)] : []), '-i', src];
    let chain = '[0]aformat=sample_rates=48000:channel_layouts=stereo';
    if (l.highpass) chain += `,highpass=f=${l.highpass}`;
    if (l.lowpass) chain += `,lowpass=f=${l.lowpass}`;
    // mono: a single small speaker. filters: any other ffmpeg audio filters (tape wobble, stereo width, pitch…).
    if (l.mono) chain += ',pan=mono|c0=0.5*c0+0.5*c1,pan=stereo|c0=c0|c1=c0';
    if (l.filters) chain += `,${l.filters}`;
    if (l.room) {
      // Play it in a room from the room-sound tool (scripts/make-room-irs.mjs).
      args.push('-i', join(ROOMS, `modelled-${l.room}.wav`));
      const [dry, wet] = l.roomMix ?? [8, 4];
      chain += `[d];[d][1]afir=dry=${dry}:wet=${wet}`;
    }
    // Float, so nothing clips before it's measured.
    ffmpeg([...args, '-filter_complex', chain, '-c:a', 'pcm_f32le', file]);
    const probe = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
    const measured = parseFloat(/"input_i"\s*:\s*"(-?[\d.]+)"/.exec(probe.stderr)?.[1]);
    if (!Number.isFinite(measured)) throw new Error(`Couldn't measure the loudness of ${src}`);
    writeFileSync(meta, JSON.stringify({ lufs: measured, gain: LAYER_LUFS - measured }));
  }
  // sameGainAs: a part of something (the voice split out of a song) gets the gain the whole would get,
  // so the parts keep their balance with each other instead of each being brought to the same loudness.
  if (l.sameGainAs) return { file, gain: levelled({ kind: 'file', file: l.sameGainAs }).gain };
  return { file, gain: JSON.parse(readFileSync(meta, 'utf8')).gain };
}

function soundtrack(card, total, when, file) {
  const inputs = [];
  const filters = [];
  const labels = [];
  const add = (...args) => (inputs.push(...args), inputs.filter((a) => a === '-i').length - 1);
  const noise = (color, amplitude, seed) => add('-t', String(total), '-f', 'lavfi', '-i', `anoisesrc=color=${color}:amplitude=${amplitude}:seed=${seed}:sample_rate=48000`);
  const tone = (expr) => add('-t', String(total), '-f', 'lavfi', '-i', `aevalsrc=exprs='${expr}':s=48000`);
  const mono = 'pan=stereo|c0=c0|c1=c0';

  card.sound.forEach((l, k) => {
    const L = `s${k}`;
    const vol = `volume='${envelope(l.env ?? [[0, l.level ?? 0.3]], when)}':eval=frame`;
    switch (l.kind) {
      // Outside: two decorrelated low noises, slowly gusting.
      case 'wind': {
        const a = noise('brown', 0.6, 11 + k);
        const b = noise('brown', 0.6, 31 + k);
        filters.push(
          `[${a}]highpass=f=50,lowpass=f=420,tremolo=f=0.11:d=0.55,${vol}[${L}l]`,
          `[${b}]highpass=f=50,lowpass=f=380,tremolo=f=0.13:d=0.55,${vol}[${L}r]`,
          `[${L}l][${L}r]join=inputs=2:channel_layout=stereo[${L}]`,
        );
        break;
      }
      // A distant car passing left to right around `at`.
      case 'car': {
        const a = noise('pink', 0.5, 51 + k);
        const at = when(l.at);
        const lvl = l.level ?? 0.55;
        filters.push(
          `[${a}]bandpass=f=420:width_type=h:w=500,lowpass=f=900,asplit=2[${L}a][${L}b]`,
          `[${L}a]volume='${lvl}*exp(-pow((t-${n3(at - 0.4)})/1.1,2))':eval=frame[${L}l]`,
          `[${L}b]volume='${lvl}*exp(-pow((t-${n3(at + 0.4)})/1.1,2))':eval=frame[${L}r]`,
          `[${L}l][${L}r]join=inputs=2:channel_layout=stereo[${L}]`,
        );
        break;
      }
      // Inside: the faint air of a quiet room, so a hush isn't dead silence.
      case 'room': {
        const a = noise('brown', 0.4, 71 + k);
        filters.push(`[${a}]lowpass=f=180,highpass=f=40,${vol},${mono}[${L}]`);
        break;
      }
      // A clock: tick, tock, once a second.
      case 'tick': {
        const a = tone('0.5*sin(2*PI*2300*t)*exp(-110*mod(t,1))+0.35*sin(2*PI*1750*t)*exp(-110*mod(t+0.5,1))');
        filters.push(`[${a}]highpass=f=600,lowpass=f=4200,${vol},${mono}[${L}]`);
        break;
      }
      // A fire: sparse crackles over a low rumble.
      case 'fire': {
        const a = tone('gt(random(0),0.9996)*(random(1)*2-1)');
        const b = noise('brown', 0.5, 91 + k);
        filters.push(
          `[${a}]highpass=f=300,lowpass=f=3200,volume=3[${L}p]`,
          `[${b}]lowpass=f=260,volume=0.5[${L}q]`,
          `[${L}p][${L}q]amix=inputs=2:normalize=0,${vol},${mono}[${L}]`,
        );
        break;
      }
      // Tape or line hiss.
      case 'hiss': {
        const a = noise('white', 0.3, 101 + k);
        filters.push(`[${a}]highpass=f=2500,lowpass=f=11000,${vol},${mono}[${L}]`);
        break;
      }
      // Vinyl crackle: sparse ticks and pops.
      case 'crackle': {
        const a = tone('gt(random(0),0.9992)*(random(1)*2-1)');
        filters.push(`[${a}]highpass=f=700,lowpass=f=7000,volume=2.5,${vol},${mono}[${L}]`);
        break;
      }
      // A radio between stations: rushing static with a wandering whistle.
      case 'static': {
        const a = noise('white', 0.4, 121 + k);
        const b = tone('0.12*sin(2*PI*(900+700*sin(2*PI*0.9*t))*t)');
        filters.push(`[${a}]bandpass=f=1800:width_type=h:w=2600,tremolo=f=6:d=0.7[${L}n]`, `[${L}n][${b}]amix=inputs=2:normalize=0,${vol},${mono}[${L}]`);
        break;
      }
      // A church bell struck at each time in `at` (one time or a list).
      case 'bell': {
        const f = l.pitch ?? 196;
        // [ratio to the strike note, level, how fast it dies]: a bell's partials aren't a tidy harmonic series.
        const parts = [[0.5, 0.6, 1.2], [1, 1, 0.9], [1.19, 0.6, 1.4], [1.5, 0.45, 1.8], [2, 0.5, 2.4], [2.51, 0.3, 3.2], [3.01, 0.2, 4]];
        const strike = (T) => {
          const d = `max(t-${n3(T)},0)`;
          return `gte(t,${n3(T)})*(${parts.map(([r, a, q]) => `${a}*sin(2*PI*${n3(f * r)}*${d})*exp(-${q}*${d})`).join('+')})`;
        };
        const a = tone([l.at].flat().map((x) => strike(when(x))).join('+'));
        filters.push(`[${a}]lowpass=f=5000,volume=${n3((l.level ?? 0.3) * 0.35)},${mono}[${L}]`);
        break;
      }
      // Short beeps at each time in `at`: a smoke alarm chirp (the default), an answerphone tone (freq 1000, dur 0.5).
      case 'beep': {
        const f = l.freq ?? 3100;
        const dur = l.dur ?? 0.12;
        const a = tone([l.at].flat().map((x) => `between(t,${n3(when(x))},${n3(when(x) + dur)})*sin(2*PI*${f}*t)`).join('+'));
        filters.push(`[${a}]volume=${l.level ?? 0.2},${mono}[${L}]`);
        break;
      }
      // A cracker being pulled: one sharp snap at `at`.
      case 'snap': {
        const T = n3(when(l.at));
        const a = tone(`gte(t,${T})*lt(t,${n3(T + 0.09)})*(random(0)*2-1)*exp(-45*max(t-${T},0))`);
        filters.push(`[${a}]highpass=f=900,volume=${l.level ?? 0.5},${mono}[${L}]`);
        break;
      }
      // Someone asleep in a chair between `from` and `to`: slow breaths of low noise. (Crude; a recording would be better.)
      case 'snore': {
        const a = noise('brown', 0.8, 141 + k);
        const [s, e] = [when(l.from), when(l.to)];
        filters.push(`[${a}]bandpass=f=170:width_type=h:w=200,volume='${l.level ?? 0.5}*between(t,${s},${e})*pow(max(sin(2*PI*(t-${s})/${l.breath ?? 1.8}),0),2)':eval=frame,${mono}[${L}]`);
        break;
      }
      // Inside a moving car: road rumble, tyre hiss and windscreen wipers.
      case 'road': {
        const a = noise('brown', 0.7, 161 + k);
        const b = noise('pink', 0.3, 181 + k);
        const c = tone('0.5*sin(2*PI*85*mod(t,1.15))*exp(-28*mod(t,1.15))');
        filters.push(
          `[${a}]lowpass=f=150[${L}n]`,
          `[${b}]bandpass=f=900:width_type=h:w=1200,volume=0.25[${L}h]`,
          `[${c}]lowpass=f=600,volume=${l.wipers === false ? 0 : 0.5}[${L}w]`,
          `[${L}n][${L}h][${L}w]amix=inputs=3:normalize=0,${vol},${mono}[${L}]`,
        );
        break;
      }
      // A knock at the door: three quick raps starting at `at`.
      case 'knock': {
        const at = when(l.at);
        const rap = (k) => {
          const d = `max(t-${n3(at + k * 0.26)},0)`;
          return `gte(t,${n3(at + k * 0.26)})*(sin(2*PI*210*${d})*exp(-55*${d})+0.5*sin(2*PI*640*${d})*exp(-120*${d}))`;
        };
        const a = tone([0, 1, 2].map(rap).join('+'));
        filters.push(`[${a}]lowpass=f=2400,volume=${l.level ?? 0.5},${mono}[${L}]`);
        break;
      }
      // A door: one soft low thud at `at` (opening or closing; pair it with a change in the sound).
      case 'door': {
        const at = when(l.at);
        // max(…,0) keeps the decay from overflowing before the door time.
        const d = `max(t-${at},0)`;
        const a = tone(`gte(t,${at})*(sin(2*PI*62*${d})*exp(-16*${d})+0.4*sin(2*PI*190*${d})*exp(-45*${d}))`);
        filters.push(`[${a}]lowpass=f=900,volume=${l.level ?? 0.5},${mono}[${L}]`);
        break;
      }
      // A music box (see music-box.mjs for tunes), or any audio file: optional slice, filters and a room.
      // To hear a song "through a wall", play the same file twice: once with lowpass ~650 and a room,
      // once clean, and crossfade their envelopes at the door.
      case 'music':
      case 'file': {
        const { file: src, gain } = levelled(l);
        const idx = add('-i', src);
        const delay = Math.round(when(l.at ?? 0) * 1000);
        filters.push(`[${idx}]volume=${gain.toFixed(2)}dB,adelay=${delay}|${delay},${vol}[${L}]`);
        break;
      }
      default:
        throw new Error(`${card.id}: no sound kind "${l.kind}"`);
    }
    labels.push(`[${L}]`);
  });

  const fade = card.fadeOut ?? 2.5;
  // Evening the loudness out would undo a deliberate quiet-then-loud (a song heard through a wall,
  // then in the room), so a card can ask to keep its dynamics and only be stopped from clipping.
  const master = card.wideDynamics ? 'volume=5dB,alimiter=limit=0.89:level=false' : 'loudnorm=I=-20:TP=-1.5:LRA=14';
  filters.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=longest,atrim=0:${n3(total)},afade=t=out:st=${n3(total - fade)}:d=${fade},${master}`);
  ffmpeg([...inputs, '-filter_complex', filters.join(';'), '-ar', '48000', '-ac', '2', ...(file.endsWith('.mp3') ? ['-b:a', '192k'] : []), file]);
}

/**
 * Sound on its own, no picture: for getting a template's sound right before
 * making images for it. `def` is { id, length, marks?, sound, fadeOut?,
 * wideDynamics? }; envelope times can name a mark ('door+1.5') as well as
 * 'start' and 'end'. Writes public/dev-media/sound-lab/<id>.mp3.
 */
export function renderSound(def) {
  const dir = join(MEDIA, 'sound-lab');
  mkdirSync(dir, { recursive: true });
  mkdirSync(CACHE, { recursive: true });
  const when = (v) => {
    if (typeof v === 'number') return v;
    const m = /^([\w-]+?)\s*([+-]\s*[\d.]+)?$/.exec(v);
    const base = m?.[1] === 'end' ? def.length : m?.[1] === 'start' ? 0 : def.marks?.[m?.[1]];
    if (base === undefined) throw new Error(`${def.id}: can't place "${v}" (marks: ${Object.keys(def.marks ?? {}).join(', ') || 'none'}, or start/end)`);
    return n3(base + (m[2] ? parseFloat(m[2].replace(/\s/g, '')) : 0));
  };
  const file = join(dir, `${def.id}.mp3`);
  soundtrack({ id: def.id, sound: def.sound, fadeOut: def.fadeOut ?? 2.5, wideDynamics: def.wideDynamics ?? true }, def.length, when, file);
  return file;
}

/* ---------- The card ---------- */

export async function renderCard(card) {
  const out = join(MEDIA, 'cards', card.id);
  mkdirSync(out, { recursive: true });
  mkdirSync(CACHE, { recursive: true });

  // Timeline: each shot starts where the last ended, minus its dissolve.
  let t = 0;
  const shots = card.shots.map((s, i) => {
    const dissolve = i === 0 ? 0 : (s.dissolve ?? 1.2);
    const start = i === 0 ? 0 : t - dissolve;
    t = start + s.len;
    return { ...s, start: n3(start), dissolve };
  });
  const total = n3(t);
  const byName = Object.fromEntries(shots.map((s) => [s.name, s]));
  /** 12.5, 'kitchen', 'kitchen+1.5', 'end-3' → seconds. */
  const when = (v) => {
    if (typeof v === 'number') return v;
    const m = /^([\w-]+?)\s*([+-]\s*[\d.]+)?$/.exec(v);
    const base = m?.[1] === 'end' ? total : m?.[1] === 'start' ? 0 : byName[m?.[1]]?.start;
    if (base === undefined) throw new Error(`${card.id}: can't place "${v}" (shots: ${shots.map((s) => s.name).join(', ')}, or start/end)`);
    return n3(base + (m[2] ? parseFloat(m[2].replace(/\s/g, '')) : 0));
  };
  const texts = shots.flatMap((s) =>
    (s.text ?? []).map((x) => {
      const tin = n3(s.start + (x.at ?? 0));
      return { ...x, shot: s.name, in: tin, out: x.for == null ? null : n3(tin + x.for), fin: x.fin ?? 1.2, fout: x.fout ?? 1.0 };
    }),
  );

  const images = await Promise.all(shots.map((s) => prepareImage(s, card)));
  await Promise.all(texts.map((x, k) => textPng(join(out, `text-${k}.png`), x)));
  const sound = join(out, 'sound.wav');
  soundtrack(card, total, when, sound);

  // Picture.
  const inputs = [];
  const chains = [];
  const add = (...args) => (inputs.push(...args), inputs.filter((a) => a === '-i').length - 1);
  const still = (file, len) => add('-loop', '1', '-framerate', String(FPS), '-t', String(len), '-i', file);
  shots.forEach((s, i) => {
    const idx = still(images[i].big, s.len);
    const frames = Math.round(s.len * FPS);
    const { from = 1.0, to = 1.07, focal = [0.5, 0.5], centre = false } = s.move ?? {};
    const [fx, fy] = focal;
    // Ease in and out of the move so it starts and ends without a jolt.
    const p = `(0.5-0.5*cos(PI*on/${frames}))`;
    // Where the focal point sits on screen: where it is in the picture, or (centre) drifting to the middle.
    const sx = centre ? `(${fx}+(${0.5 - fx})*${p})` : fx;
    const sy = centre ? `(${fy}+(${0.5 - fy})*${p})` : fy;
    let chain = `[${idx}]zoompan=z='${from}+(${n3(to - from)})*${p}':x='${fx}*iw-${sx}*iw/zoom':y='${fy}*ih-${sy}*ih/zoom':d=1:s=${W}x${H}:fps=${FPS},setsar=1,format=yuv420p`;
    // glow: brighten over the last seconds, to dissolve through light into the next shot.
    if (s.glow) chain += `,eq=brightness='0.2*clip((t-${n3(s.len - s.glow)})/${s.glow},0,1)':saturation='1+0.3*clip((t-${n3(s.len - s.glow)})/${s.glow},0,1)':eval=frame`;
    chains.push(`${chain}[v${i}]`);
  });
  let last = 'v0';
  for (let i = 1; i < shots.length; i++) {
    chains.push(`[${last}][v${i}]xfade=transition=fade:duration=${shots[i].dissolve}:offset=${shots[i].start}[x${i}]`);
    last = `x${i}`;
  }
  texts.forEach((x, k) => {
    const idx = still(join(out, `text-${k}.png`), total);
    // Words that start at 0 are on screen from the very first frame (the TikTok hook), with no fade in.
    const fades = [x.in > 0 ? `fade=t=in:st=${x.in}:d=${x.fin}:alpha=1` : null, x.out != null ? `fade=t=out:st=${n3(x.out - x.fout)}:d=${x.fout}:alpha=1` : null].filter(Boolean).join(',');
    chains.push(`[${idx}]format=rgba${fades ? `,${fades}` : ''}[t${k}]`, `[${last}][t${k}]overlay=0:0:shortest=1[o${k}]`);
    last = `o${k}`;
  });
  const fade = card.fadeOut ?? 2.5;
  // Film grain, a soft vignette, down to black at the end. No fade up: the first frame is the picture and the hook.
  chains.push(`[${last}]noise=alls=7:allf=t+u,vignette=angle=0.55,fade=t=out:st=${n3(total - fade)}:d=${fade},trim=0:${total},format=yuv420p[v]`);
  const audio = add('-i', sound);
  const mp4 = join(out, `${card.id}.mp4`);
  ffmpeg([
    ...inputs,
    '-filter_complex', chains.join(';'),
    '-map', '[v]', '-map', `${audio}:a`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', String(total),
    mp4,
  ]);

  // A contact sheet: one frame per piece of text, at the moment it's fully on screen.
  const moments = texts.map((x) => n3(Math.min(total - 0.2, x.out == null ? x.in + x.fin + 1.5 : (x.in + x.fin + x.out - x.fout) / 2)));
  const sheet = join(out, 'sheet.jpg');
  ffmpeg([
    ...moments.flatMap((m) => ['-ss', String(m), '-i', mp4]),
    '-filter_complex',
    `${moments.map((_, i) => `[${i}:v]trim=end_frame=1,scale=216:384,setsar=1[f${i}]`).join(';')};${moments.map((_, i) => `[f${i}]`).join('')}hstack=inputs=${moments.length}`,
    '-frames:v', '1', sheet,
  ]);

  return { mp4, sheet, total, shots, texts };
}

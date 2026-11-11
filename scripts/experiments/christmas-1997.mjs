#!/usr/bin/env node
/**
 * christmas-1997 — the 45-second "Christmas 1997" video as a real MP4, made
 * locally with ffmpeg (no WaveCanvas, no GPU renders, no cost).
 *
 *   node scripts/experiments/christmas-1997.mjs
 *
 *   0–9 s    Recognition   empty foggy street; wind, a distant car. Hook on screen from frame one.
 *   8–21 s   Familiarity   the house, one window lit by a tree, the TV muffled through the wall;
 *                          the camera pushes into the lit window until it's all warm glow…
 *   20–33 s  Mum           …and through it, her face. Outside falls silent. "You never stayed awake for it,
 *                          either." on her smile, a beat of nothing, then the wish, "with you, Mum." last.
 *   31–37 s  Absence       she fades to the empty chair, captioned "this christmas"; the music begins.
 *   36–45 s  Reflection    back outside, rising away from the house; "some christmases never leave us.";
 *                          the window's light goes out, then black.
 *
 * Street and house images are from the fog set (wavecanvas-christmas public/dev-media/christmas/live).
 * Mum is an Unsplash photo (unsplash/, see prepMum). The TV is the Queen's 1990 message through a wall.
 * Output: public/dev-media/christmas-1997/christmas-1997.mp4 (gitignored).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'public', 'dev-media', 'christmas-1997');
const LIVE = '/Users/will/Documents/wavecanvas-christmas/public/dev-media/christmas/live';
const ROOM = join(ROOT, 'public', 'dev-media', 'room-sound');
const W = 1080;
const H = 1920;
const FPS = 30;
const UP = 3; // zoom on a 3x image so slow moves don't step a pixel at a time
const END = 45;

/** The lit window in memory_08 (fractions of the 1080×1920 frame). */
const WINDOW = { x0: 0.26, x1: 0.455, y0: 0.695, y1: 0.834, focal: [0.356, 0.765] };

/**
 * Shots: when they start, how long they last, the move (zoom from→to, holding
 * the focal point still on screen), how long the dissolve into it takes, and
 * optional extras: `glow` (brighten over the last seconds, to dissolve through
 * light) and `lightsOut` (crossfade to the unlit window between these shot times).
 */
const SHOTS = [
  { img: 'memory_07.jpg', start: 0, len: 9, z: [1.0, 1.07], focal: [0.5, 0.6] }, // empty road, lamps
  // A gentle push only: the source is too soft to zoom into the window.
  { img: 'memory_08.jpg', start: 8, len: 13, z: [1.03, 1.12], focal: WINDOW.focal, xfade: 1.0, glow: 1.8 }, // the house, the lit window
  { img: 'unsplash/mum-memory.jpg', start: 20, len: 13.5, z: [1.0, 1.1], focal: [0.42, 0.3], xfade: 1.4 }, // her face, slowly closer
  { img: 'empty-chair.png', start: 31.5, len: 6, z: [1.06, 1.12], focal: [0.4, 0.72], xfade: 2.0 }, // the empty chair by the window, this Christmas
  { img: 'memory_08.jpg', start: 36, len: 9, z: [1.4, 1.0], focal: WINDOW.focal, xfade: 1.5, lightsOut: [2.9, 5.5] }, // rising away; the light goes out
];

/**
 * Somewhere in December type, by role:
 *  - cinematic (the hook and the closing line): Baskerville, lowercase,
 *    generously spaced, faded cream
 *  - letter (their own words): Georgia Italic, as written, faded cream
 *  - caption (quiet scene labels): a light sans (Avenir Next Light), lowercase,
 *    wide spacing, pale blue-grey
 * Never stark white. Everything sits inside TikTok's safe area: clear of the
 * top bar, the caption and buttons at the bottom (below ~78%) and the button
 * column on the right.
 */
const CREAM = '#EDE4D3';
const BLUE_GREY = '#C8D2D8';
const TYPE = {
  cinematic: { family: 'Baskerville', style: 'normal', weight: 400, size: 70, lh: 1.3, spacing: 4, color: CREAM, opacity: 0.94, lower: true },
  letter: { family: 'Georgia', style: 'italic', weight: 400, size: 60, lh: 1.4, spacing: 0.5, color: CREAM, opacity: 0.92, lower: false },
  caption: { family: 'Avenir Next', style: 'normal', weight: 300, size: 32, lh: 1.4, spacing: 10, color: BLUE_GREY, opacity: 0.8, lower: true },
};

/**
 * `in: 0` means on screen from the very first frame (the TikTok hook), no fade in.
 * `fin`/`fout` are fade lengths (default 2.2 / 1.6 s). The letter is split so
 * "with you, Mum." lands on its own.
 */
const TEXTS = [
  { file: 'text-hook.png', type: 'cinematic', lines: ['If you grew up', 'in Britain in the 90s,', 'you’ll remember this.'], y: 0.3, in: 0, out: 7.6 },
  { file: 'text-caption.png', type: 'caption', lines: ['Christmas Day, 1997'], y: 0.2, in: 9.3, out: 13.2, fin: 1.2, fout: 1.0 },
  // The story: one small, specific thing about her, set up outside while the Queen is on the TV and
  // paid off on her smile; then the wish. (The detail is a stand-in for the buyer's own.)
  { file: 'text-queen.png', type: 'letter', lines: ['You never missed', 'the Queen’s speech.'], y: 0.6, in: 13.6, out: 19.2, fin: 1.2, fout: 1.0 },
  { file: 'text-awake.png', type: 'letter', lines: ['You never stayed awake', 'for it, either.'], y: 0.69, in: 22.0, out: 26.2, fin: 1.0, fout: 1.0, scrim: true },
  { file: 'text-mum-a.png', type: 'letter', lines: ['I wish I could spend', 'just one more Christmas…'], y: 0.69, in: 27.2, out: 30.6, fin: 1.2, fout: 0.9, scrim: true },
  { file: 'text-mum-b.png', type: 'letter', lines: ['with you, Mum.'], y: 0.69, in: 30.8, out: 33.6, fin: 1.0, fout: 1.2, scrim: true },
  // The same caption style, the same place, the other end of the story.
  { file: 'text-now.png', type: 'caption', lines: ['This Christmas'], y: 0.2, in: 33.6, out: 36.6, fin: 0.9, fout: 0.9 },
  { file: 'text-never.png', type: 'cinematic', lines: ['Some Christmases', 'never leave us.'], y: 0.34, in: 37.8, out: null, fin: 2.0 },
];

const run = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
const bigName = (img, suffix = '') => join(OUT, `big-${img.replaceAll('/', '-').replace(/\.\w+$/, '')}${suffix}.jpg`);
const source = (img) => (/^(gen|unsplash)\//.test(img) ? join(OUT, img) : join(LIVE, img));

async function textPng({ file, lines, y, type, scrim }) {
  const t = TYPE[type];
  const lh = t.size * t.lh;
  const top = H * y - ((lines.length - 1) * lh) / 2;
  const tspans = lines
    .map(
      (l, i) =>
        // Spacing adds a gap after the last letter too, so nudge right by half to stay centred.
        `<text x="${W / 2 + t.spacing / 2}" y="${top + i * lh}" text-anchor="middle" font-family="${t.family}" font-style="${t.style}" font-weight="${t.weight}" font-size="${t.size}" letter-spacing="${t.spacing}" fill="${t.color}" fill-opacity="${t.opacity}" filter="url(#s)">${t.lower ? l.toLowerCase() : l}</text>`,
    )
    .join('');
  // A soft dark gradient behind text that sits over a busy picture (fades in and out with the text).
  const shade = scrim
    ? `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.55" stop-color="#000" stop-opacity="0.55"/><stop offset="1" stop-color="#000" stop-opacity="0.7"/></linearGradient>`
    : '';
  const shadeRect = scrim ? `<rect x="0" y="${H * (y - 0.2)}" width="${W}" height="${H * (1.2 - y)}" fill="url(#g)"/>` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${shade}<filter id="s" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="10"/><feComponentTransfer><feFuncA type="linear" slope="0.65"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>${shadeRect}${tspans}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(join(OUT, file));
}

/**
 * Mum's photo: crop to 9:16 above the smartwatch (keeps the top 86%, centred on
 * her face), then grade it as a faded film memory: warm, lifted blacks, softer
 * contrast, a gentle glow, less saturated. Inside and warm, against the cold fog.
 */
function prepMum() {
  const out = join(OUT, 'unsplash', 'mum-memory.jpg');
  if (existsSync(out)) return;
  run([
    '-i', join(OUT, 'unsplash', 'mum.jpg'),
    '-filter_complex',
    [
      "[0]crop=w='ih*0.86*9/16':h='ih*0.86':x='iw*0.45-ih*0.86*9/32':y=0,scale=1080:1920,format=gbrp,split[a][b]",
      '[b]gblur=sigma=30[g]',
      '[a][g]blend=all_mode=screen:all_opacity=0.22,curves=all=0/0.07 0.5/0.5 1/0.93,eq=contrast=0.9:saturation=0.78,colorbalance=rs=0.05:gs=0.01:bs=-0.05:rm=0.04:bm=-0.04:rh=0.02:bh=-0.03,format=yuvj444p',
    ].join(';'),
    out,
  ]);
}

/** The house with its window's light off: the window (and its glow) darkened through a feathered mask. */
async function unlitHouse(big) {
  const out = bigName('memory_08.jpg', '-unlit');
  if (existsSync(out)) return out;
  const w = W * UP;
  const h = H * UP;
  const pad = 0.012;
  const rect = `<rect x="${(WINDOW.x0 - pad) * w}" y="${(WINDOW.y0 - pad) * h}" width="${(WINDOW.x1 - WINDOW.x0 + 2 * pad) * w}" height="${(WINDOW.y1 - WINDOW.y0 + 2 * pad) * h}" fill="#fff"/>`;
  const mask = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#000"/>${rect}</svg>`))
    .blur(26 * UP)
    .extractChannel(0)
    .png()
    .toBuffer();
  const dark = await sharp(big).modulate({ brightness: 0.3, saturation: 0.2 }).removeAlpha().joinChannel(mask).png().toBuffer();
  await sharp(big).composite([{ input: dark }]).jpeg({ quality: 94 }).toFile(out);
  return out;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  prepMum();
  for (const s of SHOTS) {
    const big = bigName(s.img);
    if (!existsSync(big)) await sharp(source(s.img)).resize(W * UP, H * UP, { fit: 'cover', kernel: 'lanczos3' }).jpeg({ quality: 94 }).toFile(big);
  }
  const unlit = await unlitHouse(bigName('memory_08.jpg'));
  for (const t of TEXTS) await textPng(t);

  // ---------- Sound ----------
  const tv = join(OUT, 'tv.wav');
  // The TV: the Queen's 1990 Christmas message (BBC 1, from ~/Downloads; personal test only, not
  // cleared for use), 15 s from 1:40, mid-speech. A small TV speaker (band-limited), through a wall
  // (treble cut, but enough left that her voice is recognisable), in the living room.
  run([
    '-ss', '100', '-t', '15', '-i', join(OUT, 'queen-1990.mp3'),
    '-i', join(ROOM, 'rooms', 'modelled-living-room.wav'),
    '-filter_complex',
    '[0]pan=stereo|c0=c0|c1=c0,highpass=f=200,lowpass=f=3500,lowpass=f=1000,afade=t=in:d=0.3[s];[s][1]afir=dry=6:wet=10[r];[r]lowpass=f=1200,volume=0.9',
    '-ar', '48000', tv,
  ]);

  const sound = join(OUT, 'sound.wav');
  const env = (expr) => `volume='${expr}':eval=frame`;
  // How far "inside" we are: 0 outside, 1 with Mum (20–31.5 s), easing back to 0.4 for the ending.
  const inside = 'clip((t-19.6)/1.2,0,1)-0.6*clip((t-31.5)/2.5,0,1)';
  run([
    '-t', '45', '-f', 'lavfi', '-i', 'anoisesrc=color=brown:amplitude=0.6:seed=11:sample_rate=48000',
    '-t', '45', '-f', 'lavfi', '-i', 'anoisesrc=color=brown:amplitude=0.6:seed=12:sample_rate=48000',
    '-t', '45', '-f', 'lavfi', '-i', 'anoisesrc=color=pink:amplitude=0.5:seed=13:sample_rate=48000',
    '-i', tv,
    '-i', join(ROOM, 'sample-music.mp3'),
    '-t', '45', '-f', 'lavfi', '-i', 'anoisesrc=color=brown:amplitude=0.4:seed=14:sample_rate=48000',
    '-filter_complex',
    [
      // Wind: two decorrelated brown noises, low and slowly gusting. Almost gone while we're inside with her.
      `[0]highpass=f=50,lowpass=f=420,tremolo=f=0.11:d=0.55,${env(`0.5*min(1,0.5+t/2)*(1-0.92*(${inside}))`)}[wl]`,
      `[1]highpass=f=50,lowpass=f=380,tremolo=f=0.13:d=0.55,${env(`0.5*min(1,0.5+t/2)*(1-0.92*(${inside}))`)}[wr]`,
      '[wl][wr]join=inputs=2:channel_layout=stereo[wind]',
      // A distant car passing left to right, around 3–7 s: rumble and a little tyre hiss.
      `[2]bandpass=f=420:width_type=h:w=500,lowpass=f=900,asplit=2[c1][c2]`,
      `[c1]${env('0.55*exp(-pow((t-4.6)/1.1,2))')}[cl]`,
      `[c2]${env('0.55*exp(-pow((t-5.4)/1.1,2))')}[cr]`,
      '[cl][cr]join=inputs=2:channel_layout=stereo[car]',
      // The TV: comes up as the house appears, a little louder as we push towards the window, then
      // cut off as we go through it.
      `[3]adelay=7500|7500,${env('0.55*clip((t-8)/2,0,1)*(1+0.5*clip((t-15)/5,0,1))*clip((20.3-t)/0.6,0,1)')}[tv]`,
      // Inside: the faintest warm room air while we're with her, so the hush isn't dead digital silence.
      `[5]lowpass=f=180,highpass=f=40,${env(`0.12*clip((t-19.8)/1.5,0,1)*clip((32-t)/1.5,0,1)`)},pan=stereo|c0=c0|c1=c0[room]`,
      // The music begins as she fades to the empty chair, and fades with the picture.
      `[4]atrim=0:14,asetpts=PTS-STARTPTS,lowpass=f=7000,adelay=31300|31300,${env('0.55*clip((t-31.3)/3,0,1)*clip((45-t)/2,0,1)')}[mus]`,
      '[wind][car][tv][room][mus]amix=inputs=5:normalize=0:duration=longest,atrim=0:45,afade=t=out:st=42:d=3,loudnorm=I=-20:TP=-1.5:LRA=14',
    ].join(';'),
    '-ar', '48000', '-ac', '2', sound,
  ]);

  // ---------- Picture ----------
  const inputs = [];
  const add = (...args) => (inputs.push(...args), inputs.filter((a) => a === '-i').length - 1);
  const chains = [];
  const still = (file, len) => add('-loop', '1', '-framerate', String(FPS), '-t', String(len), '-i', file);
  const move = (idx, s, label) => {
    const n = s.len * FPS;
    const [z0, z1] = s.z;
    const [fx, fy] = s.focal;
    // Ease in and out of the move so it starts and ends without a jolt.
    const p = `(0.5-0.5*cos(PI*on/${n}))`;
    const z = `${z0}+(${z1 - z0})*${p}`;
    // Where the focal point sits on screen: where it is in the picture, or (centre) drifting to the middle.
    const sx = s.centre ? `(${fx}+(${0.5 - fx})*${p})` : fx;
    const sy = s.centre ? `(${fy}+(${0.5 - fy})*${p})` : fy;
    chains.push(`[${idx}]zoompan=z='${z}':x='${fx}*iw-${sx}*iw/zoom':y='${fy}*ih-${sy}*ih/zoom':d=1:s=${W}x${H}:fps=${FPS},setsar=1,format=yuv420p[${label}]`);
  };
  SHOTS.forEach((s, i) => {
    move(still(bigName(s.img), s.len), s, `m${i}`);
    let cur = `m${i}`;
    if (s.glow) {
      // Into the light: the last seconds brighten and warm, so the dissolve goes through the glow.
      const from = s.len - s.glow;
      chains.push(`[${cur}]eq=brightness='0.2*clip((t-${from})/${s.glow},0,1)':saturation='1+0.3*clip((t-${from})/${s.glow},0,1)':eval=frame[g${i}]`);
      cur = `g${i}`;
    }
    if (s.lightsOut) {
      // The same move on the unlit house, crossfaded in: the window's light goes out.
      move(still(unlit, s.len), s, `u${i}`);
      const [a, b] = s.lightsOut;
      chains.push(`[${cur}][u${i}]blend=all_expr='A*(1-clip((T-${a})/${b - a},0,1))+B*clip((T-${a})/${b - a},0,1)'[l${i}]`);
      cur = `l${i}`;
    }
    chains.push(`[${cur}]null[v${i}]`);
  });
  // Cross-dissolves between shots.
  let last = 'v0';
  for (let i = 1; i < SHOTS.length; i++) {
    chains.push(`[${last}][v${i}]xfade=transition=fade:duration=${SHOTS[i].xfade}:offset=${SHOTS[i].start}[x${i}]`);
    last = `x${i}`;
  }
  // Text, faded in and out.
  TEXTS.forEach((t, k) => {
    const idx = still(join(OUT, t.file), END);
    const fin = t.fin ?? 2.2;
    const fout = t.fout ?? 1.6;
    const fades = [t.in > 0 ? `fade=t=in:st=${t.in}:d=${fin}:alpha=1` : null, t.out ? `fade=t=out:st=${t.out - fout}:d=${fout}:alpha=1` : null].filter(Boolean).join(',');
    chains.push(`[${idx}]format=rgba${fades ? `,${fades}` : ''}[t${k}]`);
    chains.push(`[${last}][t${k}]overlay=0:0:shortest=1[o${k}]`);
    last = `o${k}`;
  });
  // Film grain, a soft vignette, down to black at the end. No fade up: on TikTok the first frame
  // has to be the picture and the hook.
  chains.push(`[${last}]noise=alls=7:allf=t+u,vignette=angle=0.55,fade=t=out:st=42:d=3,trim=0:${END},format=yuv420p[v]`);
  const audio = add('-i', sound);

  const mp4 = join(OUT, 'christmas-1997.mp4');
  run([
    ...inputs,
    '-filter_complex', chains.join(';'),
    '-map', '[v]', '-map', `${audio}:a`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', String(END),
    mp4,
  ]);
  console.log(mp4);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

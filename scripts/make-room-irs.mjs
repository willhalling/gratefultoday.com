#!/usr/bin/env node
/**
 * make-room-irs — models impulse responses for everyday rooms (no recordings,
 * so no licences). Writes 24-bit stereo 48 kHz WAVs to
 * public/dev-media/room-sound/rooms/modelled-<id>.wav.
 *
 *   node scripts/make-room-irs.mjs
 *
 * Each room is a box of real size:
 *  - Early reflections: the image-source method (every wall a mirror) up to
 *    the room's mixing time, each reflection a little later and duller the
 *    more walls it has bounced off, with slight jitter so it doesn't ring.
 *  - Late tail: decorrelated noise in four bands, each dying away at that
 *    band's reverb time (soft rooms lose treble fast, tiled rooms don't),
 *    level-matched to the early reflections and crossfaded in.
 *  - Stereo: two ears/mics 17 cm apart.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 48000;
const C = 343;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'dev-media', 'room-sound', 'rooms');

/** dims [x, y, z] m; src/rx positions; rt = reverb time (s) for [<250 Hz, 250–2k, 2k–6k, >6k]; hf = treble kept per bounce; early = mixing time (s). */
export const ROOMS = [
  { id: 'bedroom', dims: [3.6, 3.2, 2.4], src: [1.2, 1.8, 1.4], rx: [2.6, 1.4, 1.2], rt: [0.4, 0.3, 0.25, 0.18], hf: 0.6, early: 0.04 },
  { id: 'living-room', dims: [5.2, 4.0, 2.5], src: [1.6, 2.2, 1.3], rx: [3.8, 1.9, 1.2], rt: [0.55, 0.45, 0.38, 0.28], hf: 0.7, early: 0.05 },
  { id: 'kitchen', dims: [4.2, 3.0, 2.5], src: [1.3, 1.6, 1.5], rx: [3.0, 1.2, 1.4], rt: [0.6, 0.7, 0.65, 0.5], hf: 0.9, early: 0.05 },
  { id: 'bathroom', dims: [2.6, 2.0, 2.4], src: [0.8, 1.1, 1.6], rx: [1.8, 0.8, 1.5], rt: [1.0, 1.1, 0.95, 0.7], hf: 0.92, early: 0.035 },
  { id: 'hallway', dims: [6.5, 1.2, 2.5], src: [1.5, 0.6, 1.6], rx: [4.5, 0.55, 1.5], rt: [0.8, 0.85, 0.7, 0.5], hf: 0.85, early: 0.07 },
  { id: 'car', dims: [1.9, 1.4, 1.1], src: [0.7, 0.4, 0.75], rx: [1.3, 0.95, 0.7], rt: [0.12, 0.08, 0.06, 0.05], hf: 0.55, early: 0.02 },
  { id: 'village-hall', dims: [16, 9, 5], src: [4, 4.5, 1.6], rx: [11, 5, 1.2], rt: [1.5, 1.3, 1.1, 0.8], hf: 0.85, early: 0.1 },
  { id: 'chapel', dims: [14, 7, 8], src: [3, 3.5, 1.7], rx: [9.5, 3.8, 1.2], rt: [2.6, 2.3, 1.8, 1.2], hf: 0.88, early: 0.12 },
];

// Deterministic randomness, so re-running gives the same files.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r) => Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r());

/** RBJ biquad, applied in place. */
function biquad(x, type, f) {
  const w = (2 * Math.PI * f) / SR;
  const cw = Math.cos(w);
  const al = Math.sin(w) / (2 * Math.SQRT1_2);
  let b0, b1, b2;
  if (type === 'lp') [b0, b1, b2] = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2];
  else [b0, b1, b2] = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2];
  const a0 = 1 + al;
  const a1 = -2 * cw;
  const a2 = 1 - al;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y;
    x[i] = y;
  }
  return x;
}

/** One-pole low-pass, in place. */
function onePole(x, f) {
  const a = Math.exp((-2 * Math.PI * f) / SR);
  let y = 0;
  for (let i = 0; i < x.length; i++) x[i] = y = (1 - a) * x[i] + a * y;
  return x;
}

function earlyReflections(room, rx, len, r) {
  const [Lx, Ly, Lz] = room.dims;
  const V = Lx * Ly * Lz;
  const S = 2 * (Lx * Ly + Lx * Lz + Ly * Lz);
  const alpha = Math.min(0.95, (0.161 * V) / (S * room.rt[1]));
  const beta = Math.sqrt(1 - alpha);
  const maxT = room.early + 0.012;
  const maxN = Math.ceil((maxT * C) / Math.min(Lx, Ly, Lz)) + 1;
  const buckets = Array.from({ length: 8 }, () => new Float32Array(len));
  const [sx, sy, sz] = room.src;
  const img = (n, s, L) => (n % 2 === 0 ? n * L + s : (n + 1) * L - s);
  for (let nx = -maxN; nx <= maxN; nx++) {
    for (let ny = -maxN; ny <= maxN; ny++) {
      for (let nz = -maxN; nz <= maxN; nz++) {
        const order = Math.abs(nx) + Math.abs(ny) + Math.abs(nz);
        const dx = img(nx, sx, Lx) - rx[0];
        const dy = img(ny, sy, Ly) - rx[1];
        const dz = img(nz, sz, Lz) - rx[2];
        const d = Math.hypot(dx, dy, dz);
        let t = d / C;
        if (t > maxT) continue;
        // Real walls aren't perfect mirrors: nudge later reflections a little.
        t += order ? (r() - 0.5) * 0.0006 * Math.min(order, 6) : 0;
        const pos = t * SR;
        const i = Math.floor(pos);
        if (i + 1 >= len) continue;
        const frac = pos - i;
        const amp = beta ** order / Math.max(d, 0.3);
        const b = buckets[Math.min(order, 7)];
        b[i] += amp * (1 - frac);
        b[i + 1] += amp * frac;
      }
    }
  }
  const out = new Float32Array(len);
  buckets.forEach((b, order) => {
    if (order > 0) onePole(b, Math.max(1500, 18000 * room.hf ** order));
    for (let i = 0; i < len; i++) out[i] += b[i];
  });
  return out;
}

function lateTail(room, len, r) {
  const bands = [
    { rt: room.rt[0], f: (x) => biquad(x, 'lp', 250) },
    { rt: room.rt[1], f: (x) => biquad(biquad(x, 'hp', 250), 'lp', 2000) },
    { rt: room.rt[2], f: (x) => biquad(biquad(x, 'hp', 2000), 'lp', 6000) },
    { rt: room.rt[3], f: (x) => biquad(x, 'hp', 6000) },
  ];
  const out = new Float32Array(len);
  for (const band of bands) {
    const n = new Float32Array(len);
    for (let i = 0; i < len; i++) n[i] = gauss(r);
    band.f(n);
    const k = 6.908 / band.rt; // 60 dB down at rt
    for (let i = 0; i < len; i++) out[i] += n[i] * Math.exp((-k * i) / SR);
  }
  return out;
}

const rms = (x, a, b) => {
  let s = 0;
  for (let i = a; i < b; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, b - a));
};

function channel(room, rx, seed) {
  const r = rng(seed);
  const len = Math.round((room.early + 1.5 * Math.max(...room.rt) + 0.05) * SR);
  const early = earlyReflections(room, rx, len, r);
  const tail = lateTail(room, len, r);
  // Match the tail to the early reflections around the mixing time, then crossfade.
  const m = Math.round(room.early * SR);
  const w = Math.round(0.012 * SR);
  const earlyLevel = rms(early, Math.max(0, m - 2 * w), m);
  const tailLevel = rms(tail, Math.max(0, m - 2 * w), m);
  const g = tailLevel > 0 ? earlyLevel / tailLevel : 0;
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const x = Math.min(1, Math.max(0, (i - (m - w)) / w)); // 0 before, 1 after the crossfade
    const fadeIn = Math.sin((x * Math.PI) / 2);
    const fadeOut = Math.cos((x * Math.PI) / 2);
    out[i] = early[i] * fadeOut + tail[i] * g * fadeIn;
  }
  // Fade the last 10% to silence.
  const f = Math.round(len * 0.1);
  for (let i = 0; i < f; i++) out[len - f + i] *= Math.cos(((i + 1) / f) * (Math.PI / 2)) ** 2;
  return out;
}

function wav24(input) {
  // Start just before the direct sound (as recorded IRs are trimmed); the tool's pre-delay adds any gap.
  const onset = Math.min(...input.map((d) => d.findIndex((v) => Math.abs(v) > 1e-6)));
  const chans = input.map((d) => d.subarray(Math.max(0, onset - Math.round(0.001 * SR))));
  const len = chans[0].length;
  const ch = chans.length;
  const peak = Math.max(...chans.map((d) => d.reduce((p, v) => Math.max(p, Math.abs(v)), 0)));
  const scale = peak > 0 ? 0.89 / peak : 1;
  const size = len * ch * 3;
  const b = Buffer.alloc(44 + size);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + size, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(ch, 22);
  b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * ch * 3, 28);
  b.writeUInt16LE(ch * 3, 32);
  b.writeUInt16LE(24, 34);
  b.write('data', 36);
  b.writeUInt32LE(size, 40);
  let o = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < ch; c++) {
      b.writeIntLE(Math.round(Math.max(-1, Math.min(1, chans[c][i] * scale)) * 8388607), o, 3);
      o += 3;
    }
  }
  return b;
}

mkdirSync(OUT, { recursive: true });
ROOMS.forEach((room, n) => {
  const ear = (dx) => [room.rx[0] + dx, room.rx[1], room.rx[2]];
  const left = channel(room, ear(-0.085), 1000 + n * 2);
  const right = channel(room, ear(0.085), 1001 + n * 2);
  const file = join(OUT, `modelled-${room.id}.wav`);
  writeFileSync(file, wav24([left, right]));
  console.log(`${room.id}: ${(left.length / SR).toFixed(2)} s → ${file}`);
});

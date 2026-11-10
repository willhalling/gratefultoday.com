// Ported verbatim from willhalling.com lib/intro/audio.ts (the signature typewriter).
// Keep in sync with that file rather than tuning it here.
/**
 * lib/intro/audio.ts — synthesized sound for the intro. Keystrokes and the
 * resolve tone are generated as PCM directly (no samples, no licensing), at
 * 48 kHz to match the render pipeline, sample-accurate with the typing
 * timeline. All variation derives from spec.jitterSeed via mulberry32, so
 * identical specs produce identical audio.
 *
 * Keystroke model (two voices: 'soft' low-profile laptop keys, 'mechanical' muted linears):
 *   press   — a 2–6 ms band-passed noise click + a noisy low "thock" body
 *             (keycap/case resonance) + a faint plastic ping
 *   release — 55–140 ms later, a quieter, brighter click as the key returns
 *   space   — deeper, longer body plus a tiny stabiliser rattle
 *   return  — the heaviest press, at the resolve, with the chime just after it
 * Each key is panned by its position on a QWERTY board, then the whole bus
 * goes through a few short early reflections (a small desk/room) and a soft
 * tanh limiter. Filters are plain RBJ biquads run in JS, so the output is
 * bit-identical across runs and browsers.
 */
import { createPrng, type IntroTimeline } from './timeline';
import type { IntroSpec } from './types';

export const INTRO_SAMPLE_RATE = 48000;
const SR = INTRO_SAMPLE_RATE;

/** Left/right PCM channels, backed by plain ArrayBuffers (what AudioBuffer.copyToChannel accepts). */
export type Stereo = [Float32Array, Float32Array]; // (willhalling: Float32Array<ArrayBuffer>, needs TS 5.7)
/** Calibrates keystroke loudness (≈ -42 dBFS RMS / -20 dBFS peak at keyVolume 0.5). */
const KEY_LEVEL = 0.32;

// ─── DSP helpers ─────────────────────────────────────────────────────────────

type BiquadKind = 'bandpass' | 'lowpass' | 'highpass';

/** RBJ cookbook biquad, applied in place (fresh state per call → deterministic). */
function biquad(buf: Float32Array, kind: BiquadKind, freq: number, q: number): void {
  const w0 = (2 * Math.PI * Math.min(freq, SR * 0.45)) / SR;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);
  let b0: number, b1: number, b2: number;
  if (kind === 'bandpass') {
    b0 = alpha;
    b1 = 0;
    b2 = -alpha;
  } else if (kind === 'lowpass') {
    b0 = (1 - cos) / 2;
    b1 = 1 - cos;
    b2 = (1 - cos) / 2;
  } else {
    b0 = (1 + cos) / 2;
    b1 = -(1 + cos);
    b2 = (1 + cos) / 2;
  }
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < buf.length; i++) {
    const x = buf[i];
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    buf[i] = y;
  }
}

/** A decaying noise burst: near-instant attack, exponential decay with time constant `tauSec`. */
function noiseBurst(rand: () => number, durSec: number, tauSec: number, attackSec = 0.0004): Float32Array {
  const len = Math.max(1, Math.floor(durSec * SR));
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.min(1, t / attackSec) * Math.exp(-t / tauSec);
    out[i] = (rand() * 2 - 1) * env;
  }
  return out;
}

function peak(buf: Float32Array): number {
  let p = 0;
  for (let i = 0; i < buf.length; i++) p = Math.max(p, Math.abs(buf[i]));
  return p || 1;
}

/** Normalise a burst to a target peak so filter gain differences don't change loudness. */
function normalise(buf: Float32Array, target: number): Float32Array {
  const g = target / peak(buf);
  for (let i = 0; i < buf.length; i++) buf[i] *= g;
  return buf;
}

/** Mix `src` into stereo `out` at `offset` with constant-power pan (-1 left … +1 right). */
function mixPanned(out: Stereo, src: Float32Array, offset: number, gain: number, pan: number): void {
  const angle = ((pan + 1) * Math.PI) / 4;
  const gl = Math.cos(angle) * gain;
  const gr = Math.sin(angle) * gain;
  const n = Math.min(src.length, out[0].length - offset);
  for (let i = 0; i < n; i++) {
    if (offset + i < 0) continue;
    out[0][offset + i] += src[i] * gl;
    out[1][offset + i] += src[i] * gr;
  }
}

// ─── Keyboard geometry (for panning) ─────────────────────────────────────────

const ROWS = ['1234567890-=', 'qwertyuiop[]', "asdfghjkl;'", 'zxcvbnm,./'];

/** Approximate left→right position of a key on a QWERTY board, -1 … +1. */
function keyPan(ch: string): number {
  const c = ch.toLowerCase();
  if (c === ' ') return 0;
  if (c === '\b') return 0.85; // Backspace: top right
  for (let r = 0; r < ROWS.length; r++) {
    const col = ROWS[r].indexOf(c);
    if (col >= 0) {
      const x = (col + r * 0.35) / 11.5; // rows are staggered
      return x * 2 - 1;
    }
  }
  return 0.15; // symbols / unknown: slightly right of centre
}

// ─── Sound events ────────────────────────────────────────────────────────────

type KeyKind = 'key' | 'space' | 'enter';

/** Tunable character of one keyboard. Ranges are [min, max]. */
interface KeyVoice {
  level: number;
  clickHz: [number, number];
  clickTau: [number, number];
  clickPeak: number;
  bodyHz: Record<KeyKind, [number, number]>;
  bodyTau: Record<KeyKind, [number, number]>;
  bodyQ: number;
  bodyPeak: number;
  pingHz: [number, number];
  pingLevel: number;
  releaseHz: [number, number];
  releaseLevel: [number, number];
  dwell: Record<KeyKind, [number, number]>;
  rattlePeak: number;
}

const VOICES: Record<IntroSpec['sound']['keyStyle'], KeyVoice> = {
  // Low-profile laptop keys: crisp, light, short.
  soft: {
    level: 1,
    clickHz: [3000, 4200],
    clickTau: [0.0012, 0.002],
    clickPeak: 0.55,
    bodyHz: { key: [380, 640], space: [170, 250], enter: [200, 260] },
    bodyTau: { key: [0.006, 0.009], space: [0.011, 0.015], enter: [0.012, 0.015] },
    bodyQ: 1.6,
    bodyPeak: 0.42,
    pingHz: [950, 1600],
    pingLevel: 0.05,
    releaseHz: [4200, 5800],
    releaseLevel: [0.3, 0.42],
    dwell: { key: [0.055, 0.11], space: [0.09, 0.14], enter: [0.11, 0.15] },
    rattlePeak: 0.2,
  },
  // Muted mechanical (lubed linear switches): deeper thock, more body, rounder top end.
  mechanical: {
    level: 0.62, // matches the soft voice's loudness, so switching style doesn't change volume
    clickHz: [2400, 3300],
    clickTau: [0.0015, 0.0025],
    clickPeak: 0.45,
    bodyHz: { key: [280, 420], space: [140, 190], enter: [160, 210] },
    bodyTau: { key: [0.01, 0.014], space: [0.015, 0.02], enter: [0.016, 0.02] },
    bodyQ: 1.3,
    bodyPeak: 0.62,
    pingHz: [700, 1100],
    pingLevel: 0.08,
    releaseHz: [3200, 4400],
    releaseLevel: [0.42, 0.55],
    dwell: { key: [0.07, 0.13], space: [0.1, 0.15], enter: [0.12, 0.16] },
    rattlePeak: 0.3,
  },
};

const range = (rand: () => number, [lo, hi]: [number, number]) => lo + rand() * (hi - lo);

/** One key: press (click + thock + ping), then a quieter release click. */
function writeKeystroke(
  out: Stereo,
  offsetSamples: number,
  kind: KeyKind,
  keyPos: number,
  rand: () => number,
  gain: number,
  voice: KeyVoice,
): void {
  const big = kind !== 'key'; // space bar and Return: larger, stabilised keys
  // ±2 dB per-key level variation; big keys land heavier, Return heaviest.
  // KEY_LEVEL keeps the same loudness per volume-slider step as the original synth.
  const weight = kind === 'enter' ? 1.35 : kind === 'space' ? 1.15 : 1;
  const level = gain * KEY_LEVEL * voice.level * Math.pow(10, (rand() * 4 - 2) / 20) * weight;
  // Keep the stereo image narrow: a keyboard in front of you, not a wide piano.
  const pan = keyPos * 0.45 + (rand() - 0.5) * 0.06;

  // Press: crisp band-passed click.
  const click = noiseBurst(rand, 0.008, range(rand, voice.clickTau));
  biquad(click, 'bandpass', range(rand, voice.clickHz) * (big ? 0.75 : 1), 0.9);
  biquad(click, 'highpass', 900, 0.7);
  mixPanned(out, normalise(click, voice.clickPeak), offsetSamples, level, pan);

  // Press: noisy low "thock" body (keycap + case resonance), slightly behind the click.
  const bodyTau = range(rand, voice.bodyTau[kind]);
  const body = noiseBurst(rand, bodyTau * 6, bodyTau, 0.0015);
  biquad(body, 'bandpass', range(rand, voice.bodyHz[kind]), big ? voice.bodyQ + 0.6 : voice.bodyQ);
  biquad(body, 'lowpass', 1800, 0.7);
  mixPanned(out, normalise(body, voice.bodyPeak * (big ? 1.4 : 1)), offsetSamples + Math.floor(0.0006 * SR), level, pan);

  // Press: faint plastic ping (damped sine, random phase) — gives it "object" character.
  const pingHz = range(rand, voice.pingHz);
  const pingLen = Math.floor(0.03 * SR);
  const ping = new Float32Array(pingLen);
  const phase = rand() * Math.PI * 2;
  for (let i = 0; i < pingLen; i++) {
    const t = i / SR;
    ping[i] = Math.sin(2 * Math.PI * pingHz * t + phase) * Math.exp(-t / 0.0045);
  }
  mixPanned(out, ping, offsetSamples, level * voice.pingLevel, pan);

  // Big keys: tiny stabiliser rattle just after the press.
  if (big) {
    const rattle = noiseBurst(rand, 0.006, 0.0009);
    biquad(rattle, 'bandpass', 1700 + rand() * 500, 1.2);
    mixPanned(out, normalise(rattle, voice.rattlePeak), offsetSamples + Math.floor((0.009 + rand() * 0.005) * SR), level, pan + 0.08);
  }

  // Release: the key returning — quieter and brighter.
  const release = noiseBurst(rand, 0.005, 0.0008 + rand() * 0.0005);
  biquad(release, 'bandpass', range(rand, voice.releaseHz), 1.1);
  mixPanned(
    out,
    normalise(release, 0.55),
    offsetSamples + Math.floor(range(rand, voice.dwell[kind]) * SR),
    level * range(rand, voice.releaseLevel),
    pan,
  );
}

/** Return sits at the right edge of the board. */
const ENTER_KEY_POS = 0.9;
/** The Return key bottoms out just before the title appears… */
export const ENTER_LEAD_SEC = 0.035;
/** …and the chime follows a beat after it, so the press reads first. */
const TONE_AFTER_ENTER_SEC = 0.075;

/** Soft two-note chime for the resolve moment: slightly detuned pairs + a little 2nd harmonic. */
function writeResolveTone(
  out: Stereo,
  offsetSamples: number,
  rand: () => number,
  gain: number,
): void {
  const notes = [
    { hz: 659.26, startSec: 0, durSec: 0.55 }, // E5
    { hz: 987.77, startSec: 0.09, durSec: 0.6 }, // B5
  ];
  const level = gain * 0.12;
  for (const note of notes) {
    const start = offsetSamples + Math.floor(note.startSec * SR);
    const len = Math.floor(note.durSec * SR);
    const vibratoHz = 4 + rand() * 1.5;
    const detune = 1 + (1.5 + rand()) / 1200; // ~1.5–2.5 cents, a gentle chorus
    for (let i = 0; i < len; i++) {
      const idx = start + i;
      if (idx >= out[0].length) break;
      const t = i / SR;
      const env = Math.min(1, t / 0.012) * Math.exp(-t * 6);
      const vib = 1 + 0.0015 * Math.sin(2 * Math.PI * vibratoHz * t);
      const a = Math.sin(2 * Math.PI * note.hz * vib * t);
      const b = Math.sin(2 * Math.PI * note.hz * detune * vib * t);
      const h2 = Math.sin(4 * Math.PI * note.hz * t) * 0.12 * Math.exp(-t * 14);
      const s = ((a + b) * 0.5 + h2) * env * level;
      out[0][idx] += s * (1 - 0.08); // a hair wider than mono
      out[1][idx] += s * (1 + 0.08) * 0.92;
    }
  }
}

/** A small room: a few short, filtered early reflections alternating left/right. */
function addEarlyReflections(out: Stereo): void {
  const taps = [
    { ms: 7.3, gain: 0.16, from: 0, to: 1 },
    { ms: 11.9, gain: 0.13, from: 1, to: 0 },
    { ms: 17.6, gain: 0.09, from: 0, to: 1 },
    { ms: 26.1, gain: 0.06, from: 1, to: 0 },
    { ms: 37.4, gain: 0.035, from: 0, to: 0 },
  ];
  const dry: Stereo = [out[0].slice(), out[1].slice()];
  // Reflections lose top end.
  const soft: Stereo = [dry[0].slice(), dry[1].slice()];
  biquad(soft[0], 'lowpass', 3500, 0.7);
  biquad(soft[1], 'lowpass', 3500, 0.7);
  for (const tap of taps) {
    const d = Math.floor((tap.ms / 1000) * SR);
    const src = soft[tap.from];
    const dst = out[tap.to];
    for (let i = d; i < dst.length; i++) dst[i] += src[i - d] * tap.gain;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * One timed sound event on an absolute clock. Scenes emit these (Signature:
 * a key per typed character, a Return press, the resolve tone); the episode
 * Sequence offsets them to absolute time; renderCuesPcm turns them into PCM.
 */
export type AudioCue =
  | { atSec: number; kind: 'key'; ch: string }
  | { atSec: number; kind: 'enter' }
  | { atSec: number; kind: 'tone' };

export type CueSound = Pick<IntroSpec['sound'], 'enabled' | 'keyVolume' | 'toneVolume' | 'keyStyle'>;

/** The signature's cues, from the same typing timeline the visuals use. */
export function signatureCues(spec: IntroSpec, timeline: IntroTimeline): AudioCue[] {
  const cues: AudioCue[] = [];
  // Preroll lines: their keystrokes, then the Backspace presses ('\b').
  for (const seg of timeline.preroll) {
    seg.charTimesSec.forEach((atSec, i) => cues.push({ atSec, kind: 'key', ch: seg.line[i] ?? '' }));
    seg.deleteTimesSec.forEach((atSec) => cues.push({ atSec, kind: 'key', ch: '\b' }));
  }
  timeline.charTimesSec.forEach((atSec, i) => cues.push({ atSec, kind: 'key', ch: spec.line[i] ?? '' }));
  if (!timeline.hasResolve) return cues;
  // The "enter" moment: a heavier Return press as the line resolves, then the chime.
  const enterSec = Math.max(timeline.typeEndSec, timeline.resolveStartSec - ENTER_LEAD_SEC);
  if (spec.sound.enterKey) {
    cues.push({ atSec: enterSec, kind: 'enter' });
    cues.push({ atSec: enterSec + TONE_AFTER_ENTER_SEC, kind: 'tone' });
  } else {
    cues.push({ atSec: timeline.resolveStartSec, kind: 'tone' });
  }
  return cues;
}

/**
 * Pure PCM render (stereo, 48 kHz) of a list of cues — no Web Audio, so it is
 * bit-identical everywhere and the same buffer drives preview and export.
 * Keys run through the small room; tones stay dry. Cues are consumed in array
 * order (callers pass them time-sorted), which fixes the PRNG sequence.
 */
export function renderCuesPcm(cues: AudioCue[], totalSec: number, sound: CueSound, seed: number): Stereo {
  const length = Math.max(1, Math.ceil(totalSec * SR));
  const out: Stereo = [new Float32Array(length), new Float32Array(length)];
  if (!sound.enabled) return out;

  const rand = createPrng(seed ^ 0x9e3779b9);
  const voice = VOICES[sound.keyStyle] ?? VOICES.soft;

  for (const cue of cues) {
    const at = Math.floor(cue.atSec * SR);
    if (cue.kind === 'key') {
      writeKeystroke(out, at, cue.ch === ' ' ? 'space' : 'key', keyPan(cue.ch), rand, sound.keyVolume, voice);
    } else if (cue.kind === 'enter') {
      writeKeystroke(out, at, 'enter', ENTER_KEY_POS, rand, sound.keyVolume, voice);
    }
  }
  addEarlyReflections(out);
  for (const cue of cues) {
    if (cue.kind === 'tone') writeResolveTone(out, Math.floor(cue.atSec * SR), rand, sound.toneVolume);
  }

  // Remove sub-audible rumble, then a soft tanh limiter (transparent below ~-6 dBFS).
  for (const ch of out) {
    biquad(ch, 'highpass', 40, 0.7);
    for (let i = 0; i < ch.length; i++) {
      const x = ch[i];
      ch[i] = Math.abs(x) < 0.5 ? x : Math.sign(x) * (0.5 + 0.5 * Math.tanh((Math.abs(x) - 0.5) / 0.5));
    }
  }

  // Last: a 30 ms fade so a cut-off chime tail never clicks at the hard cut into the video.
  const fadeLen = Math.min(length, Math.floor(0.03 * SR));
  for (const ch of out) {
    for (let i = 0; i < fadeLen; i++) ch[length - 1 - i] *= i / fadeLen;
  }
  return out;
}

/** Signature-only render (the /admin/intro/signature generator). */
export function renderIntroPcm(spec: IntroSpec, timeline: IntroTimeline): Stereo {
  return renderCuesPcm(signatureCues(spec, timeline), timeline.totalSec, spec.sound, spec.jitterSeed);
}

/** Wrap a stereo PCM render in an AudioBuffer (for Web Audio playback and the encoders). */
export function pcmToAudioBuffer([left, right]: Stereo): AudioBuffer {
  const buffer = new AudioBuffer({ length: left.length, numberOfChannels: 2, sampleRate: SR });
  buffer.copyToChannel(left, 0);
  buffer.copyToChannel(right, 1);
  return buffer;
}

/** Synthesize the full soundtrack for a spec + timeline. */
export function synthesizeIntroAudio(spec: IntroSpec, timeline: IntroTimeline): AudioBuffer {
  return pcmToAudioBuffer(renderIntroPcm(spec, timeline));
}


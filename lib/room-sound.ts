/**
 * room-sound — put a recording in a real room by convolving it with an
 * impulse response, in the browser (Web Audio, no server).
 *
 *   source ─┬─ dry ────────────────────────────────────────┬─ makeup ─ out
 *           └─ pre-delay → convolver(IR) → low cut → high cut ─ wet ┘
 *
 * The same graph runs live (AudioContext) for the preview and offline
 * (OfflineAudioContext) for loudness matching and the download. Unlike
 * roughclip's renderSpaceAudio, the download lets the room's tail ring out.
 */

export interface RoomSettings {
  /** 0 = dry, 1 = all room. Equal-power blend, so the middle doesn't dip. */
  amount: number;
  /** Seconds between the direct sound and the room (0–0.1). */
  preDelay: number;
  /** Reverb high cut in Hz: lower = a duller, softer room. */
  highCut: number;
  /** Reverb low cut in Hz: higher = less boom and mud. */
  lowCut: number;
  /** Longest tail in seconds; the IR is faded out by then. */
  tail: number;
}

export const DEFAULT_SETTINGS: RoomSettings = { amount: 0.25, preDelay: 0.012, highCut: 7000, lowCut: 120, tail: 3 };

export const blend = (amount: number) => ({
  dry: Math.cos((amount * Math.PI) / 2),
  wet: Math.sin((amount * Math.PI) / 2),
});

export async function decode(ctx: BaseAudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  return ctx.decodeAudioData(data);
}

/**
 * Prepare an IR for the convolver: fold 4-channel recordings to stereo
 * (W ± Y, as if B-format; a guess, labelled in the UI), shorten the tail
 * with a smooth fade, and normalise its energy so every room sits at a
 * similar level for the same amount.
 */
export function prepareIr(ctx: BaseAudioContext, ir: AudioBuffer, tail: number): AudioBuffer {
  const sr = ir.sampleRate;
  const len = Math.min(ir.length, Math.max(1, Math.round(tail * sr)));
  const src = Array.from({ length: ir.numberOfChannels }, (_, c) => ir.getChannelData(c));
  let chans: Float32Array[];
  if (src.length >= 4) {
    const [w, , y] = src;
    const l = new Float32Array(len);
    const r = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      l[i] = 0.7 * w[i] + 0.5 * y[i];
      r[i] = 0.7 * w[i] - 0.5 * y[i];
    }
    chans = [l, r];
  } else {
    chans = src.slice(0, 2).map((d) => d.slice(0, len));
  }
  // Fade the last 30% (at least 50 ms) so a shortened tail doesn't click.
  const fadeLen = Math.min(len, Math.max(Math.round(0.05 * sr), Math.round(len * 0.3)));
  for (const d of chans) {
    for (let i = 0; i < fadeLen; i++) {
      const g = Math.cos(((i + 1) / fadeLen) * (Math.PI / 2));
      d[len - fadeLen + i] *= g * g;
    }
  }
  let energy = 0;
  for (const d of chans) for (let i = 0; i < len; i++) energy += d[i] * d[i];
  const scale = energy > 0 ? 1 / Math.sqrt(energy / chans.length) : 1;
  const out = ctx.createBuffer(chans.length, len, sr);
  chans.forEach((d, c) => {
    for (let i = 0; i < len; i++) d[i] *= scale;
    out.copyToChannel(d, c);
  });
  return out;
}

/** The wet path for one room. Connect a source to `input`, `output` to the mix. */
export function buildWet(ctx: BaseAudioContext, ir: AudioBuffer | null, s: RoomSettings) {
  const input = ctx.createGain();
  const preDelay = ctx.createDelay(0.2);
  preDelay.delayTime.value = s.preDelay;
  const convolver = ctx.createConvolver();
  convolver.normalize = false;
  if (ir) convolver.buffer = ir;
  const low = ctx.createBiquadFilter();
  low.type = 'highpass';
  low.frequency.value = s.lowCut;
  const high = ctx.createBiquadFilter();
  high.type = 'lowpass';
  high.frequency.value = s.highCut;
  const output = ctx.createGain();
  output.gain.value = ir ? blend(s.amount).wet : 0;
  input.connect(preDelay).connect(convolver).connect(low).connect(high).connect(output);
  return { input, output, preDelay, low, high };
}

/**
 * Render `source[from, from+length)` through a room, offline. `tail` adds
 * that many seconds after the end so the room can ring out.
 */
export async function renderRoom(
  source: AudioBuffer,
  ir: AudioBuffer | null,
  s: RoomSettings,
  opts: { from?: number; length?: number; tail?: number } = {},
): Promise<AudioBuffer> {
  const sr = source.sampleRate;
  const from = opts.from ?? 0;
  const length = opts.length ?? source.duration - from;
  const extra = ir ? (opts.tail ?? 0) : 0;
  const ctx = new OfflineAudioContext(2, Math.max(1, Math.ceil((length + extra) * sr)), sr);
  const node = ctx.createBufferSource();
  node.buffer = source;
  const dry = ctx.createGain();
  dry.gain.value = ir ? blend(s.amount).dry : 1;
  node.connect(dry).connect(ctx.destination);
  if (ir) {
    const wet = buildWet(ctx, ir, s);
    node.connect(wet.input);
    wet.output.connect(ctx.destination);
  }
  node.start(0, from, length);
  return ctx.startRendering();
}

/**
 * Loudness of a buffer, roughly as the ear hears it: RMS after a gentle
 * high-pass (the ear cares little about rumble). Good enough for fair A/B.
 */
export function loudness(buf: AudioBuffer): number {
  let sum = 0;
  let n = 0;
  const a = Math.exp((-2 * Math.PI * 100) / buf.sampleRate);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    let prevX = 0;
    let prevY = 0;
    for (let i = 0; i < d.length; i++) {
      const y = a * (prevY + d[i] - prevX);
      prevX = d[i];
      prevY = y;
      sum += y * y;
      n++;
    }
  }
  return Math.sqrt(sum / Math.max(1, n));
}

/** The gain that makes this room as loud as the dry recording, from a short excerpt. */
export async function makeupGain(source: AudioBuffer, ir: AudioBuffer | null, s: RoomSettings): Promise<number> {
  if (!ir || s.amount === 0) return 1;
  const length = Math.min(8, source.duration);
  const from = Math.max(0, Math.min(source.duration - length, source.duration * 0.3));
  const [dry, wet] = await Promise.all([
    renderRoom(source, null, s, { from, length }),
    renderRoom(source, ir, s, { from, length }),
  ]);
  const ld = loudness(dry);
  const lw = loudness(wet);
  return lw > 0 ? Math.min(4, Math.max(0.25, ld / lw)) : 1;
}

/** Trim silence (below -60 dB) from the end, apply a gain and keep peaks under -1 dBFS. */
export function finish(buf: AudioBuffer, gain: number): { buffer: AudioBuffer; limited: number } {
  const chans = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
  let peak = 0;
  let end = 0;
  const floor = 0.001 / Math.max(gain, 1e-6);
  for (const d of chans) {
    for (let i = 0; i < d.length; i++) {
      const v = Math.abs(d[i]);
      if (v > peak) peak = v;
      if (v > floor && i > end) end = i;
    }
  }
  const ceiling = 0.891; // -1 dBFS
  const g = Math.min(gain, peak > 0 ? ceiling / peak : gain);
  const len = Math.min(buf.length, end + Math.round(0.05 * buf.sampleRate) + 1);
  const out = new AudioBuffer({ numberOfChannels: chans.length, length: len, sampleRate: buf.sampleRate });
  chans.forEach((d, c) => {
    const o = new Float32Array(len);
    for (let i = 0; i < len; i++) o[i] = d[i] * g;
    out.copyToChannel(o, c);
  });
  return { buffer: out, limited: g < gain ? g / gain : 1 };
}

/** 24-bit PCM WAV. */
export function toWav(buf: AudioBuffer): Blob {
  const ch = buf.numberOfChannels;
  const bytes = 3;
  const dataSize = buf.length * ch * bytes;
  const view = new DataView(new ArrayBuffer(44 + dataSize));
  const str = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, ch, true);
  view.setUint32(24, buf.sampleRate, true);
  view.setUint32(28, buf.sampleRate * ch * bytes, true);
  view.setUint16(32, ch * bytes, true);
  view.setUint16(34, 24, true);
  str(36, 'data');
  view.setUint32(40, dataSize, true);
  const data = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < buf.length; i++) {
    for (let c = 0; c < ch; c++) {
      const v = Math.round(Math.max(-1, Math.min(1, data[c][i])) * 8388607);
      view.setUint8(o, v & 0xff);
      view.setUint8(o + 1, (v >> 8) & 0xff);
      view.setUint8(o + 2, (v >> 16) & 0xff);
      o += 3;
    }
  }
  return new Blob([view.buffer], { type: 'audio/wav' });
}

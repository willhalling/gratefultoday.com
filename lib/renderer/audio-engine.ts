/**
 * audio-engine — offline, deterministic replacement for the Remotion audio
 * pipeline (`useAudioData` + `visualizeAudio` from `@remotion/media-utils`,
 * and the Gaussian bass smoothing from
 * remotion/hooks/useVisualizerSetup.ts:39–87).
 *
 * The per-frame spectra replicate `visualizeAudio` exactly so the migrated
 * renderer reacts identically to the current Remotion composition:
 *
 *   - decode at 48000 Hz, channel 0 only
 *   - maxInt = toInt16(max positive sample of channel 0)   (full file, not trim)
 *   - frame f window: 2×N int16 samples centered at (f/fps)·sr — on the
 *     COMPOSITION timeline (actualStart = max(0, start − N), zero-padded
 *     past EOF)
 *   - radix-2 DFT magnitudes (no window function), first N bins
 *   - 3 passes of 3-point moving-average smoothing (edge samples pinned)
 *   - normalised by (2N/2) × maxInt  → N bins, ~0..1
 *   - frame smoothing: mean of frames f−1, f, f+1 per bin
 *
 * IMPORTANT alignment note (Phase 1.1): wavecanvas's useVisualizerSetup calls
 * visualizeAudio WITHOUT dataOffsetInSeconds, so the original visuals sample
 * the UNTRIMMED file at composition time — even when audioTrim shifts what
 * you hear. The analysis here reproduces that exactly (offset 0). (roughclip
 * deliberately trim-offsets its windows; wavecanvas keeps the original
 * behaviour because the parity gate diffs against Remotion renders.) The
 * trim/lead-in placement math that DOES control what you hear lives in
 * lib/renderer/frame-context.ts (audioPlacement), and the muxed audio comes
 * from `trimmedBuffer` below.
 *
 * Gaussian bass smoothing matches wavecanvas's getBackgroundWaveEnergy
 * (useVisualizerSetup.ts:50–87): sampleFrame = max(0, round(frame +
 * offset·fps)) with NO upper clamp — sample frames past the analysed range
 * contribute 0, matching visualizeAudio's zero-padded windows past EOF.
 * (roughclip's port clamped to the last analysed frame instead.)
 */

import { getCachedAnalysis, setCachedAnalysis, type AnalysisCacheKey } from './analysis-cache';
import { analyzeInWorker } from './audio-analysis-worker';

const DEFAULT_DECODE_SAMPLE_RATE = 48000;
const PREVIEW_DECODE_SAMPLE_RATE = 22050;

/**
 * Fetch URL for audio analysis — mirrors getAudioAnalysisUrl(audioUrl, true)
 * in remotion/hooks/useVisualizerSetup.ts:96–109: same-origin URLs pass
 * through, cross-origin ones route through the /api/proxy-audio proxy.
 */
export function resolveAudioFetchUrl(src: string): string {
  if (!src) return src;
  if (src.startsWith('/') && !src.startsWith('//')) return src;
  try {
    const url = new URL(
      src,
      typeof window !== 'undefined' ? window.location.href : 'http://localhost',
    );
    if (typeof window !== 'undefined' && url.origin === window.location.origin) {
      return src;
    }
    return `/api/proxy-audio?url=${encodeURIComponent(src)}`;
  } catch {
    return src;
  }
}

// ─── Decode (cached per URL, like getAudioData's metadataCache) ─────────────

const audioContextsBySampleRate = new Map<number, AudioContext>();
const decodeCache = new Map<string, Promise<AudioBuffer>>();

function getAudioContext(sampleRate = DEFAULT_DECODE_SAMPLE_RATE): AudioContext {
  let ctx = audioContextsBySampleRate.get(sampleRate);
  if (!ctx) {
    ctx = new AudioContext({ sampleRate });
    audioContextsBySampleRate.set(sampleRate, ctx);
  }
  return ctx;
}

function decodeCacheKey(src: string, sampleRate: number): string {
  return `${sampleRate}::${src}`;
}

export function decodeClipAudio(
  src: string,
  preloadedBuffer?: ArrayBuffer,
  sampleRate = DEFAULT_DECODE_SAMPLE_RATE,
): Promise<AudioBuffer> {
  const key = decodeCacheKey(src, sampleRate);
  let cached = decodeCache.get(key);
  if (cached) return cached;

  cached = (async () => {
    const arrayBuffer =
      preloadedBuffer ??
      (await (async () => {
        const response = await fetch(resolveAudioFetchUrl(src));
        if (!response.ok) {
          throw new Error(
            `Failed to fetch audio from ${src}: ${response.status} ${response.statusText}`,
          );
        }
        return response.arrayBuffer();
      })());
    return getAudioContext(sampleRate).decodeAudioData(arrayBuffer);
  })();

  decodeCache.set(key, cached);
  cached.catch(() => decodeCache.delete(key));
  return cached;
}

// ─── FFT (exact-DFT equivalent of @remotion/media-utils fftAccurate) ────────

interface Fft {
  /** Raw DFT magnitudes of the first size/2 bins (no window function). */
  magnitudes(input: Int16Array, out: Float32Array): void;
}

function createFft(size: number): Fft {
  const levels = Math.log2(size);
  const cosTable = new Float32Array(size / 2);
  const sinTable = new Float32Array(size / 2);
  for (let i = 0; i < size / 2; i++) {
    cosTable[i] = Math.cos((-2 * Math.PI * i) / size);
    sinTable[i] = Math.sin((-2 * Math.PI * i) / size);
  }
  const bitReverse = new Uint32Array(size);
  for (let i = 0; i < size; i++) {
    let rev = 0;
    for (let j = 0; j < levels; j++) {
      rev = (rev << 1) | ((i >> j) & 1);
    }
    bitReverse[i] = rev;
  }
  const re = new Float32Array(size);
  const im = new Float32Array(size);

  return {
    magnitudes(input: Int16Array, out: Float32Array): void {
      for (let i = 0; i < size; i++) {
        re[i] = input[i];
        im[i] = 0;
      }
      for (let i = 0; i < size; i++) {
        const j = bitReverse[i];
        if (j > i) {
          const tr = re[i];
          re[i] = re[j];
          re[j] = tr;
          const ti = im[i];
          im[i] = im[j];
          im[j] = ti;
        }
      }
      for (let len = 2; len <= size; len *= 2) {
        const half = len / 2;
        const step = size / len;
        for (let i = 0; i < size; i += len) {
          for (let j = 0; j < half; j++) {
            const k = j * step;
            const tRe = re[i + j + half] * cosTable[k] - im[i + j + half] * sinTable[k];
            const tIm = re[i + j + half] * sinTable[k] + im[i + j + half] * cosTable[k];
            re[i + j + half] = re[i + j] - tRe;
            im[i + j + half] = im[i + j] - tIm;
            re[i + j] += tRe;
            im[i + j] += tIm;
          }
        }
      }
      for (let i = 0; i < size / 2; i++) {
        out[i] = Math.hypot(re[i], im[i]);
      }
    },
  };
}

// ─── visualizeAudio building blocks (ported 1:1) ────────────────────────────

const toInt16 = (x: number): number => (x > 0 ? x * 0x7fff : x * 0x8000);

/**
 * 3 passes of a centred 3-point moving average; edge samples are pinned.
 *
 * Faithful port of @remotion/media-utils' smoothen, including its in-place
 * semantics: one scratch buffer is allocated once, so pass 1 reads the input
 * while writing the scratch, but passes 2–3 read and write the SAME buffer
 * (each written value is immediately visible to the next index — a
 * Gauss–Seidel-style sweep, not a double-buffered one). Allocating a fresh
 * buffer per pass produces visibly different spectra.
 */
function smoothen(array: Float32Array): Float32Array {
  let lastArray = array;
  const newArr = new Float32Array(array.length);
  for (let pass = 0; pass < 3; pass++) {
    const sidePoints = 1;
    const cn = 1 / (2 * sidePoints + 1);
    for (let i = 0; i < sidePoints; i++) {
      newArr[i] = lastArray[i];
      newArr[lastArray.length - i - 1] = lastArray[lastArray.length - i - 1];
    }
    for (let i = sidePoints; i < lastArray.length - sidePoints; i++) {
      let sum = 0;
      for (let n = -sidePoints; n <= sidePoints; n++) {
        sum += cn * lastArray[i + n];
      }
      newArr[i] = sum;
    }
    lastArray = newArr;
  }
  return newArr;
}

function getMaxPossibleMagnitude(channel: Float32Array): number {
  let max = 0;
  for (let i = 0; i < channel.length; i++) {
    const val = channel[i];
    if (val > max) max = val;
  }
  return toInt16(max);
}

/**
 * One frame's spectrum, mirroring getVisualization + the default 3-frame
 * smoothing of `visualizeAudio`. `sampleSize` is 2× the requested bin count.
 */
function visualizeFrameRaw(
  channel: Float32Array,
  sampleRate: number,
  frame: number,
  fps: number,
  offsetSec: number,
  sampleSize: number,
  maxInt: number,
  fft: Fft,
  window_: Int16Array,
  mags: Float32Array,
  out: Float32Array,
): void {
  const start = Math.floor((frame / fps + offsetSec) * sampleRate);
  const actualStart = Math.max(0, start - sampleSize / 2);
  window_.fill(0);
  const available = Math.max(0, Math.min(sampleSize, channel.length - actualStart));
  for (let i = 0; i < available; i++) {
    // Remotion's pipeline routes toInt16 through a Float32Array (.map) before
    // truncating to int16 — the float32 round-trip can shift values sitting
    // near an integer boundary, so replicate it with Math.fround.
    window_[i] = Math.fround(toInt16(channel[actualStart + i]));
  }
  fft.magnitudes(window_, mags);
  const smoothed = smoothen(mags);
  const norm = 1 / (sampleSize / 2) / maxInt;
  for (let i = 0; i < out.length; i++) {
    out[i] = smoothed[i] * norm;
  }
}

// ─── Background wave energy (useVisualizerSetup.ts:39–87) ───────────────────

const WAVE_SMOOTH_HALF_WINDOW_SEC = 0.18; // BACKGROUND_WAVE_SMOOTH_HALF_WINDOW_SEC
const WAVE_SMOOTH_SAMPLES = 9; // BACKGROUND_WAVE_SMOOTH_SAMPLES (odd → centre frame)

/**
 * Gaussian-weighted bass average around `frame`, matching
 * getBackgroundWaveEnergy: sampleFrame = max(0, round(frame + offset·fps))
 * with no upper clamp; sample frames past the end of `bassByFrame`
 * contribute 0 (visualizeAudio zero-pads windows past EOF, so their bass is
 * 0 too).
 */
export function gaussianSmoothBass(
  bassByFrame: ArrayLike<number>,
  frame: number,
  fps: number,
): number {
  const half = (WAVE_SMOOTH_SAMPLES - 1) / 2;
  const sigma = Math.max(1, half / 2);
  let weightedSum = 0;
  let weightTotal = 0;
  for (let i = -half; i <= half; i++) {
    const offsetSec = (i / half) * WAVE_SMOOTH_HALF_WINDOW_SEC;
    const sampleFrame = Math.max(0, Math.round(frame + offsetSec * fps));
    const bass = sampleFrame < bassByFrame.length ? bassByFrame[sampleFrame] : 0;
    const weight = Math.exp(-0.5 * ((i / sigma) * (i / sigma)));
    weightedSum += bass * weight;
    weightTotal += weight;
  }
  return weightTotal > 0 ? weightedSum / weightTotal : 0;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Parity diagnostics: unsmoothed + smoothed magnitudes for one frame. */
export function debugFrameMagnitudes(opts: {
  channel: Float32Array;
  sampleRate: number;
  frame: number;
  fps: number;
  offsetSec: number;
  sampleSize: number;
  maxInt: number;
}): { mags: Float32Array; smoothed: Float32Array; window: Int16Array } {
  const { channel, sampleRate, frame, fps, offsetSec, sampleSize, maxInt } = opts;
  const fft = createFft(sampleSize);
  const window_ = new Int16Array(sampleSize);
  const mags = new Float32Array(sampleSize / 2);
  const start = Math.floor((frame / fps + offsetSec) * sampleRate);
  const actualStart = Math.max(0, start - sampleSize / 2);
  const available = Math.max(0, Math.min(sampleSize, channel.length - actualStart));
  for (let i = 0; i < available; i++) {
    // Same float32 round-trip as visualizeFrameRaw (see its comment).
    window_[i] = Math.fround(toInt16(channel[actualStart + i]));
  }
  fft.magnitudes(window_, mags);
  const smoothed = smoothen(mags);
  const norm = 1 / (sampleSize / 2) / maxInt;
  const out = new Float32Array(smoothed.length);
  for (let i = 0; i < out.length; i++) out[i] = smoothed[i] * norm;
  return { mags, smoothed: out, window: window_ };
}

export function debugMaxInt(channel: Float32Array): number {
  return getMaxPossibleMagnitude(channel);
}

/** Per-frame analysis shared by the pure and browser decode paths. */
export interface ClipAudioFrameData {
  /** 128-bin frequencyData per frame (what `visualizeAudio` returned per
   * composition frame in useVisualizerSetup.ts:187–189). */
  frequencyData: Float32Array[];
  /** Single-frame spectra before temporal smoothing (parity diagnostics). */
  rawFrequencyData: Float32Array[];
  /** Smoothed background wave energy per frame, waveEnergyMultiplier
   * applied, ≤1 (useVisualizerSetup.ts:196–199). */
  backgroundWaveEnergy: number[];
  /** The same smoothed bass energy BEFORE the multiplier and the 0–1 clamp —
   * what `getBackgroundWaveEnergy` returns raw. The composition feeds this
   * (unscaled) to motion effects as `motionWaveEnergy`
   * (VisualizerComposition.tsx:766–768). */
  rawBackgroundWaveEnergy: number[];
  /** toInt16(max positive sample) of the whole file — visualizeAudio's
   * normaliser (useAudioData metadataCache equivalent). */
  maxInt: number;
  fps: number;
  totalFrames: number;
}

/**
 * Pure per-frame analysis from decoded channel data — no AudioContext, no
 * fetch, no DOM. This is the node-testable core (the parity harness feeds it
 * a WAV fixture's PCM directly); `analyzeClipAudio` adds browser decode +
 * the mux buffer on top.
 *
 * Frames are analysed on the COMPOSITION timeline (offset 0) — see the
 * header note. `totalFrames` should be the composition's durationInFrames.
 */
export function analyzeChannelData(opts: {
  channel: Float32Array;
  sampleRate: number;
  fps: number;
  totalFrames: number;
  waveEnergyMultiplier?: number;
}): ClipAudioFrameData {
  const { channel, sampleRate, fps, waveEnergyMultiplier = 1 } = opts;
  const totalFrames = Math.max(1, opts.totalFrames);
  const maxInt = getMaxPossibleMagnitude(channel) || 1;

  // Raw spectra (pre frame-smoothing) for both sample sizes. Magnitude
  // buffers are exactly size/2 long so smoothen() runs over the same length
  // as remotion's fftMag output (a longer zero tail would contaminate the
  // top bins through the in-place smoothing sweeps).
  const fft128 = createFft(256);
  const fft64 = createFft(128);
  const window256 = new Int16Array(256);
  const window128 = new Int16Array(128);
  const mags256 = new Float32Array(128);
  const mags128 = new Float32Array(64);

  // frames f−1 … f+1 are needed for smoothing, and the wave-energy Gaussian
  // reaches ±0.18s further out — analyse a padded frame range.
  const padFrames = 1 + Math.ceil(WAVE_SMOOTH_HALF_WINDOW_SEC * fps);
  const analysedFrames = totalFrames + padFrames;

  const raw128: Float32Array[] = new Array(analysedFrames);
  const rawBass = new Float32Array(analysedFrames); // 64-bin frame-smoothed bass
  const raw64: Float32Array[] = new Array(analysedFrames);

  const scratch128 = new Float32Array(128);
  const scratch64 = new Float32Array(64);

  for (let f = 0; f < analysedFrames; f++) {
    raw128[f] = new Float32Array(128);
    visualizeFrameRaw(
      channel, sampleRate, f, fps, 0, 256, maxInt, fft128, window256, mags256, scratch128,
    );
    raw128[f].set(scratch128);

    raw64[f] = new Float32Array(64);
    visualizeFrameRaw(
      channel, sampleRate, f, fps, 0, 128, maxInt, fft64, window128, mags128, scratch64,
    );
    raw64[f].set(scratch64);
  }

  // Frame smoothing: mean of frames f−1, f, f+1 (visualizeAudio default).
  // The f−1 clamp at frame 0 matches remotion: with offset 0 the frame −1
  // window degenerates to frame 0's window, so clamped == unclamped.
  const smoothed64: Float32Array[] = new Array(analysedFrames);
  for (let f = 0; f < analysedFrames; f++) {
    const prev = raw64[Math.max(0, f - 1)];
    const cur = raw64[f];
    const next = raw64[Math.min(analysedFrames - 1, f + 1)];
    const out = new Float32Array(64);
    for (let i = 0; i < 64; i++) {
      out[i] = (prev[i] + cur[i] + next[i]) / 3;
    }
    smoothed64[f] = out;
    // bassRange: Math.max(1, Math.floor(sampleData.length * 0.12)) with
    // sampleData.length = 64 (useVisualizerSetup.ts:78).
    const bassRange = Math.max(1, Math.floor(64 * 0.12));
    let bassSum = 0;
    for (let i = 0; i < bassRange; i++) bassSum += out[i];
    rawBass[f] = bassSum / bassRange;
  }

  const frequencyData: Float32Array[] = new Array(totalFrames);
  for (let f = 0; f < totalFrames; f++) {
    const prev = raw128[Math.max(0, f - 1)];
    const cur = raw128[f];
    const next = raw128[Math.min(analysedFrames - 1, f + 1)];
    const out = new Float32Array(128);
    for (let i = 0; i < 128; i++) {
      out[i] = (prev[i] + cur[i] + next[i]) / 3;
    }
    frequencyData[f] = out;
  }

  const backgroundWaveEnergy = new Array<number>(totalFrames);
  const rawBackgroundWaveEnergy = new Array<number>(totalFrames);
  for (let f = 0; f < totalFrames; f++) {
    const raw = gaussianSmoothBass(rawBass, f, fps);
    rawBackgroundWaveEnergy[f] = raw;
    backgroundWaveEnergy[f] = Math.min(1, raw * waveEnergyMultiplier);
  }

  return {
    frequencyData,
    rawFrequencyData: raw128,
    backgroundWaveEnergy,
    rawBackgroundWaveEnergy,
    maxInt,
    fps,
    totalFrames,
  };
}

export interface ClipAudioAnalysis extends ClipAudioFrameData {
  /** Full decoded audio @48000 Hz. Null for silent (audio-free) sessions. */
  audioBuffer: AudioBuffer | null;
  /** Trim window with the fade-out baked in — hand straight to mediabunny.
   * Null for silent (audio-free) sessions: the export skips the audio track. */
  trimmedBuffer: AudioBuffer | null;
  /** Preview-only: resolves to real per-frame data when background analysis
   * finishes. When present, the returned analysis is a silent placeholder so
   * the preview can paint frame 0 immediately. */
  realFrameData?: Promise<ClipAudioFrameData>;
}

export async function analyzeClipAudio(opts: {
  audioUrl: string;
  fps: number;
  /** Composition duration in seconds (the composition timeline length). */
  durationSec: number;
  trim?: { start: number; end: number } | null;
  fadeAudio?: boolean;
  fadeOutSec?: number;
  waveEnergyMultiplier?: number;
  /** Optional pre-fetched audio bytes. When provided the engine skips its own
   *  fetch, so callers (e.g. the preview) can share a single download with the
   *  playback <audio> element. */
  audioBuffer?: ArrayBuffer;
  /** Render/export needs the trimmed/faded buffer for muxing; previews only
   *  need the analysis, so skipping this copy saves a lot of init time. */
  includeTrimmedBuffer?: boolean;
  /** Preview mode: decode + analyse at a lower sample rate so the first frame
   *  paints faster. Export keeps the full 48000 Hz analysis for parity. */
  preview?: boolean;
}): Promise<ClipAudioAnalysis> {
  const {
    audioUrl,
    fps,
    durationSec,
    trim = null,
    fadeAudio = false,
    fadeOutSec = 1,
    waveEnergyMultiplier = 1,
    audioBuffer: preloadedAudioBuffer,
    includeTrimmedBuffer = true,
    preview = false,
  } = opts;

  const sampleRate = preview ? PREVIEW_DECODE_SAMPLE_RATE : DEFAULT_DECODE_SAMPLE_RATE;
  const trimStart = trim ? Math.max(0, trim.start) : 0;
  const trimEnd = trim ? Math.min(trim.end, durationSec) : durationSec;
  const totalFrames = Math.max(1, Math.round(durationSec * fps));

  const cacheKey: AnalysisCacheKey = {
    audioUrl,
    fps,
    durationSec,
    sampleRate,
    trimStart,
    trimEnd,
    waveEnergyMultiplier,
  };

  const cachedFrameData = preview ? await getCachedAnalysis(cacheKey) : null;
  if (cachedFrameData && preview) {
    console.log('[audio-engine] analysis cache hit for preview');
  }

  let audioBuffer: AudioBuffer;
  let frameData: ClipAudioFrameData;

  if (cachedFrameData) {
    // Cache hit: we still need a decoded buffer for the playback/mux path,
    // but it can be at the preview sample rate too.
    audioBuffer = await decodeClipAudio(audioUrl, preloadedAudioBuffer, sampleRate);
    frameData = cachedFrameData;
  } else {
    const decodeLabel = preview ? '[audio-engine] preview decode' : '[audio-engine] export decode';
    console.time(decodeLabel);
    audioBuffer = await decodeClipAudio(audioUrl, preloadedAudioBuffer, sampleRate);
    console.timeEnd(decodeLabel);

    const channel = audioBuffer.getChannelData(0);
    const analyzeLabel = preview ? '[audio-engine] preview analyze' : '[audio-engine] export analyze';
    console.time(analyzeLabel);
    frameData = analyzeChannelData({
      channel,
      sampleRate,
      fps,
      totalFrames,
      waveEnergyMultiplier,
    });
    console.timeEnd(analyzeLabel);
    if (preview) {
      void setCachedAnalysis(cacheKey, frameData);
    }
  }

  // ── Trimmed buffer for muxing (fade-out baked in, linear 1→0 like the
  // composition's interpolate volume curve, useVisualizerSetup.ts:146–162) ──
  let trimmedBuffer: AudioBuffer | null = null;
  if (includeTrimmedBuffer) {
    const ctx = getAudioContext(sampleRate);
    const sr = audioBuffer.sampleRate;
    const startSample = Math.floor(trimStart * sr);
    const endSample = Math.min(audioBuffer.length, Math.round(trimEnd * sr));
    const length = Math.max(1, endSample - startSample);
    trimmedBuffer = ctx.createBuffer(audioBuffer.numberOfChannels, length, sr);
    const fadeSec = fadeAudio ? Math.min(Math.max(fadeOutSec, 0), length / sr) : 0;
    const fadeSamples = Math.round(fadeSec * sr);
    const fadeStart = length - fadeSamples;
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      const src = audioBuffer.getChannelData(c);
      const dst = trimmedBuffer.getChannelData(c);
      for (let i = 0; i < length; i++) {
        let gain = 1;
        if (fadeSamples > 0 && i >= fadeStart) {
          gain = Math.max(0, 1 - (i - fadeStart) / fadeSamples);
        }
        dst[i] = src[startSample + i] * gain;
      }
    }
  }

  return {
    ...frameData,
    audioBuffer,
    trimmedBuffer,
  };
}

/**
 * analyzeSilentClip — the audio-free session's synthetic analysis. Same
 * ClipAudioAnalysis shape with flat/zero per-frame data and no buffers:
 * every beat/energy-reactive layer degrades to its beat-less fallback while
 * the deterministic frame clock keeps working. Duration comes from the
 * session timeline, never from a file.
 */
export function analyzeSilentClip(opts: {
  fps: number;
  durationSec: number;
}): ClipAudioAnalysis {
  const { fps, durationSec } = opts;
  const totalFrames = Math.max(1, Math.round(durationSec * fps));
  const padFrames = 1 + Math.ceil(WAVE_SMOOTH_HALF_WINDOW_SEC * fps);
  const analysedFrames = totalFrames + padFrames;

  const zero128 = (): Float32Array => new Float32Array(128);
  const frequencyData: Float32Array[] = new Array(totalFrames);
  const rawFrequencyData: Float32Array[] = new Array(analysedFrames);
  for (let f = 0; f < totalFrames; f++) frequencyData[f] = zero128();
  for (let f = 0; f < analysedFrames; f++) rawFrequencyData[f] = zero128();

  return {
    audioBuffer: null,
    trimmedBuffer: null,
    frequencyData,
    rawFrequencyData,
    backgroundWaveEnergy: new Array<number>(totalFrames).fill(0),
    rawBackgroundWaveEnergy: new Array<number>(totalFrames).fill(0),
    maxInt: 1,
    fps,
    totalFrames,
  };
}

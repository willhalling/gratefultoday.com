/**
 * Audio feature extraction using the Web Audio API and a pure
 * Cooley-Tukey radix-2 FFT.  No external dependencies, no network calls, no AI.
 *
 * Pure data-in/data-out — runs in both the browser (wizard) and Node
 * (Director server-side, via `node-web-audio-api`-decoded buffers).
 * Do NOT add `'use client'` back: the orchestrator imports this on the
 * server and the directive would block that with an RSC error.
 *
 * Call analyzeAudioFeatures(audioBuffer) with an already-decoded AudioBuffer.
 */

export interface AudioFeatures {
  /** RMS-derived loudness category. */
  energy: 'low' | 'mid' | 'high';
  /** Dominant frequency band characteristic. */
  tonalProfile: 'bass-heavy' | 'mid-forward' | 'treble-bright' | 'balanced';
  /** Detected musical key via Krumhansl-Schmuckler chroma correlation. e.g. "G minor" */
  key: string;
  /** Dynamic envelope shape derived from the RMS envelope. */
  songStructure: 'build-up' | 'drop-driven' | 'consistent' | 'minimal';
  /** Normalised (0–1) RMS intensity sampled ~every 0.5 s, max 120 points. For visualising energy over time. */
  intensityCurve: number[];
  /** Timeline-aware structure data for driving scene transitions, camera motion, etc. */
  timeline: MusicTimeline;
  /**
   * Harmonic cut points (seconds) computed with the pastereel.com blue-band
   * flux detector. Used by the showcase gallery scene director.
   */
  cutPoints: number[];
}

// ---------------------------------------------------------------------------
// Timeline-aware structure data
// ---------------------------------------------------------------------------

export type SectionType =
  | 'intro'
  | 'verse'
  | 'pre-chorus'
  | 'chorus'
  | 'bridge'
  | 'drop'
  | 'break'
  | 'outro';

export type EmotionLabel =
  | 'calm'
  | 'reflective'
  | 'melancholic'
  | 'building'
  | 'driving'
  | 'euphoric'
  | 'tense';

export interface SectionSegment {
  type: SectionType;
  /** Section start in seconds. */
  start: number;
  /** Section end in seconds. */
  end: number;
  /** Average normalised (0–1) energy across the section. */
  energy: number;
  /** Coarse emotional label inferred from energy + key + tonal profile. */
  emotion: EmotionLabel;
}

export interface ImpactMoment {
  /** Timestamp in seconds. */
  time: number;
  /** Strength of the impact, 0–1. */
  strength: number;
  /** Coarse classification of the moment. */
  type: 'drop' | 'hit' | 'lift' | 'breakdown';
}

export interface VocalDensityPoint {
  time: number;
  /** Vocal-band energy ratio, 0–1. */
  density: number;
}

export interface EmotionPoint {
  time: number;
  /** -1 (sad) → +1 (happy). */
  valence: number;
  /** 0 (calm) → 1 (intense). */
  arousal: number;
  label: EmotionLabel;
}

export interface MusicTimeline {
  /** Detected song sections with timestamps, energy and emotion. */
  sections: SectionSegment[];
  /** Beat timestamps (seconds). Mirrors output of `computeBpmFromBuffer`. */
  beats: number[];
  /** Downbeat timestamps (seconds). Assumes 4/4 unless `beatsPerBar` overridden. */
  bars: number[];
  /** Drop / impact moments — useful for syncing dramatic camera or scene cuts. */
  impacts: ImpactMoment[];
  /** Vocal-band density per ~0.5 s frame. */
  vocalDensity: VocalDensityPoint[];
  /** Emotional progression sampled per ~2 s. */
  emotionalTimeline: EmotionPoint[];
}

// ---------------------------------------------------------------------------
// Krumhansl-Schmuckler key-finding profiles
// ---------------------------------------------------------------------------
const KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KS_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, da2 = 0, db2 = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma;
    const db = b[i] - mb;
    num += da * db;
    da2 += da * da;
    db2 += db * db;
  }
  return da2 && db2 ? num / Math.sqrt(da2 * db2) : 0;
}

// ---------------------------------------------------------------------------
// Cooley-Tukey radix-2 FFT — in-place, length must be a power of 2
// ---------------------------------------------------------------------------
function fftInPlace(re: Float32Array, im: Float32Array): void {
  const n = re.length;

  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }

  // Butterfly stages
  for (let len = 2; len <= n; len <<= 1) {
    const ang  = (-2 * Math.PI) / len;
    const cos0 = Math.cos(ang);
    const sin0 = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < half; k++) {
        const ur = re[i + k];
        const ui = im[i + k];
        const vr = re[i + k + half] * cr - im[i + k + half] * ci;
        const vi = re[i + k + half] * ci + im[i + k + half] * cr;
        re[i + k]        = ur + vr;
        im[i + k]        = ui + vi;
        re[i + k + half] = ur - vr;
        im[i + k + half] = ui - vi;
        const nr = cr * cos0 - ci * sin0;
        ci = cr * sin0 + ci * cos0;
        cr = nr;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Harmonic cut-point detector (mirrors pastereel.com/cut-point-finder.html)
// ---------------------------------------------------------------------------

interface HarmonicCutOptions {
  /** 0.3 (sparse) .. 1.0 (dense). Default 0.7 matches pastereel "balanced". */
  intensity?: number;
  spacingScale?: number;
  thresholdTrim?: number;
  earlyBoost?: number;
  timingOffsetMs?: number;
  minConfidence?: number;
  beatAssist?: number;
  beatToleranceMs?: number;
}

const HARMONIC_CUT_PRESETS: Record<string, Required<HarmonicCutOptions>> = {
  balanced: {
    intensity: 0.7,
    spacingScale: 1.0,
    thresholdTrim: 0.0,
    earlyBoost: 1.0,
    timingOffsetMs: -20,
    minConfidence: 0.35,
    beatAssist: 0.35,
    beatToleranceMs: 80,
  },
  dense: {
    intensity: 0.7,
    spacingScale: 0.82,
    thresholdTrim: -0.05,
    earlyBoost: 1.0,
    timingOffsetMs: -10,
    minConfidence: 0.24,
    beatAssist: 0.2,
    beatToleranceMs: 60,
  },
  sparse: {
    intensity: 0.7,
    spacingScale: 1.35,
    thresholdTrim: 0.05,
    earlyBoost: 0.35,
    timingOffsetMs: -25,
    minConfidence: 0.48,
    beatAssist: 0.5,
    beatToleranceMs: 95,
  },
  punchy: {
    intensity: 0.7,
    spacingScale: 1.18,
    thresholdTrim: 0.09,
    earlyBoost: 0.0,
    timingOffsetMs: -35,
    minConfidence: 0.58,
    beatAssist: 0.75,
    beatToleranceMs: 70,
  },
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.max(0, Math.min(sortedAsc.length - 1, Math.floor(sortedAsc.length * p)));
  return sortedAsc[idx];
}

function estimateBeatGridFromFlux(smoothedFlux: Float32Array, sampleRate: number, hop: number) {
  if (!smoothedFlux || smoothedFlux.length < 32) return null;

  const minBpm = 70;
  const maxBpm = 170;
  const minLag = Math.max(2, Math.round((sampleRate / hop) * (60 / maxBpm)));
  const maxLag = Math.min(smoothedFlux.length - 2, Math.round((sampleRate / hop) * (60 / minBpm)));
  if (maxLag <= minLag) return null;

  let bestLag = minLag;
  let bestCorr = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let dot = 0;
    let e1 = 0;
    let e2 = 0;
    for (let i = 0; i < smoothedFlux.length - lag; i++) {
      const a = smoothedFlux[i];
      const b = smoothedFlux[i + lag];
      dot += a * b;
      e1 += a * a;
      e2 += b * b;
    }
    const corr = dot / Math.max(1e-9, Math.sqrt(e1 * e2));
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  let bestPhase = 0;
  let bestPhaseScore = -Infinity;
  for (let phase = 0; phase < bestLag; phase++) {
    let score = 0;
    for (let i = phase; i < smoothedFlux.length; i += bestLag) {
      score += smoothedFlux[i];
    }
    if (score > bestPhaseScore) {
      bestPhaseScore = score;
      bestPhase = phase;
    }
  }

  const bpm = (60 * sampleRate) / (hop * bestLag);
  return { lagCols: bestLag, phaseCol: bestPhase, bpm, confidence: clamp01(bestCorr) };
}

/**
 * Compute harmonic cut points from a mono audio buffer using the same
 * blue-band flux detector as pastereel.com/cut-point-finder.html.
 */
export function computeHarmonicCutPoints(
  mono: Float32Array,
  sampleRate: number,
  duration: number,
  preset: 'balanced' | 'dense' | 'sparse' | 'punchy' = 'balanced',
): number[] {
  const opts = HARMONIC_CUT_PRESETS[preset];

  const FFT_SIZE = 2048;
  const HALF = FFT_SIZE >> 1;
  const HOP = 1024;
  const binHz = sampleRate / FFT_SIZE;

  const blueStart = Math.max(1, Math.round((sampleRate * 0.165) / binHz));
  const blueEnd = Math.min(HALF, Math.round((sampleRate * 0.25) / binHz));

  const columns = Math.max(1, Math.floor((mono.length - FFT_SIZE) / HOP) + 1);
  const blueBand = new Float32Array(columns);
  const blueFlux = new Float32Array(columns);

  const window_ = new Float32Array(FFT_SIZE);
  for (let i = 0; i < FFT_SIZE; i++) {
    window_[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1));
  }

  const prevMag = new Float32Array(HALF);
  const re = new Float32Array(FFT_SIZE);
  const im = new Float32Array(FFT_SIZE);

  for (let col = 0; col < columns; col++) {
    const start = col * HOP;
    const frameEnd = Math.min(mono.length, start + FFT_SIZE);

    for (let i = 0; i < FFT_SIZE; i++) {
      re[i] = i < frameEnd - start ? mono[start + i] * window_[i] : 0;
      im[i] = 0;
    }

    fftInPlace(re, im);

    let blue = 0;
    let blueRise = 0;
    for (let k = 1; k < HALF; k++) {
      const mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      if (k >= blueStart && k <= blueEnd) {
        blue += mag;
        const d = mag - prevMag[k];
        if (d > 0) blueRise += d;
      }
      prevMag[k] = mag;
    }
    blueBand[col] = blue;
    blueFlux[col] = blueRise;
  }

  // Smooth flux
  const smoothedFlux = new Float32Array(columns);
  for (let i = 0; i < columns; i++) {
    const prev = i > 0 ? blueFlux[i - 1] : blueFlux[i];
    const curr = blueFlux[i];
    const next = i < columns - 1 ? blueFlux[i + 1] : blueFlux[i];
    smoothedFlux[i] = prev * 0.25 + curr * 0.5 + next * 0.25;
  }

  // Robust normalisation via percentiles
  const sortedFlux = Array.from(smoothedFlux).sort((a, b) => a - b);
  const p95 = percentile(sortedFlux, 0.95) || 1;

  const sortedBlue = Array.from(blueBand).sort((a, b) => a - b);
  const p90BlueIndex = Math.max(0, Math.min(sortedBlue.length - 1, Math.floor(sortedBlue.length * 0.9)));
  const blueRef = Math.max(sortedBlue[p90BlueIndex] || 0, 1e-6);

  const intensity = opts.intensity;
  const normalizedThresh = Math.max(0.12, Math.min(0.95, 0.82 - intensity * 0.47 + opts.thresholdTrim));
  const fluxThresh = p95 * normalizedThresh;
  const visibleGate = Math.max(0.05, Math.min(0.95, 0.36 - intensity * 0.2 + opts.thresholdTrim * 0.6));
  const minGapSec = Math.max(0.2, (0.56 - intensity * 0.3) * opts.spacingScale);
  const minGapCols = Math.round((minGapSec * sampleRate) / HOP);
  const earlyWindowCols = Math.round((13 * sampleRate) / HOP);
  const earlyFluxRelax = 1 - 0.14 * opts.earlyBoost;
  const earlyVisibleRelax = 1 - 0.18 * opts.earlyBoost;

  const beatGrid = estimateBeatGridFromFlux(smoothedFlux, sampleRate, HOP);
  const beatToleranceCols = Math.max(1, Math.round((opts.beatToleranceMs / 1000) * sampleRate / HOP));

  const nearestBeatDistanceCols = (col: number): number => {
    if (!beatGrid) return Infinity;
    const rel = col - beatGrid.phaseCol;
    const mod = ((rel % beatGrid.lagCols) + beatGrid.lagCols) % beatGrid.lagCols;
    return Math.min(mod, beatGrid.lagCols - mod);
  };

  const nearestBeatCol = (col: number): number => {
    if (!beatGrid) return col;
    const k = Math.round((col - beatGrid.phaseCol) / beatGrid.lagCols);
    return Math.max(0, Math.min(columns - 1, Math.round(beatGrid.phaseCol + k * beatGrid.lagCols)));
  };

  const colToTime = (c: number): number => (c * HOP) / sampleRate;

  const nextCutPoints: number[] = [];
  let lastSpike = -minGapCols;
  const snapWindowCols = 2;

  for (let i = 1; i < smoothedFlux.length - 1; i++) {
    const earlyRelax = i < earlyWindowCols ? earlyFluxRelax : 1;
    const isRisingPeak =
      smoothedFlux[i] > fluxThresh * earlyRelax &&
      smoothedFlux[i] >= smoothedFlux[i - 1] &&
      smoothedFlux[i] >= smoothedFlux[i + 1];

    const visibleRelax = i < earlyWindowCols ? earlyVisibleRelax : 1;
    const isVisible = blueBand[i] / blueRef >= visibleGate * visibleRelax;

    if (isRisingPeak && isVisible && i - lastSpike >= minGapCols) {
      let refinedCol = i;
      let bestScore = -Infinity;
      const lo = Math.max(1, i - snapWindowCols);
      const hi = Math.min(smoothedFlux.length - 2, i + snapWindowCols);
      for (let j = lo; j <= hi; j++) {
        const score = blueFlux[j] * 0.65 + smoothedFlux[j] * 0.35;
        if (score > bestScore) {
          bestScore = score;
          refinedCol = j;
        }
      }

      const adjustedTime = colToTime(refinedCol) + opts.timingOffsetMs / 1000;
      const clampedTime = Math.max(0, Math.min(duration, adjustedTime));

      const fluxRatio = p95 > 0 ? smoothedFlux[refinedCol] / p95 : 0;
      const fluxConfidence = clamp01((fluxRatio - 0.75) / 0.75);
      const visibilityRatio = blueRef > 0 ? blueBand[refinedCol] / blueRef : 0;
      const visibilityConfidence = clamp01((visibilityRatio - visibleGate) / Math.max(0.1, 1 - visibleGate));
      const localPrev = smoothedFlux[Math.max(0, refinedCol - 1)] || 0;
      const localNext = smoothedFlux[Math.min(smoothedFlux.length - 1, refinedCol + 1)] || 0;
      const peakSharpness = clamp01(
        (smoothedFlux[refinedCol] - Math.max(localPrev, localNext)) / Math.max(1e-6, smoothedFlux[refinedCol]),
      );
      const beatDistCols = nearestBeatDistanceCols(refinedCol);
      const beatCloseness = beatGrid
        ? clamp01(1 - beatDistCols / Math.max(1, beatToleranceCols))
        : 0;
      const beatConfidence = beatCloseness * opts.beatAssist * (beatGrid ? beatGrid.confidence : 0);
      const confidence = clamp01(
        fluxConfidence * 0.45 + visibilityConfidence * 0.32 + peakSharpness * 0.13 + beatConfidence * 0.1,
      );

      if (confidence < opts.minConfidence) continue;

      let finalTime = clampedTime;
      if (beatGrid && opts.beatAssist > 0 && beatDistCols <= beatToleranceCols) {
        const targetBeatCol = Math.max(0, Math.min(columns - 1, nearestBeatCol(refinedCol)));
        const targetBeatTime = colToTime(targetBeatCol);
        const blend = Math.max(0, Math.min(0.35, opts.beatAssist * 0.35));
        finalTime = clampedTime * (1 - blend) + targetBeatTime * blend;
      }

      nextCutPoints.push(parseFloat(Math.max(0, Math.min(duration, finalTime)).toFixed(3)));
      lastSpike = refinedCol;
    }
  }

  // Merge points that are too close (keep first, like pastereel normalizeCutPoints).
  // Do NOT filter by position — pastereel keeps cuts across the whole timeline.
  const sorted = nextCutPoints
    .filter((t) => Number.isFinite(t))
    .map((t) => parseFloat(t.toFixed(3)))
    .sort((a, b) => a - b);
  const merged: number[] = [];
  for (const point of sorted) {
    const previous = merged[merged.length - 1];
    if (previous !== undefined && point - previous < minGapSec) {
      continue;
    }
    merged.push(point);
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Compute audio features from a decoded AudioBuffer entirely on the client —
 * no network calls and no AI inference.
 *
 * Extracts: energy (RMS), tonal profile (FFT band ratios), musical key
 * (Krumhansl-Schmuckler chroma), song structure (RMS envelope shape), and a
 * timeline-aware structure object (sections, bars, impacts, vocal density,
 * emotional progression) for driving renderer-side motion, camera, etc.
 *
 * @param audioBuffer Already-decoded audio buffer to analyse.
 * @param opts.beats  Optional beat-grid timestamps from BPM analysis. Used
 *                    to derive bar (downbeat) timestamps in the timeline.
 *                    If omitted, `timeline.beats` and `timeline.bars` are
 *                    empty arrays.
 */
export async function analyzeAudioFeatures(
  audioBuffer: AudioBuffer,
  opts: { beats?: number[]; beatsPerBar?: number } = {},
): Promise<AudioFeatures> {
  const { sampleRate, length, numberOfChannels } = audioBuffer;
  const duration = length / sampleRate;

  // Mix all channels to mono
  const mono = new Float32Array(length);
  for (let ch = 0; ch < numberOfChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) mono[i] += data[i] / numberOfChannels;
  }

  const FFT_SIZE = 4096;
  const HALF    = FFT_SIZE >> 1;
  // Advance ~0.5 s per frame (but never less than one FFT window)
  const HOP    = Math.max(FFT_SIZE, Math.floor(sampleRate * 0.5));
  const binHz  = sampleRate / FFT_SIZE;

  // Frequency bin limits for tonal bands
  const bassLimit   = Math.max(1, Math.floor(250  / binHz));          // 0–250 Hz
  const midLimit    = Math.min(HALF - 1, Math.floor(4000 / binHz));   // 250–4000 Hz
  // treble: [midLimit, HALF)

  // Vocal-band limits (~300 Hz – 3 kHz) for vocal-density timeline
  const vocalLoLimit = Math.max(1, Math.floor(300  / binHz));
  const vocalHiLimit = Math.min(HALF - 1, Math.floor(3000 / binHz));

  // Hann window coefficients
  const hann = Float32Array.from({ length: FFT_SIZE }, (_, i) =>
    0.5 * (1 - Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1))));

  // Accumulators
  const chroma = new Float32Array(12);
  let bassAcc = 0, midAcc = 0, trebleAcc = 0;
  const rmsWindows: number[] = [];
  const vocalEnergyPerFrame: number[] = [];
  const totalSpectralEnergyPerFrame: number[] = [];

  const re = new Float32Array(FFT_SIZE);
  const im = new Float32Array(FFT_SIZE);

  for (let offset = 0; offset + FFT_SIZE <= length; offset += HOP) {
    let rmsSum = 0;
    for (let i = 0; i < FFT_SIZE; i++) {
      const s = mono[offset + i];
      rmsSum  += s * s;
      re[i]    = s * hann[i];
      im[i]    = 0;
    }
    rmsWindows.push(Math.sqrt(rmsSum / FFT_SIZE));

    fftInPlace(re, im);

    let frameVocal = 0;
    let frameTotal = 0;
    for (let k = 1; k < HALF; k++) {
      const mag  = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      const freq = k * binHz;

      if (k < bassLimit)     bassAcc   += mag;
      else if (k < midLimit) midAcc    += mag;
      else                   trebleAcc += mag;

      // Per-frame totals for the vocal-density timeline
      frameTotal += mag;
      if (k >= vocalLoLimit && k < vocalHiLimit) frameVocal += mag;

      // Chroma: map frequency to pitch class (A4 = 440 Hz = MIDI 69)
      if (freq >= 55 && freq <= 6000) {
        const midi = Math.round(12 * Math.log2(freq / 440) + 69);
        const pc   = ((midi % 12) + 12) % 12;
        chroma[pc] += mag;
      }
    }

    vocalEnergyPerFrame.push(frameVocal);
    totalSpectralEnergyPerFrame.push(frameTotal);
  }

  const frameCount = rmsWindows.length || 1;

  // ── Energy from average RMS ─────────────────────────────────────────────
  const rmsAvg = rmsWindows.reduce((s, v) => s + v, 0) / frameCount;
  const energy: AudioFeatures['energy'] =
    rmsAvg < 0.05 ? 'low' : rmsAvg < 0.18 ? 'mid' : 'high';

  // ── Tonal profile — per-bin-average power in each frequency band ────────
  const bassNorm   = bassAcc   / bassLimit;
  const midNorm    = midAcc    / Math.max(midLimit - bassLimit, 1);
  const trebleNorm = trebleAcc / Math.max(HALF - midLimit, 1);
  const bands      = [bassNorm, midNorm, trebleNorm];
  const sorted     = [...bands].sort((a, b) => b - a);
  const dominance  = sorted[0] / Math.max(sorted[1], 1e-9);

  let tonalProfile: AudioFeatures['tonalProfile'];
  if (dominance < 1.4) {
    tonalProfile = 'balanced';
  } else {
    const domIdx = bands.indexOf(sorted[0]);
    tonalProfile = domIdx === 0 ? 'bass-heavy' : domIdx === 1 ? 'mid-forward' : 'treble-bright';
  }

  // ── Key via Krumhansl-Schmuckler correlation ────────────────────────────
  const chromaArr = Array.from(chroma);
  let bestCorr = -Infinity;
  let bestRoot = 0;
  let bestMode = 'major';

  for (let root = 0; root < 12; root++) {
    const rotated = Array.from({ length: 12 }, (_, i) => chromaArr[(i + root) % 12]);
    const majCorr = pearson(rotated, KS_MAJOR);
    const minCorr = pearson(rotated, KS_MINOR);
    if (majCorr > bestCorr) { bestCorr = majCorr; bestRoot = root; bestMode = 'major'; }
    if (minCorr > bestCorr) { bestCorr = minCorr; bestRoot = root; bestMode = 'minor'; }
  }

  const key = `${NOTE_NAMES[bestRoot]} ${bestMode}`;

  // ── Song structure from RMS envelope shape ──────────────────────────────
  const N = rmsWindows.length;
  let songStructure: AudioFeatures['songStructure'];

  if (N === 0 || rmsAvg < 0.03) {
    songStructure = 'minimal';
  } else {
    const seg    = Math.max(1, Math.floor(N / 4));
    const q1Avg  = rmsWindows.slice(0, seg).reduce((s, v) => s + v, 0) / seg;
    const q4Avg  = rmsWindows.slice(-seg).reduce((s, v) => s + v, 0) / seg;
    const peak   = Math.max(...rmsWindows);
    const peakIdx = rmsWindows.indexOf(peak);

    if (q4Avg > q1Avg * 1.4) {
      songStructure = 'build-up';
    } else if (peakIdx > N * 0.40 && peakIdx < N * 0.75 && q4Avg < peak * 0.65) {
      songStructure = 'drop-driven';
    } else {
      songStructure = 'consistent';
    }
  }

  // ── Intensity curve — normalised RMS over time (max 120 points) ───────────
  // Apply a 3-point moving average to smooth out brief transient spikes,
  // then normalise to 0–1 and downsample so the chart stays responsive.
  const smoothed = rmsWindows.map((v, i) => {
    const a = rmsWindows[Math.max(0, i - 1)];
    const b = v;
    const c = rmsWindows[Math.min(rmsWindows.length - 1, i + 1)];
    return (a + b + c) / 3;
  });
  const maxRms = Math.max(...smoothed, 1e-9);
  const targetPoints = Math.min(smoothed.length, 120);
  const intensityCurve: number[] = [];
  for (let i = 0; i < targetPoints; i++) {
    const srcIdx = Math.min(
      Math.round((i / Math.max(targetPoints - 1, 1)) * (smoothed.length - 1)),
      smoothed.length - 1,
    );
    intensityCurve.push(smoothed[srcIdx] / maxRms);
  }

  // ── Build timeline (sections, bars, impacts, vocal density, emotion) ────
  const frameDur = HOP / sampleRate;                       // seconds per frame
  const normEnergy = smoothed.map((v) => v / maxRms);      // 0–1 envelope
  const timeline = buildTimeline({
    duration,
    frameDur,
    normEnergy,
    vocalEnergyPerFrame,
    totalSpectralEnergyPerFrame,
    keyMode: bestMode as 'major' | 'minor',
    tonalProfile,
    beats: opts.beats,
    beatsPerBar: opts.beatsPerBar ?? 4,
  });

  const cutPoints = computeHarmonicCutPoints(mono, sampleRate, duration);

  return { energy, tonalProfile, key, songStructure, intensityCurve, timeline, cutPoints };
}

// ---------------------------------------------------------------------------
// Timeline derivation helpers
// ---------------------------------------------------------------------------

interface BuildTimelineArgs {
  duration: number;
  frameDur: number;
  normEnergy: number[];
  vocalEnergyPerFrame: number[];
  totalSpectralEnergyPerFrame: number[];
  keyMode: 'major' | 'minor';
  tonalProfile: AudioFeatures['tonalProfile'];
  beats?: number[];
  beatsPerBar: number;
}

function buildTimeline(args: BuildTimelineArgs): MusicTimeline {
  const {
    duration,
    frameDur,
    normEnergy,
    vocalEnergyPerFrame,
    totalSpectralEnergyPerFrame,
    keyMode,
    tonalProfile,
    beats,
    beatsPerBar,
  } = args;

  const N = normEnergy.length;
  const frameTime = (i: number) => Math.min(duration, Math.round(i * frameDur * 100) / 100);

  // ── Sections via energy-novelty + median-window comparison ──────────────
  const minSectionFrames = Math.max(8, Math.round(6 / Math.max(frameDur, 0.01))); // ≥ ~6 s
  const W = Math.max(4, Math.round(3 / Math.max(frameDur, 0.01)));                // ~3 s window
  const boundaries: number[] = [0];

  const median = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  if (N > minSectionFrames * 2) {
    const novelty: number[] = new Array(N).fill(0);
    for (let i = W; i < N - W; i++) {
      const left  = median(normEnergy.slice(i - W, i));
      const right = median(normEnergy.slice(i, i + W));
      novelty[i] = Math.abs(right - left);
    }
    // Pick peaks above threshold and far enough apart
    const NOVELTY_THRESHOLD = 0.18;
    let lastBoundary = 0;
    for (let i = W; i < N - W; i++) {
      const isPeak =
        novelty[i] > NOVELTY_THRESHOLD &&
        novelty[i] >= novelty[i - 1] &&
        novelty[i] >= novelty[i + 1] &&
        i - lastBoundary >= minSectionFrames;
      if (isPeak) {
        boundaries.push(i);
        lastBoundary = i;
      }
    }
  }
  boundaries.push(N);

  // Build raw segments
  type Seg = { startIdx: number; endIdx: number; avg: number };
  const rawSegs: Seg[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const s = boundaries[i];
    const e = boundaries[i + 1];
    if (e <= s) continue;
    const slice = normEnergy.slice(s, e);
    const avg = slice.reduce((acc, v) => acc + v, 0) / slice.length;
    rawSegs.push({ startIdx: s, endIdx: e, avg });
  }

  // Label sections heuristically
  const sortedByEnergy = [...rawSegs].map((s, i) => ({ s, i })).sort((a, b) => b.s.avg - a.s.avg);
  const chorusSet = new Set<number>();
  // Top third (or top 2 minimum) tagged as chorus
  const chorusCount = Math.max(rawSegs.length === 1 ? 0 : 2, Math.ceil(rawSegs.length / 3));
  for (let i = 0; i < Math.min(chorusCount, sortedByEnergy.length); i++) {
    if (sortedByEnergy[i].s.avg > 0.5) chorusSet.add(sortedByEnergy[i].i);
  }

  const sections: SectionSegment[] = rawSegs.map((seg, idx) => {
    let type: SectionType;
    if (idx === 0 && seg.avg < 0.55) {
      type = 'intro';
    } else if (idx === rawSegs.length - 1 && seg.avg < 0.55) {
      type = 'outro';
    } else if (chorusSet.has(idx)) {
      type = 'chorus';
    } else if (chorusSet.has(idx + 1) && seg.avg > 0.35 && seg.avg < (rawSegs[idx + 1]?.avg ?? 1)) {
      type = 'pre-chorus';
    } else if (idx > 0 && idx < rawSegs.length - 1 && seg.avg < 0.35) {
      type = 'bridge';
    } else {
      type = 'verse';
    }
    return {
      type,
      start: frameTime(seg.startIdx),
      end: frameTime(seg.endIdx),
      energy: Math.round(seg.avg * 100) / 100,
      emotion: emotionFor(seg.avg, keyMode, tonalProfile),
    };
  });

  // ── Bars from beats (assume 4/4 unless overridden) ──────────────────────
  const bars: number[] = [];
  if (beats && beats.length > 0) {
    for (let i = 0; i < beats.length; i += beatsPerBar) {
      bars.push(beats[i]);
    }
  }

  // ── Impacts — sudden energy rises ("drop"/"hit") and drops ("breakdown") ─
  const impacts: ImpactMoment[] = [];
  for (let i = 2; i < N - 1; i++) {
    const prev = normEnergy[i - 2];
    const cur  = normEnergy[i];
    if (cur > 0.55 && cur > prev * 1.7 && cur - prev > 0.25) {
      impacts.push({
        time: frameTime(i),
        strength: Math.round(Math.min(1, cur - prev) * 100) / 100,
        // Big rise after sustained quiet = "drop"; otherwise an accent "hit"
        type: prev < 0.25 ? 'drop' : 'hit',
      });
    } else if (prev > 0.5 && cur < prev * 0.45 && prev - cur > 0.25) {
      impacts.push({
        time: frameTime(i),
        strength: Math.round(Math.min(1, prev - cur) * 100) / 100,
        type: 'breakdown',
      });
    } else if (cur > 0.4 && cur > prev * 1.25 && cur - prev > 0.15) {
      impacts.push({
        time: frameTime(i),
        strength: Math.round(Math.min(1, cur - prev) * 100) / 100,
        type: 'lift',
      });
    }
  }
  // Keep the strongest 12 to keep payload small
  impacts.sort((a, b) => b.strength - a.strength);
  const topImpacts = impacts.slice(0, 12).sort((a, b) => a.time - b.time);

  // ── Vocal density per frame ─────────────────────────────────────────────
  const maxVocalRatio = Math.max(
    ...vocalEnergyPerFrame.map((v, i) => (totalSpectralEnergyPerFrame[i] ? v / totalSpectralEnergyPerFrame[i] : 0)),
    1e-9,
  );
  const vocalDensity: VocalDensityPoint[] = vocalEnergyPerFrame.map((v, i) => {
    const tot = totalSpectralEnergyPerFrame[i];
    const ratio = tot > 0 ? v / tot : 0;
    return {
      time: frameTime(i),
      density: Math.round((ratio / maxVocalRatio) * 100) / 100,
    };
  });

  // ── Emotional timeline — sampled per ~2 s bucket ────────────────────────
  const bucketFrames = Math.max(1, Math.round(2 / Math.max(frameDur, 0.01)));
  const emotionalTimeline: EmotionPoint[] = [];
  for (let i = 0; i < N; i += bucketFrames) {
    const slice = normEnergy.slice(i, i + bucketFrames);
    if (slice.length === 0) continue;
    const avg = slice.reduce((acc, v) => acc + v, 0) / slice.length;
    const arousal = Math.round(avg * 100) / 100;
    let valence = keyMode === 'major' ? 0.3 : -0.3;
    if (tonalProfile === 'treble-bright') valence += 0.2;
    else if (tonalProfile === 'bass-heavy') valence -= 0.15;
    // Higher energy nudges valence slightly toward the brighter pole for that key
    valence += keyMode === 'major' ? avg * 0.2 : -avg * 0.1;
    valence = Math.max(-1, Math.min(1, Math.round(valence * 100) / 100));
    emotionalTimeline.push({
      time: frameTime(i),
      valence,
      arousal,
      label: emotionFor(avg, keyMode, tonalProfile),
    });
  }

  return {
    sections,
    beats: beats ?? [],
    bars,
    impacts: topImpacts,
    vocalDensity,
    emotionalTimeline,
  };
}

function emotionFor(
  energy: number,
  keyMode: 'major' | 'minor',
  tonalProfile: AudioFeatures['tonalProfile'],
): EmotionLabel {
  if (energy < 0.25) {
    return keyMode === 'minor' ? 'melancholic' : 'reflective';
  }
  if (energy < 0.5) {
    return keyMode === 'minor' ? 'reflective' : 'calm';
  }
  if (energy < 0.75) {
    if (keyMode === 'minor') return tonalProfile === 'bass-heavy' ? 'tense' : 'driving';
    return 'building';
  }
  // High energy
  return keyMode === 'minor' ? 'tense' : 'euphoric';
}

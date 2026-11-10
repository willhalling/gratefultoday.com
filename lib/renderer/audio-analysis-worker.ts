/**
 * Web Worker wrapper for audio FFT analysis.
 *
 * The pure analysis code below is intentionally self-contained (duplicated
 * from lib/renderer/audio-engine.ts) so it can run inside a blob worker
 * without relying on Next.js/webpack worker bundling. Keep the two copies in
 * sync when changing FFT/visualizeAudio behaviour.
 */

import type { ClipAudioFrameData } from './audio-engine';

interface Fft {
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

const toInt16 = (x: number): number => (x > 0 ? x * 0x7fff : x * 0x8000);

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
    window_[i] = Math.fround(toInt16(channel[actualStart + i]));
  }
  fft.magnitudes(window_, mags);
  const smoothed = smoothen(mags);
  const norm = 1 / (sampleSize / 2) / maxInt;
  for (let i = 0; i < out.length; i++) {
    out[i] = smoothed[i] * norm;
  }
}

const WAVE_SMOOTH_HALF_WINDOW_SEC = 0.18;
const WAVE_SMOOTH_SAMPLES = 9;

function gaussianSmoothBass(bassByFrame: ArrayLike<number>, frame: number, fps: number): number {
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

function analyzeChannelData(opts: {
  channel: Float32Array;
  sampleRate: number;
  fps: number;
  totalFrames: number;
  waveEnergyMultiplier?: number;
}): ClipAudioFrameData {
  const { channel, sampleRate, fps, waveEnergyMultiplier = 1 } = opts;
  const totalFrames = Math.max(1, opts.totalFrames);
  const maxInt = getMaxPossibleMagnitude(channel) || 1;

  const fft128 = createFft(256);
  const fft64 = createFft(128);
  const window256 = new Int16Array(256);
  const window128 = new Int16Array(128);
  const mags256 = new Float32Array(128);
  const mags128 = new Float32Array(64);

  const padFrames = 1 + Math.ceil(WAVE_SMOOTH_HALF_WINDOW_SEC * fps);
  const analysedFrames = totalFrames + padFrames;

  const raw128: Float32Array[] = new Array(analysedFrames);
  const rawBass = new Float32Array(analysedFrames);
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

function buildWorkerScript(): string {
  const source = `
    ${createFft.toString()}
    ${toInt16.toString()}
    ${smoothen.toString()}
    ${getMaxPossibleMagnitude.toString()}
    ${visualizeFrameRaw.toString()}
    ${gaussianSmoothBass.toString()}
    ${analyzeChannelData.toString()}

    self.onmessage = function (e) {
      const { channel, sampleRate, fps, totalFrames, waveEnergyMultiplier } = e.data;
      const result = analyzeChannelData({ channel, sampleRate, fps, totalFrames, waveEnergyMultiplier });
      const transfer = [];
      for (let i = 0; i < result.frequencyData.length; i++) transfer.push(result.frequencyData[i].buffer);
      for (let i = 0; i < result.rawFrequencyData.length; i++) transfer.push(result.rawFrequencyData[i].buffer);
      self.postMessage({ result }, transfer);
    };
  `;
  return source;
}

export function analyzeInWorker(opts: {
  channel: Float32Array;
  sampleRate: number;
  fps: number;
  totalFrames: number;
  waveEnergyMultiplier?: number;
}): Promise<ClipAudioFrameData> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buildWorkerScript()], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    worker.onmessage = (e: MessageEvent<{ result: ClipAudioFrameData }>) => {
      worker.terminate();
      resolve(e.data.result);
    };
    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };
    worker.postMessage(
      {
        channel: opts.channel,
        sampleRate: opts.sampleRate,
        fps: opts.fps,
        totalFrames: opts.totalFrames,
        waveEnergyMultiplier: opts.waveEnergyMultiplier ?? 1,
      },
      [opts.channel.buffer],
    );
  });
}

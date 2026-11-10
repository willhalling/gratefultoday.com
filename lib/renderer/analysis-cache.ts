/**
 * IndexedDB cache for decoded audio analysis (per-frame FFT / wave energy).
 * Caching by audio URL + analysis parameters makes repeat preview loads
 * instant after the first visit.
 */

import type { ClipAudioFrameData } from './audio-engine';

const DB_NAME = 'wavecanvas-analysis-cache';
const DB_VERSION = 1;
const STORE_NAME = 'analysis';

export interface AnalysisCacheKey {
  audioUrl: string;
  fps: number;
  durationSec: number;
  sampleRate: number;
  trimStart: number;
  trimEnd: number;
  waveEnergyMultiplier: number;
}

interface SerializedFrameData {
  frequencyData: ArrayBuffer[];
  rawFrequencyData: ArrayBuffer[];
  backgroundWaveEnergy: ArrayBuffer;
  rawBackgroundWaveEnergy: ArrayBuffer;
  maxInt: number;
  fps: number;
  totalFrames: number;
}

function cacheId(key: AnalysisCacheKey): string {
  return JSON.stringify(key);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

function sliceBuffer(buf: ArrayBuffer | SharedArrayBuffer, byteOffset: number, byteLength: number): ArrayBuffer {
  return (buf as ArrayBuffer).slice(byteOffset, byteOffset + byteLength);
}

function serialize(data: ClipAudioFrameData): SerializedFrameData {
  return {
    frequencyData: data.frequencyData.map((a) => sliceBuffer(a.buffer, a.byteOffset, a.byteLength)),
    rawFrequencyData: data.rawFrequencyData.map((a) => sliceBuffer(a.buffer, a.byteOffset, a.byteLength)),
    backgroundWaveEnergy: new Float32Array(data.backgroundWaveEnergy).buffer,
    rawBackgroundWaveEnergy: new Float32Array(data.rawBackgroundWaveEnergy).buffer,
    maxInt: data.maxInt,
    fps: data.fps,
    totalFrames: data.totalFrames,
  };
}

function deserialize(record: SerializedFrameData): ClipAudioFrameData {
  return {
    frequencyData: record.frequencyData.map((buf) => new Float32Array(buf)),
    rawFrequencyData: record.rawFrequencyData.map((buf) => new Float32Array(buf)),
    backgroundWaveEnergy: Array.from(new Float32Array(record.backgroundWaveEnergy)),
    rawBackgroundWaveEnergy: Array.from(new Float32Array(record.rawBackgroundWaveEnergy)),
    maxInt: record.maxInt,
    fps: record.fps,
    totalFrames: record.totalFrames,
  };
}

export async function getCachedAnalysis(key: AnalysisCacheKey): Promise<ClipAudioFrameData | null> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(cacheId(key));
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const record = request.result as SerializedFrameData | undefined;
        resolve(record ? deserialize(record) : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function setCachedAnalysis(
  key: AnalysisCacheKey,
  data: ClipAudioFrameData,
): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(serialize(data), cacheId(key));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Cache failures are non-fatal.
  }
}

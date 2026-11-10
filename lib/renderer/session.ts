/**
 * lib/renderer/session.ts — the prepare phase replacing Remotion's
 * delayRender/continueRender gates. Everything a render needs that is async
 * (audio decode + FFT analysis, fonts, images) is resolved ONCE here; the
 * per-frame renderFrame(f) is then fully synchronous.
 *
 * Modeled on roughclip lib/renderer/variant-runner.ts: `prepareSession` does
 * the work, `getPreparedSession` is a one-entry WeakMap cache keyed by input
 * object identity so the preview and export share prepared assets and any
 * edit (a rebuilt input object) invalidates automatically.
 *
 * Phase 0 skeleton — frame-context derivation, MusicTimeline and world
 * textures land in Phase 1.
 */
import {
  analyzeClipAudio,
  analyzeSilentClip,
  type ClipAudioAnalysis,
} from './audio-engine';
import { loadThemeFont } from './fonts';
import type { ThemeFontKey } from '@/constants/fonts';

export interface PrepareSessionInput {
  fps: number;
  /** Composition duration in seconds (trimmed window length). */
  durationSec: number;
  /** Empty/undefined = silent session (synthetic flat analysis). */
  audioUrl?: string;
  audioTrim?: { start: number; end: number } | null;
  fadeAudio?: boolean;
  fadeOutSec?: number;
  waveEnergyMultiplier?: number;
  /** Optional pre-fetched audio bytes shared with the playback element. */
  audioBuffer?: ArrayBuffer;
  /** Optional compressed preview audio URL (e.g. MP3). Used instead of audioUrl
   *  when preview is true, so the preview decodes a smaller/faster file. */
  previewAudioUrl?: string;
  /** True for preview/thumbnail paths that don't need the mux buffer. */
  preview?: boolean;
  /** Theme font to load before any text is measured. */
  themeFontKey?: ThemeFontKey;
  /** Images the scene needs (artwork, backgrounds). */
  imageUrls?: string[];
}

export interface PreparedSession {
  input: PrepareSessionInput;
  analysis: ClipAudioAnalysis;
  images: Map<string, HTMLImageElement>;
  totalFrames: number;
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export async function prepareSession(input: PrepareSessionInput): Promise<PreparedSession> {
  const { fps, durationSec } = input;
  if (!(durationSec > 0)) {
    throw new Error('Cannot prepare a clip with zero duration.');
  }
  const silent = !input.audioUrl;

  const [analysis, , imageEntries] = await Promise.all([
    silent
      ? Promise.resolve(analyzeSilentClip({ fps, durationSec }))
      : analyzeClipAudio({
          audioUrl: input.preview && input.previewAudioUrl
            ? input.previewAudioUrl
            : input.audioUrl!,
          fps,
          durationSec,
          trim: input.audioTrim ?? null,
          fadeAudio: input.fadeAudio ?? true,
          fadeOutSec: input.fadeOutSec ?? 1,
          waveEnergyMultiplier: input.waveEnergyMultiplier ?? 1,
          audioBuffer: input.audioBuffer,
          includeTrimmedBuffer: !input.preview,
          preview: input.preview,
        }),
    input.themeFontKey ? loadThemeFont(input.themeFontKey) : Promise.resolve(),
    Promise.all(
      (input.imageUrls ?? []).map(
        async (url) => [url, await loadImageElement(url).catch(() => null)] as const,
      ),
    ),
  ]);

  const images = new Map<string, HTMLImageElement>();
  for (const [url, img] of imageEntries) {
    if (img) images.set(url, img);
  }

  return { input, analysis, images, totalFrames: analysis.totalFrames };
}

// ─── Session-level cache (preview + export share prepared assets) ────────────

const sessionCache = new WeakMap<PrepareSessionInput, Promise<PreparedSession>>();

/**
 * Cached prepare keyed by input object identity — a rebuilt input (any edit)
 * re-prepares automatically. A failed prepare is evicted so the next call
 * retries instead of caching a rejection forever.
 */
export function getPreparedSession(input: PrepareSessionInput): Promise<PreparedSession> {
  const cached = sessionCache.get(input);
  if (cached) return cached;
  const promise = prepareSession(input);
  sessionCache.set(input, promise);
  promise.catch(() => {
    if (sessionCache.get(input) === promise) sessionCache.delete(input);
  });
  return promise;
}

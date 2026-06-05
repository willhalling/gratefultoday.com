'use client';

import { renderMediaOnWeb } from '@remotion/web-renderer';
import { GratitudePost } from '@/remotion/gratitude/GratitudePost';
import { computeDurationInFrames, FPS, VIDEO_H, VIDEO_W } from '@/remotion/gratitude/constants';
import type { GratitudePostProps } from '@/remotion/gratitude/constants';

export interface ClientRenderProgress {
  renderedFrames: number;
  encodedFrames: number;
  totalFrames: number;
}

export interface RenderPostInBrowserOptions {
  inputProps: GratitudePostProps;
  onProgress?: (progress: ClientRenderProgress) => void;
  signal?: AbortSignal;
  /** Restrict rendering to a subset of frames, e.g. [0, 59] for a 2-second preview. */
  frameRange?: [number, number] | null;
}

/**
 * Renders a GratitudePost composition entirely in the browser using
 * @remotion/web-renderer (WebCodecs). Returns the resulting MP4 blob so the
 * caller can download it or upload it.
 */
export async function renderPostInBrowser({
  inputProps,
  onProgress,
  signal,
  frameRange,
}: RenderPostInBrowserOptions): Promise<Blob> {
  const durationInFrames = computeDurationInFrames(inputProps.beats, inputProps.headlineWord);

  const result = await renderMediaOnWeb({
    composition: {
      id: 'GratitudePost',
      component: GratitudePost,
      width: VIDEO_W,
      height: VIDEO_H,
      fps: FPS,
      durationInFrames,
      defaultProps: inputProps,
    },
    inputProps,
    videoCodec: 'h264',
    container: 'mp4',
    signal: signal ?? null,
    frameRange: frameRange ?? null,
    onProgress: onProgress
      ? (p) =>
          onProgress({
            renderedFrames: p.renderedFrames,
            encodedFrames: p.encodedFrames,
            totalFrames: frameRange ? frameRange[1] - frameRange[0] + 1 : durationInFrames,
          })
      : null,
  });

  return result.getBlob();
}

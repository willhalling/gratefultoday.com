/**
 * Shared utilities for handling captions/subtitles in Remotion videos
 * Can be used across milestone videos, video editor, and other video compositions
 */

import type { CaptionSegment, WordTiming } from './caption-types';

/**
 * Get the active caption segment for the current frame
 */
export function getActiveCaptionSegment(
  segments: CaptionSegment[],
  currentTime: number
): CaptionSegment | null {
  return segments.find(
    (segment) => currentTime >= segment.startTime && currentTime < segment.endTime
  ) || null;
}

/**
 * Get the active word within a segment (for word-by-word highlighting)
 */
export function getActiveWord(
  segment: CaptionSegment,
  currentTime: number
): WordTiming | null {
  if (!segment.words || segment.words.length === 0) {
    return null;
  }

  return segment.words.find(
    (word) => currentTime >= word.start && currentTime < word.end
  ) || null;
}

/**
 * Calculate opacity for fade in/out effects
 */
export function calculateCaptionOpacity(
  segment: CaptionSegment,
  currentTime: number,
  fadeInDuration: number = 0.2,
  fadeOutDuration: number = 0.2
): number {
  const segmentDuration = segment.endTime - segment.startTime;
  const timeInSegment = currentTime - segment.startTime;

  // Fade in
  if (timeInSegment < fadeInDuration) {
    return timeInSegment / fadeInDuration;
  }

  // Fade out
  if (timeInSegment > segmentDuration - fadeOutDuration) {
    return (segmentDuration - timeInSegment) / fadeOutDuration;
  }

  return 1;
}

/**
 * Convert frame number to seconds
 */
export function framesToSeconds(frame: number, fps: number): number {
  return frame / fps;
}

/**
 * Convert seconds to frame number
 */
export function secondsToFrames(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

/**
 * Parse a simple caption script format into structured data
 * Format example:
 * ```
 * [0.0-2.5] First caption
 * [2.5-5.0] Second caption
 * [pause 1.0]
 * [5.0-8.0] Third caption
 * ```
 */
export function parseSimpleCaptionScript(script: string): CaptionSegment[] {
  const lines = script.trim().split('\n');
  const segments: CaptionSegment[] = [];
  let segmentId = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Match timing format: [start-end] text
    const timingMatch = trimmedLine.match(/^\[(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\]\s*(.+)$/);
    if (timingMatch) {
      const [, start, end, text] = timingMatch;
      segments.push({
        id: `segment-${segmentId++}`,
        text: text.trim(),
        startTime: parseFloat(start),
        endTime: parseFloat(end),
      });
    }

    // Match pause format: [pause duration]
    const pauseMatch = trimmedLine.match(/^\[pause\s+(\d+(?:\.\d+)?)\]$/);
    if (pauseMatch && segments.length > 0) {
      const pauseDuration = parseFloat(pauseMatch[1]);
      segments[segments.length - 1].pauseAfter = pauseDuration;
    }
  }

  return segments;
}

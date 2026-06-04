// Char-based text wrapping ported from gratitude_videos/app.py.
// Mirrors `wrap_text` and `_balanced_wrap` for visual parity in the
// caption block. We split on sentence terminators, greedy-wrap to a
// target width, then binary-search for the smallest width that keeps
// the same line count (so we get balanced rather than orphaned lines).
//
// Phase 2 will replace this char-width approximation with a true pixel
// measurement using canvas, but the line shape this produces already
// matches the Python pipeline closely.

import {
  BEAT_FONTSIZE,
  BEAT_HARD_MAX_LINES,
  BEAT_MAX_LINES,
  BEAT_WRAP,
  LINE_MAX_W_FRAC,
  VIDEO_W,
} from './constants';

const LINE_SIZE_LARGE = 1.55;

function greedyWrap(sentence: string, width: number): string[] {
  const words = sentence.split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if (current.length + 1 + word.length <= width) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function balancedWrap(sentence: string, width: number): string[] {
  const words = sentence.split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const greedy = greedyWrap(sentence, width);
  const targetLines = greedy.length;
  if (targetLines <= 1) return greedy;
  const longestWord = Math.max(...words.map((w) => w.length));
  let lo = longestWord;
  let hi = width;
  let best = greedy;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = greedyWrap(sentence, mid);
    if (candidate.length && candidate.length <= targetLines) {
      best = candidate;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return best;
}

export function wrapBeat(text: string, width: number = BEAT_WRAP): string[] {
  const lines: string[] = [];
  const paragraphs = text.split(/\n/).filter((p) => p.trim()) || [text];
  const sentences: string[] = [];
  for (const paragraph of paragraphs) {
    const parts = paragraph
      .trim()
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    sentences.push(...parts);
  }
  const list = sentences.length ? sentences : [text];

  for (const sentence of list) {
    const approxCharW = Math.max(1.0, BEAT_FONTSIZE * LINE_SIZE_LARGE * 0.55);
    const safePixelW = VIDEO_W * LINE_MAX_W_FRAC;
    const maxLineCharsPixel = Math.max(width, Math.floor(safePixelW / approxCharW));
    const maxLineChars = Math.min(Math.max(width, width * 2), maxLineCharsPixel);

    let w = width;
    let wrapped = balancedWrap(sentence, w);
    while (
      wrapped.length > BEAT_MAX_LINES &&
      w < maxLineChars &&
      Math.max(...wrapped.map((l) => l.length)) < maxLineChars
    ) {
      w += 2;
      wrapped = balancedWrap(sentence, w);
    }
    while (wrapped.length > BEAT_HARD_MAX_LINES && w < width * 3) {
      w += 2;
      wrapped = balancedWrap(sentence, w);
    }
    lines.push(...wrapped);
  }
  return lines;
}

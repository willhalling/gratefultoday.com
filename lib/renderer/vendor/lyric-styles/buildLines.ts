/**
 * Shared utility: groups flat word-timing arrays into display lines.
 * Used by both LyricsSlot and the lyric-style preview compositions.
 *
 * Splitting strategy (in priority order):
 *  1. Silence gap > gapThreshold → hard break
 *  2. Line would exceed MAX_CHARS characters → break before current word
 *  3. Line has >= maxWords words → break
 *  Post-processing: dangling connector words (e.g. "for", "my") at the end
 *  of a line are moved to the beginning of the next line.
 */

export interface WordTiming {
  word: string;
  start: number;
  end: number;
  /** False when the worker flagged this word's timing as unreliable. */
  reliable?: boolean;
  /** True when the user hid this word in the lyrics editor. */
  hidden?: boolean;
}

import { hasCjkScript } from '@/lib/language-script';

export interface DisplayLine {
  words: WordTiming[];
  /** Frame at which this line first appears (= first word start × fps). */
  startFrame: number;
  /** Frame at which the last word in this line ends (= last word end × fps). */
  endFrame: number;
  /** Assembled plain text of all words in this line. */
  text: string;
}

/**
 * Words that feel "dangling" when they end a line — they introduce the next
 * phrase, not conclude the current one. If one of these is the last word of a
 * line and the line has at least MIN_WORDS_BEFORE_DANGLING words before it,
 * the dangling word is moved to the start of the next line.
 */
const DANGLING_WORDS = new Set([
  'for', 'my', 'the', 'a', 'an', 'to', 'of', 'and', 'but', 'or',
  'in', 'on', 'at', 'with', 'that', 'this', 'these', 'those', 'its',
  'their', 'our', 'your', 'his', 'her', 'i', "i'm", "i've", "i'll",
]);

const MIN_WORDS_BEFORE_DANGLING = 3;
const MAX_CHARS = 32; // max character count before a forced line break

function makeDisplayLine(buffer: WordTiming[], fps: number): DisplayLine {
  const rawText = buffer.map((w) => w.word).join(' ');
  const joinedText = hasCjkScript(rawText)
    ? buffer.map((w) => w.word).join('')
    : rawText;
  return {
    words: buffer,
    startFrame: Math.floor(buffer[0].start * fps),
    endFrame: Math.ceil(buffer[buffer.length - 1].end * fps),
    text: joinedText,
  };
}

/**
 * @param words        Flat array of word timings (seconds).
 * @param fps          Composition frame rate.
 * @param maxWords     Maximum words before forcing a line break (default 5).
 * @param gapThreshold Silence gap in seconds that triggers a new line (default 1.0).
 */
export function buildLines(
  words: WordTiming[],
  fps: number,
  maxWords = 5,
  gapThreshold = 1.0
): DisplayLine[] {
  // Drop words the worker flagged as unreliable (e.g. 24-second held words or
  // collapsed final-chorus clusters) and words the user hid in the lyrics
  // editor. This is a safety net for callers that pass raw word arrays.
  const reliableWords = words.filter((w) => w.reliable !== false && !w.hidden);
  if (!reliableWords.length) return [];

  const rawLines: WordTiming[][] = [];
  let buffer: WordTiming[] = [];

  const flush = () => {
    if (!buffer.length) return;
    rawLines.push(buffer);
    buffer = [];
  };

  for (let i = 0; i < reliableWords.length; i++) {
    const w = reliableWords[i];
    if (buffer.length > 0) {
      const prev = buffer[buffer.length - 1];
      const gap = w.start - prev.end;
      const projectedText = [...buffer, w].map((x) => x.word).join(' ');
      if (
        gap > gapThreshold ||
        buffer.length >= maxWords ||
        projectedText.length > MAX_CHARS
      ) {
        flush();
      }
    }
    buffer.push(w);
  }
  flush();

  // ── Post-process: fix dangling connector words ──────────────────────────
  // If a line ends with a connector AND has enough words before it, move the
  // trailing connector(s) to the start of the next line.
  for (let i = 0; i < rawLines.length - 1; i++) {
    const line = rawLines[i];
    const next = rawLines[i + 1];

    // Count how many trailing words are dangling
    let danglingCount = 0;
    for (let j = line.length - 1; j >= 0; j--) {
      if (DANGLING_WORDS.has(line[j].word.toLowerCase())) {
        danglingCount++;
      } else {
        break;
      }
    }

    const keepCount = line.length - danglingCount;
    if (danglingCount > 0 && keepCount >= MIN_WORDS_BEFORE_DANGLING) {
      const moved = line.splice(keepCount); // removes dangling words from current line
      next.unshift(...moved);               // prepends them to next line
    }
  }

  // Remove any lines that became empty after post-processing
  return rawLines
    .filter((l) => l.length > 0)
    .map((l) => makeDisplayLine(l, fps));
}

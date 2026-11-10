/**
 * lib/renderer/lyrics/shared.ts — pure (framework-free) lyric logic shared by
 * the four Canvas2D lyric-mode ports. Functions are VERBATIM ports of their
 * remotion originals so the Canvas2D renderers make the same grouping,
 * windowing and variant decisions on every frame:
 *
 *   - TikTokFanSlot.tsx  — distributeWords / prepareWords / greedyWrap /
 *     balanceWords / repairPhrases / buildDisplayWindows / lineWidthPx.
 *   - HeadlineSlot.tsx   — buildGroups + withAlpha + emphasis cap.
 *   - WaveSlot.tsx       — groupWords / hashString / seededFloat / deriveVariant.
 *   - AnimatedLyricsSlot.tsx — resolvePhrases / findActiveIdx / beatIntensity /
 *     phraseAbsoluteWords / normalizeToken.
 *
 * Verbatim framework-free originals are imported instead of copied:
 * buildLines (lyric-styles/buildLines.ts), justifiedLayoutCore,
 * highlightUtils' pure helpers and lib/language-script.
 */
import type { WordTiming } from '@/lib/renderer/types';
import type { LyricPhrase } from '@/lib/renderer/vendor/slots/lyricPhrase';
import type { DisplayLine } from '@/lib/renderer/vendor/lyric-styles/buildLines';

export { buildLines } from '@/lib/renderer/vendor/lyric-styles/buildLines';
export {
  canvasFillFontSize,
  buildJustifiedLayoutFromLines,
  splitIntoWordGroups,
  defaultJustifiedFontWeight,
} from '@/lib/renderer/vendor/lyric-styles/justifiedLayoutCore';
export { buildHighlightSet, isWordHighlighted } from '@/lib/renderer/vendor/lyric-styles/highlightUtils';
export {
  hasNonLatinScript,
  hasArabicScript,
  withScriptFallbackFonts,
} from '@/lib/language-script';
export type { DisplayLine };

// ─── TikTokFanSlot.tsx:77–117 + 141–283 ─────────────────────────────────────

/** Max silence (s) to bridge when rescuing a rogue single-word phrase. */
export const TTF_MERGE_MAX_GAP = 1.2;
/** Time (s) the phrase lingers after its last word appears. */
export const TTF_LINGER_AFTER_LAST_WORD = 1.1;
/** Minimum on-screen time (s) for any phrase window. */
export const TTF_MIN_WINDOW = 0.6;
/** Base inter-word gap (em). */
export const TTF_WORD_GAP_EM = 0.32;
export const TTF_MAX_LINES = 4;
export const TTF_MAX_BLOCK_WIDTH_RATIO_PORTRAIT = 0.58;
export const TTF_MAX_BLOCK_WIDTH_RATIO_LANDSCAPE = 0.45;
export const TTF_TEXT_ON_DARK = '#FDFCFA';
export const TTF_TEXT_ON_LIGHT = '#2A2724';
export const TTF_STROKE_ON_DARK = 'rgba(42,39,36,0.55)';
export const TTF_STROKE_ON_LIGHT = 'rgba(245,243,241,0.55)';

/** Evenly distributes items across `n` lines, avoiding a lone orphan on the final line. */
export function ttfDistributeWords<T>(items: T[], n: number): T[][] {
  const lines: T[][] = [];
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const remaining = items.length - idx;
    const linesLeft = n - i;
    let count = Math.ceil(remaining / linesLeft);
    if (i < n - 1 && remaining - count === 1 && count > 1) count -= 1;
    lines.push(items.slice(idx, idx + count));
    idx += count;
  }
  if (lines.length > 1 && lines[lines.length - 1].length === 1) {
    const last = lines.pop()!;
    lines[lines.length - 1].push(...last);
  }
  return lines;
}

/** Real rendered width of a line in px (canvas metrics + natural gaps). */
export function ttfLineWidthPx(
  line: { word: string }[],
  ctx: CanvasRenderingContext2D,
  gapPx: number,
): number {
  const wordsWidth = line.reduce((s, w) => s + ctx.measureText(w.word).width, 0);
  return wordsWidth + (line.length - 1) * gapPx;
}

/** Splits individual words that are too wide to fit on a line by themselves. */
export function ttfPrepareWords(
  words: WordTiming[],
  measureLine: (line: WordTiming[]) => number,
  maxWordWidthEm: number,
): WordTiming[] {
  const out: WordTiming[] = [];
  for (const w of words) {
    const width = measureLine([{ ...w, word: w.word }]);
    if (width <= maxWordWidthEm) {
      out.push(w);
      continue;
    }
    const chars = Array.from(w.word);
    let chunk = '';
    const chunks: string[] = [];
    for (const ch of chars) {
      const test = chunk + ch;
      if (measureLine([{ ...w, word: `${test}-` }]) > maxWordWidthEm && chunk) {
        chunks.push(`${chunk}-`);
        chunk = ch;
      } else {
        chunk = test;
      }
    }
    if (chunk) chunks.push(chunk);
    for (const c of chunks) {
      out.push({ ...w, word: c });
    }
  }
  return out;
}

/** Fallback wrap that respects both a hard word cap and a max line width. */
export function ttfGreedyWrap(
  words: WordTiming[],
  measureLine: (line: WordTiming[]) => number,
  maxLineWidthEm: number,
): WordTiming[][] {
  const lines: WordTiming[][] = [];
  let current: WordTiming[] = [];
  for (const w of words) {
    const test = [...current, w];
    const width = measureLine(test);
    const tooManyWords = test.length > 4;
    const tooWide = width > maxLineWidthEm;
    if ((tooManyWords || tooWide) && current.length > 0) {
      lines.push(current);
      current = [w];
    } else {
      current = test;
    }
  }
  if (current.length) lines.push(current);
  if (lines.length > 1 && lines[lines.length - 1].length === 1) {
    const prev = lines[lines.length - 2];
    const orphan = lines[lines.length - 1][0];
    const combined = [...prev, orphan];
    if (combined.length <= 4 && measureLine(combined) <= maxLineWidthEm) {
      prev.push(orphan);
      lines.pop();
    }
  }
  return lines;
}

/** Chooses line breaks for a phrase as a balanced editorial block. */
export function ttfBalanceWords(
  words: WordTiming[],
  measureLine: (line: WordTiming[]) => number,
  maxLineWidthEm: number,
): { lines: WordTiming[][]; targetWidthEm: number; referenceIndex: number } {
  if (words.length === 0) {
    return { lines: [], targetWidthEm: 0, referenceIndex: 0 };
  }
  if (words.length <= 3 && measureLine(words) <= maxLineWidthEm) {
    return { lines: [words], targetWidthEm: measureLine(words), referenceIndex: 0 };
  }

  let best: WordTiming[][] | null = null;
  let bestScore = Infinity;
  const maxLines = Math.min(TTF_MAX_LINES, words.length);
  for (let n = 2; n <= maxLines; n++) {
    const lines = ttfDistributeWords(words, n);
    if (lines.some((l) => l.length === 1)) continue;
    if (lines.some((l) => l.length > 4)) continue;
    if (lines.some((l) => l.length === 4 && l.map((w) => w.word).join('').length > 14)) continue;

    const widths = lines.map(measureLine);
    const refWidth = Math.max(...widths);
    if (refWidth > maxLineWidthEm) continue;

    const balancePenalty = widths.reduce((s, w) => s + (refWidth - w) * 0.5, 0);
    const shapePenalty =
      lines.reduce((s, l) => s + Math.abs(l.length - 2.5) * 0.8, 0) + n * 0.75;
    const score = balancePenalty + shapePenalty;
    if (score < bestScore) {
      bestScore = score;
      best = lines;
    }
  }

  const finalLines = best ?? ttfGreedyWrap(words, measureLine, maxLineWidthEm);
  const finalWidths = finalLines.map(measureLine);
  const referenceIndex = finalWidths.indexOf(Math.max(...finalWidths));
  return {
    lines: finalLines,
    targetWidthEm: finalWidths[referenceIndex],
    referenceIndex,
  };
}

export function ttfWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Merges single-word (rogue) phrases into a neighbour when the silence gap is small. */
export function ttfRepairPhrases(phrases: LyricPhrase[]): LyricPhrase[] {
  const out = phrases.map((p) => ({ ...p }));
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < out.length; i++) {
      if (ttfWordCount(out[i].text) > 1) continue;
      const prev = out[i - 1];
      const next = out[i + 1];
      const gapPrev = prev ? out[i].start - prev.end : Infinity;
      const gapNext = next ? next.start - out[i].end : Infinity;
      if (prev && gapPrev <= TTF_MERGE_MAX_GAP && gapPrev <= gapNext) {
        prev.text = `${prev.text} ${out[i].text}`;
        prev.end = out[i].end;
        out.splice(i, 1);
        changed = true;
        break;
      }
      if (next && gapNext <= TTF_MERGE_MAX_GAP) {
        next.text = `${out[i].text} ${next.text}`;
        next.start = out[i].start;
        out.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  return out;
}

export interface TtfDisplayWindow {
  phrase: LyricPhrase;
  start: number;
  end: number;
}

/** Adjusted display windows (linger capped at the next phrase's start). */
export function ttfBuildDisplayWindows(
  phrases: LyricPhrase[],
  words: WordTiming[],
): TtfDisplayWindow[] {
  const windows: TtfDisplayWindow[] = [];
  let prevEnd = -Infinity;
  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    const nextPhraseStart = phrases[i + 1] ? phrases[i + 1].start : Infinity;
    const inPhrase = words.filter(
      (w) => w.start >= phrase.start - 0.05 && w.start < nextPhraseStart - 0.05,
    );
    const lastWordEnd =
      inPhrase.length > 0 ? inPhrase[inPhrase.length - 1].end : phrase.end - 0.3;
    const naturalEnd = Math.max(phrase.end, lastWordEnd + TTF_LINGER_AFTER_LAST_WORD);
    let start = Math.max(phrase.start, prevEnd);
    if (start > naturalEnd - TTF_MIN_WINDOW) start = phrase.start;
    const end = Math.max(Math.min(naturalEnd, nextPhraseStart), start + TTF_MIN_WINDOW);
    windows.push({ phrase, start, end });
    prevEnd = end;
  }
  return windows;
}

// ─── HeadlineSlot.tsx:27–196 ─────────────────────────────────────────────────

/** Apply alpha to a CSS colour string (verbatim — keeps divs at opacity:1). */
export function headlineWithAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const h6 = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (h6) return `rgba(${parseInt(h6[1], 16)},${parseInt(h6[2], 16)},${parseInt(h6[3], 16)},${a.toFixed(3)})`;
  const h3 = color.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (h3) return `rgba(${parseInt(h3[1] + h3[1], 16)},${parseInt(h3[2] + h3[2], 16)},${parseInt(h3[3] + h3[3], 16)},${a.toFixed(3)})`;
  return color;
}

export interface HeadlineGroup {
  text: string;
  start: number;
  end: number;
  nextStart: number | null;
  longestSungDur: number;
  isSingleWord: boolean;
  isHighlighted?: boolean;
}

export const HEADLINE_GROUP_MAX_GAP = 0.25;
export const HEADLINE_FAST_WORD_MAX = 0.4;
export const HEADLINE_GROUP_MAX_WORDS = 3;
export const HEADLINE_GROUP_MAX_TOTAL_LEN = 18;
export const HEADLINE_GROUP_MAX_TOTAL_TIME = 1.0;
export const HEADLINE_SINGLE_LETTER_MERGE_MAX_GAP = 0.5;
export const HEADLINE_MAX_AUTO_EMPHASIS = 3;

export function headlineBuildGroups(words: WordTiming[]): HeadlineGroup[] {
  const groups: HeadlineGroup[] = [];
  let i = 0;
  while (i < words.length) {
    const first = words[i];
    let j = i;
    let combinedText = first.word;
    let longestSungDur = Math.max(0, first.end - first.start);
    while (j + 1 < words.length) {
      const curr = words[j];
      const next = words[j + 1];
      const gap = next.start - curr.end;
      const currOnScreen = next.start - curr.start;
      const nextOnScreen =
        j + 2 < words.length
          ? words[j + 2].start - next.start
          : Math.max(0, next.end - next.start);
      const wordsSoFar = j - i + 1;
      const tentativeText = `${combinedText} ${next.word}`;
      const tentativeTotalTime = next.end - first.start;
      const strippedCurr = curr.word.replace(/[^A-Za-z0-9]/g, '');
      const strippedNext = next.word.replace(/[^A-Za-z0-9]/g, '');
      const singleLetterIsCurr = strippedCurr.length === 1;
      const singleLetterIsNext = strippedNext.length === 1;
      const singleLetterOnScreen = singleLetterIsCurr
        ? currOnScreen
        : singleLetterIsNext
          ? nextOnScreen
          : Infinity;
      const singleLetterMerge =
        (singleLetterIsCurr || singleLetterIsNext) &&
        singleLetterOnScreen < HEADLINE_FAST_WORD_MAX &&
        gap >= 0 &&
        gap < HEADLINE_SINGLE_LETTER_MERGE_MAX_GAP &&
        wordsSoFar < HEADLINE_GROUP_MAX_WORDS &&
        tentativeText.length <= HEADLINE_GROUP_MAX_TOTAL_LEN;
      const eligible =
        singleLetterMerge ||
        (gap >= 0 &&
          gap < HEADLINE_GROUP_MAX_GAP &&
          (currOnScreen < HEADLINE_FAST_WORD_MAX || nextOnScreen < HEADLINE_FAST_WORD_MAX) &&
          wordsSoFar < HEADLINE_GROUP_MAX_WORDS &&
          tentativeText.length <= HEADLINE_GROUP_MAX_TOTAL_LEN &&
          tentativeTotalTime <= HEADLINE_GROUP_MAX_TOTAL_TIME);
      if (!eligible) break;
      j += 1;
      combinedText = tentativeText;
      longestSungDur = Math.max(longestSungDur, next.end - next.start);
    }
    const last = words[j];
    groups.push({
      text: combinedText,
      start: first.start,
      end: last.end,
      nextStart: j + 1 < words.length ? words[j + 1].start : null,
      longestSungDur,
      isSingleWord: i === j,
      isHighlighted: i === j ? first.isHighlighted : undefined,
    });
    i = j + 1;
  }

  for (let k = groups.length - 1; k > 0; k -= 1) {
    const g = groups[k];
    const stripped = g.text.replace(/[^A-Za-z0-9]/g, '');
    if (!g.isSingleWord || stripped.length !== 1) continue;
    const prev = groups[k - 1];
    if (g.start - prev.end > HEADLINE_SINGLE_LETTER_MERGE_MAX_GAP) continue;
    const gOnScreen = (g.nextStart ?? g.end) - g.start;
    if (gOnScreen >= HEADLINE_FAST_WORD_MAX) continue;
    const mergedText = `${prev.text} ${g.text}`;
    if (mergedText.length > HEADLINE_GROUP_MAX_TOTAL_LEN) continue;
    groups[k - 1] = {
      text: mergedText,
      start: prev.start,
      end: g.end,
      nextStart: g.nextStart,
      longestSungDur: Math.max(prev.longestSungDur, g.longestSungDur),
      isSingleWord: false,
      isHighlighted: undefined,
    };
    groups.splice(k, 1);
  }

  return groups;
}

// ─── WaveSlot.tsx:39–137 ─────────────────────────────────────────────────────

export interface WaveWordItem {
  text: string;
  start: number;
  end: number;
}

export const WAVE_MIN_ITEM_DURATION = 0.55;
export const WAVE_MAX_WORDS_PER_ITEM = 3;
export const WAVE_MAX_INTRA_PHRASE_GAP = 0.18;
const WAVE_SENTENCE_END_RE = /[.!?,;:—–]$/;

export function waveGroupWords(words: WordTiming[]): WaveWordItem[] {
  if (!words || words.length === 0) return [];
  const out: WaveWordItem[] = [];
  let i = 0;
  while (i < words.length) {
    let group: WaveWordItem = { text: words[i].word, start: words[i].start, end: words[i].end };
    let count = 1;
    while (
      count < WAVE_MAX_WORDS_PER_ITEM &&
      i + 1 < words.length &&
      group.end - group.start < WAVE_MIN_ITEM_DURATION &&
      words[i + 1].start - group.end <= WAVE_MAX_INTRA_PHRASE_GAP &&
      !WAVE_SENTENCE_END_RE.test(group.text)
    ) {
      const next = words[i + 1];
      group = {
        text: `${group.text} ${next.word}`,
        start: group.start,
        end: next.end,
      };
      count++;
      i++;
    }
    out.push(group);
    i++;
  }
  return out;
}

export const WAVE_ROWS_ABOVE = 5;
export const WAVE_ROWS_BELOW = 5;

export function waveHashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function waveSeededFloat(seed: number, salt: number): number {
  let x = (seed ^ (salt * 0x9e3779b9)) >>> 0;
  x ^= x << 13; x >>>= 0;
  x ^= x >>> 17;
  x ^= x << 5; x >>>= 0;
  return (x % 100000) / 100000;
}

export interface WaveVariant {
  waveNumber: number;
  waveSpeed: number;
  phaseOffset: number;
  amplitudeMul: number;
  harmonicMix: number;
  harmonicRatio: number;
}

export function waveDeriveVariant(words: WordTiming[]): WaveVariant {
  if (!words || words.length === 0) {
    return {
      waveNumber: 1.0,
      waveSpeed: 0.08,
      phaseOffset: 0,
      amplitudeMul: 1,
      harmonicMix: 0,
      harmonicRatio: 2,
    };
  }
  const sample = [
    words.length,
    words[0].word,
    words[Math.floor(words.length / 3)]?.word ?? '',
    words[Math.floor(words.length / 2)]?.word ?? '',
    words[words.length - 1].word,
    words[0].start.toFixed(2),
    words[words.length - 1].end.toFixed(2),
  ].join('|');
  const seed = waveHashString(sample);
  const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
  return {
    waveNumber: lerp(0.6, 1.5, waveSeededFloat(seed, 1)),
    waveSpeed: lerp(0.05, 0.12, waveSeededFloat(seed, 2)),
    phaseOffset: waveSeededFloat(seed, 3) * Math.PI * 2,
    amplitudeMul: lerp(0.8, 1.2, waveSeededFloat(seed, 4)),
    harmonicMix: lerp(0, 0.35, waveSeededFloat(seed, 5)),
    harmonicRatio: lerp(1.7, 2.6, waveSeededFloat(seed, 6)),
  };
}

// ─── AnimatedLyricsSlot.tsx:97–194 ───────────────────────────────────────────

/** Derive a 0–1 beat intensity from bass-range bins. */
export function kineticBeatIntensity(frequencyData: ArrayLike<number> | undefined): number {
  if (!frequencyData || frequencyData.length === 0) return 0;
  const bassEnd = Math.max(1, Math.floor(frequencyData.length * 0.10));
  let sum = 0;
  for (let i = 0; i < bassEnd; i++) sum += frequencyData[i];
  return Math.min(1, sum / bassEnd / 220);
}

/** Binary search — last line whose startFrame <= frame. */
export function kineticFindActiveIdx(lines: DisplayLine[], frame: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let active = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].startFrame <= frame) {
      active = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return active;
}

function kineticPhraseAbsoluteWords(
  allWords: WordTiming[] | undefined,
  phraseStart: number,
  phraseEnd: number,
): WordTiming[] {
  if (!allWords || allWords.length === 0) return [];
  const TOLERANCE = 0.15;
  return allWords.filter((w) => w.start >= phraseStart - TOLERANCE && w.start < phraseEnd + TOLERANCE);
}

function kineticNormalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9']/g, '');
}

export interface KineticResolvedPhrase extends LyricPhrase {
  renderStart: number;
  renderEnd: number;
  matchedWords: WordTiming[];
}

export function kineticResolvePhrases(
  phrases: LyricPhrase[],
  lyricsWords: WordTiming[] | undefined,
  fps: number,
): KineticResolvedPhrase[] {
  let wordCursor = 0;

  return phrases.map((phrase) => {
    const phraseTokens = phrase.text.split(/\s+/).map(kineticNormalizeToken).filter(Boolean);
    let matchedWords: WordTiming[] = [];

    if (lyricsWords && lyricsWords.length > 0 && phraseTokens.length > 0) {
      for (let startIdx = wordCursor; startIdx <= lyricsWords.length - phraseTokens.length; startIdx++) {
        let isMatch = true;
        for (let tokenIdx = 0; tokenIdx < phraseTokens.length; tokenIdx++) {
          if (kineticNormalizeToken(lyricsWords[startIdx + tokenIdx].word) !== phraseTokens[tokenIdx]) {
            isMatch = false;
            break;
          }
        }
        if (isMatch) {
          matchedWords = lyricsWords.slice(startIdx, startIdx + phraseTokens.length);
          wordCursor = startIdx + phraseTokens.length;
          break;
        }
      }
    }

    if (matchedWords.length === 0) {
      matchedWords = kineticPhraseAbsoluteWords(lyricsWords, phrase.start, phrase.end);
    }

    const matchedStart = matchedWords.length > 0 ? matchedWords[0].start : phrase.start;
    const matchedEnd = matchedWords.length > 0 ? matchedWords[matchedWords.length - 1].end : phrase.end;
    const renderStart = phrase.timingLocked ? phrase.start : matchedStart;
    const baseEnd = phrase.timingLocked ? phrase.end : Math.max(matchedEnd, phrase.end);
    const renderEnd = Math.max(baseEnd, renderStart + 2 / fps);

    return {
      ...phrase,
      renderStart,
      renderEnd,
      matchedWords,
    };
  });
}

/** Crossfade window (AnimatedLyricsSlot.tsx:205). */
export const KINETIC_CROSSFADE_FRAMES = 4;

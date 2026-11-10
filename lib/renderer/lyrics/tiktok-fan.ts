/**
 * lib/renderer/lyrics/tiktok-fan.ts — Canvas2D port of TikTokFanSlot.tsx.
 * The original ALREADY renders into an HTML canvas (TikTokFanSlot.tsx:417–505),
 * so this port replays the same drawing calls into the composite canvas —
 * the upstream phrase/window/balance logic lives in shared.ts (verbatim).
 *
 * Per-pixel artwork sampling (backgroundImageUrl) is deprecated upstream
 * (:29–32, :68) and intentionally not ported.
 */
import type { WordTiming } from '@/lib/renderer/types';
import type { LyricPhrase } from '@/lib/renderer/vendor/slots/lyricPhrase';
import type { ThemeConfig } from '@/constants/themes';
import {
  buildLines,
  ttfBalanceWords,
  ttfBuildDisplayWindows,
  ttfLineWidthPx,
  ttfPrepareWords,
  ttfRepairPhrases,
  TTF_MAX_BLOCK_WIDTH_RATIO_LANDSCAPE,
  TTF_MAX_BLOCK_WIDTH_RATIO_PORTRAIT,
  TTF_STROKE_ON_DARK,
  TTF_STROKE_ON_LIGHT,
  TTF_TEXT_ON_DARK,
  TTF_TEXT_ON_LIGHT,
  TTF_WORD_GAP_EM,
  type TtfDisplayWindow,
} from './shared';

let _measureCanvas: HTMLCanvasElement | null = null;

/** TikTokFanSlot.tsx:130–139 — shared 2D context for word measurement. */
function getMeasureCtx(fontSize: number, fontFamily: string): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!_measureCanvas) _measureCanvas = document.createElement('canvas');
  const ctx = _measureCanvas.getContext('2d');
  if (!ctx) return null;
  ctx.font = `600 ${fontSize}px ${fontFamily}`;
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
    `${-0.01 * fontSize}px`;
  return ctx;
}

export interface TikTokFanPrepared {
  displayWindows: TtfDisplayWindow[];
}

/** LyricBand-level phrase resolution + the slot's useMemo chain (:527–542). */
export function prepareTikTokFan(
  words: WordTiming[],
  phrases: LyricPhrase[] | undefined,
  fps: number,
): TikTokFanPrepared {
  const resolvedPhrases: LyricPhrase[] =
    phrases && phrases.length > 0
      ? phrases
      : buildLines(words, fps).map((l) => ({
          text: l.text,
          start: l.startFrame / fps,
          end: l.endFrame / fps,
        }));
  return {
    displayWindows: ttfBuildDisplayWindows(ttfRepairPhrases(resolvedPhrases), words),
  };
}

export interface TikTokFanDrawArgs {
  words: WordTiming[];
  width: number;
  height: number;
  theme: ThemeConfig;
  fontSizeScale: number;
  fontFamily?: string;
}

/** TikTokFanSlot.tsx:544–653 + CanvasLyricBlock draw (:417–477). */
export function drawTikTokFan(
  ctx: CanvasRenderingContext2D,
  prepared: TikTokFanPrepared,
  args: TikTokFanDrawArgs,
  frame: number,
  fps: number,
): void {
  const { words, theme, fontSizeScale } = args;
  const width = Math.max(1, Math.round(args.width));
  const height = Math.max(1, Math.round(args.height));
  const { displayWindows } = prepared;

  const activeWindow = displayWindows.find((w) => {
    const startFrame = w.start * fps;
    const endFrame = w.end * fps;
    return frame >= startFrame && frame <= endFrame;
  });
  const active = activeWindow?.phrase ?? null;
  if (!active || !activeWindow) return;

  // :558–590 — the phrase's words with their real sung timestamps, lowercased.
  let phraseWords: WordTiming[];
  {
    const activeIndex = displayWindows.indexOf(activeWindow);
    const nextPhraseStart =
      activeIndex >= 0 && activeIndex + 1 < displayWindows.length
        ? displayWindows[activeIndex + 1].phrase.start
        : Infinity;
    const matched = words
      .filter((w) => w.start >= active.start - 0.05 && w.start < nextPhraseStart - 0.05)
      .map((w) => ({ ...w, word: w.word.toLowerCase().trim() }));
    if (matched.length > 1) {
      const firstAloneTime = matched[1].start - matched[0].start;
      if (firstAloneTime > 0.8) {
        matched[0] = { ...matched[0], start: matched[1].start };
      }
    }
    phraseWords =
      matched.length > 0
        ? matched
        : active.text
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map((word) => ({
              word: word.toLowerCase(),
              start: activeWindow.start,
              end: activeWindow.end,
            }));
  }
  if (phraseWords.length === 0) return;

  const minDim = Math.min(width, height);
  const fontSize = Math.max(24, Math.round(minDim * 0.105 * fontSizeScale));
  const resolvedFontFamily = args.fontFamily || 'Nunito';

  // :599–604 — measure with the real theme font.
  const mCtx = getMeasureCtx(fontSize, resolvedFontFamily);
  if (!mCtx) return;
  const gapPx = fontSize * TTF_WORD_GAP_EM;
  const measureLine = (line: WordTiming[]) => ttfLineWidthPx(line, mCtx, gapPx) / fontSize;

  const maxBlockPx =
    width * (width > height ? TTF_MAX_BLOCK_WIDTH_RATIO_LANDSCAPE : TTF_MAX_BLOCK_WIDTH_RATIO_PORTRAIT);
  const maxLineWidthEm = maxBlockPx / fontSize;

  const prepared2 = ttfPrepareWords(phraseWords, measureLine, maxLineWidthEm * 0.9);
  const { lines, targetWidthEm, referenceIndex } = ttfBalanceWords(prepared2, measureLine, maxLineWidthEm);
  if (lines.length === 0) return;

  const referenceNaturalPx = targetWidthEm * fontSize;
  const blockScale = referenceNaturalPx > maxBlockPx ? maxBlockPx / referenceNaturalPx : 1;
  const effFontSize = Math.round(fontSize * blockScale);
  const effBlockWidth = Math.round(referenceNaturalPx * blockScale);

  const isLight = !!theme.lightBackground;
  const textColor = theme.textColor || (isLight ? TTF_TEXT_ON_LIGHT : TTF_TEXT_ON_DARK);
  const outlineColor = isLight ? TTF_STROKE_ON_LIGHT : TTF_STROKE_ON_DARK;

  // ── CanvasLyricBlock draw (DPR 1 — the composite canvas replaces the slot's
  // own canvas; the calls are identical). ──
  ctx.save();
  ctx.font = `600 ${effFontSize}px ${resolvedFontFamily}`;
  ctx.textBaseline = 'alphabetic';
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
    `${-0.01 * effFontSize}px`;

  ctx.fillStyle = textColor;
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = Math.max(1, effFontSize * 0.018);

  const lineHeightPx = effFontSize * 1.15;
  const totalH = lineHeightPx * (lines.length - 1);
  const pad = height * 0.08;
  // position is hardcoded 'middle' upstream (:525).
  const startY = height / 2 - totalH / 2;
  const blockLeft = (width - effBlockWidth) / 2;

  lines.forEach((line, i) => {
    const measured = line.map((w) => ({ ...w, px: ctx.measureText(w.word).width }));
    const wordsWidth = measured.reduce((s, w) => s + w.px, 0);
    const normalGap = effFontSize * TTF_WORD_GAP_EM;
    const gap =
      line.length <= 1
        ? 0
        : i === referenceIndex
          ? normalGap
          : Math.max(normalGap, (effBlockWidth - wordsWidth) / (line.length - 1));
    const y = startY + i * lineHeightPx;
    let x = blockLeft;
    if (line.length === 1) x = blockLeft + (effBlockWidth - measured[0].px) / 2;
    for (const w of measured) {
      if (frame >= w.start * fps) {
        ctx.strokeText(w.word, x, y);
        ctx.fillText(w.word, x, y);
      }
      x += w.px + gap;
    }
  });
  ctx.restore();
}

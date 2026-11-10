/**
 * lib/renderer/lyrics/headline.ts — Canvas2D port of HeadlineSlot.tsx.
 * Grouping/windowing logic lives in shared.ts (verbatim); this file ports the
 * per-frame window math (:231–405) and replaces the DOM flex centring with the
 * 1.4 line-box model (glyphs centred in a fontSize × lineHeight:1 box ==
 * textBaseline 'middle' at the box centre).
 *
 * Font sizing is HEURISTIC upstream (0.72 avg-glyph × safety margin,
 * :308–327) — no DOM measurement — so both sides compute identical sizes.
 */
import type { WordTiming } from '@/lib/renderer/types';
import type { ThemeConfig } from '@/constants/themes';
import { Easing, interpolate } from '../timing';
import { applyTextShadow, setLetterSpacingEm } from '../overlays/text';
import {
  hasArabicScript,
  hasNonLatinScript,
  headlineBuildGroups,
  headlineWithAlpha,
  withScriptFallbackFonts,
  HEADLINE_MAX_AUTO_EMPHASIS,
  type HeadlineGroup,
} from './shared';

export interface HeadlinePrepared {
  groups: HeadlineGroup[];
  autoEmphasisIdx: Set<number>;
}

export function prepareHeadline(words: WordTiming[]): HeadlinePrepared {
  const groups = headlineBuildGroups(words);
  // :219–228 — cap the automatic linger/stack treatment to the N most
  // sustained single-word groups across the whole transcription.
  const autoEmphasisIdx = new Set(
    groups
      .map((g, i) => ({ i, sungDur: Math.max(0, g.end - g.start) }))
      .filter(({ i }) => groups[i].isHighlighted === undefined && groups[i].isSingleWord)
      .sort((a, b) => b.sungDur - a.sungDur)
      .slice(0, HEADLINE_MAX_AUTO_EMPHASIS)
      .map(({ i }) => i),
  );
  return { groups, autoEmphasisIdx };
}

export interface HeadlineDrawArgs {
  width: number;
  height: number;
  theme: ThemeConfig;
  fontFamily?: string;
  fontSizeScale: number;
}

export function drawHeadline(
  ctx: CanvasRenderingContext2D,
  prepared: HeadlinePrepared,
  args: HeadlineDrawArgs,
  frame: number,
  fps: number,
): void {
  const { width, height, theme, fontFamily, fontSizeScale } = args;
  const { groups, autoEmphasisIdx } = prepared;

  const currentSec = frame / fps;
  // :232–246 — active group: last whose start <= currentSec (binary search).
  let activeIdx = -1;
  {
    let lo = 0;
    let hi = groups.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (groups[mid].start <= currentSec) {
        activeIdx = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
  }
  if (activeIdx < 0) return;
  const group = groups[activeIdx];
  const word = { word: group.text, start: group.start, end: group.end };

  // :254–292 — display window (linger overlap, far-gap tail, readability floor).
  const sungDurEarly = group.isSingleWord ? group.longestSungDur : 0;
  const gapToNext = group.nextStart != null ? group.nextStart - word.end : null;
  const LINGER_OVERLAP_MAX = 0.45;
  const LINGER_OVERLAP_GAP_MAX = 0.3;
  const lingerOverlap =
    group.nextStart != null && sungDurEarly > 0.9
      ? gapToNext != null && gapToNext <= LINGER_OVERLAP_GAP_MAX
        ? Math.min(LINGER_OVERLAP_MAX, (sungDurEarly - 0.9) * 0.35)
        : 0
      : 0;
  const MAX_TAIL_AFTER_SUNG = 2.6;
  const tail = Math.min(MAX_TAIL_AFTER_SUNG, 1.2 + sungDurEarly * 0.5);
  const cappedEnd = word.end + tail;
  const displayEnd =
    group.nextStart != null ? Math.min(group.nextStart + lingerOverlap, cappedEnd) : cappedEnd;
  const MIN_VISIBLE_SEC = 0.28;
  const NEXT_GROUP_BREATH = 0.04;
  const earliestNext = group.nextStart != null ? group.nextStart - NEXT_GROUP_BREATH : Infinity;
  const minimumEnd = Math.min(word.start + MIN_VISIBLE_SEC, earliestNext);
  const displayEndFinal = Math.max(displayEnd, minimumEnd);
  if (currentSec > displayEndFinal) return;

  const wordStartFrame = Math.floor(word.start * fps);
  const displayEndFrame = Math.floor(displayEndFinal * fps);
  const framesIn = frame - wordStartFrame;
  const totalFrames = Math.max(1, displayEndFrame - wordStartFrame);

  const inFrames = Math.min(Math.round(fps * 0.08), totalFrames);
  const baseOutFrames = Math.round(fps * 0.08);

  // :308–327 — heuristic font sizing (no DOM measurement upstream).
  const isPortrait = height > width;
  const baseSize = Math.round(height * (isPortrait ? 0.11 : 0.14) * fontSizeScale);
  const sideGutter = width * (isPortrait ? 0.08 : 0.06);
  const maxWidth = width - sideGutter * 2;
  const avgGlyph = 0.72;
  const safetyMargin = isPortrait ? 1.10 : 1.06;
  const widthEstimate = word.word.length * baseSize * avgGlyph * safetyMargin;
  const fontSize =
    widthEstimate > maxWidth ? Math.max(12, Math.floor(baseSize * (maxWidth / widthEstimate))) : baseSize;

  const textColor = theme.textColor || '#ffffff';
  // position is 'middle' for every LyricBand consumer — verticalOffset = 0 (:330).
  const verticalOffset = 0;

  // :342–374 — linger stack emphasis.
  const sungDur = Math.max(0, word.end - word.start);
  const LINGER_MIN = 0.9;
  const LINGER_STEP = 0.35;
  const MAX_STACK = 3;
  const isAutoEmphasisCandidate = autoEmphasisIdx.has(activeIdx);
  const effectiveSungDur =
    group.isHighlighted === false
      ? 0
      : group.isHighlighted === true
        ? Math.max(sungDur, LINGER_MIN + LINGER_STEP)
        : isAutoEmphasisCandidate
          ? sungDur
          : 0;
  const isLinger = effectiveSungDur > LINGER_MIN;
  const stackCount = isLinger
    ? Math.min(MAX_STACK, 1 + Math.floor((effectiveSungDur - LINGER_MIN) / LINGER_STEP))
    : 0;
  const lingerIntensity = isLinger ? Math.min(1, (effectiveSungDur - LINGER_MIN) / 1.6) : 0;
  const outFrames = Math.min(totalFrames, baseOutFrames + Math.round(fps * 0.37 * lingerIntensity));
  const exit = interpolate(
    framesIn,
    [Math.max(0, totalFrames - outFrames), totalFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic) },
  );
  const opacity = exit;

  // :402–405 — breathing drift on the stacked copies.
  const drift =
    Math.sin((framesIn / fps) * (1.4 + lingerIntensity * 0.8)) * fontSize * (0.04 + lingerIntensity * 0.05);

  const activeText = word.word;
  // language is never passed by LyricBand → RTL inferred from the text (:408–411).
  const useRtl = hasArabicScript(activeText);
  const disableUppercase = hasNonLatinScript(activeText);
  const displayText = disableUppercase ? activeText : activeText.toUpperCase();
  const letterSpacingEm = disableUppercase ? 0 : -0.02;

  const cx = width / 2;
  const cy = height / 2 + verticalOffset;

  ctx.save();
  ctx.font = `900 ${fontSize}px ${withScriptFallbackFonts(fontFamily)}`;
  setLetterSpacingEm(ctx, letterSpacingEm, fontSize);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  (ctx as CanvasRenderingContext2D & { direction: CanvasDirection }).direction = useRtl ? 'rtl' : 'ltr';

  const strokeW = Math.max(1, Math.round(fontSize * 0.018));

  // :431–493 + :506–511 — stacked outline copies (painted before the main word).
  const outlineCopy = (offsetIndex: number) => {
    const depth = Math.abs(offsetIndex);
    const dir = Math.sign(offsetIndex);
    const yOffset = dir * fontSize * (1.02 * depth) + drift * dir * 0.5;
    const baseLayerOpacity = 0.62 - (depth - 1) * 0.13;
    const orderIndex =
      offsetIndex < 0 ? stackCount + offsetIndex : stackCount + offsetIndex - 1;
    const totalLayers = Math.max(1, stackCount * 2);
    const cascadeFrac = orderIndex / totalLayers;
    const cascadeFrames = Math.max(1, Math.round(fps * 0.55));
    const perLayerFrames = Math.max(1, Math.round(fps * 0.22));
    const startDelay = Math.round(cascadeFrac * cascadeFrames);
    const layerStart = inFrames + startDelay;
    const layerEnd = layerStart + perLayerFrames;
    const layerEntry = interpolate(framesIn, [layerStart, layerEnd], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    });
    const layerOpacity = Math.max(0, baseLayerOpacity + lingerIntensity * 0.12) * layerEntry * opacity;
    const slide = (1 - layerEntry) * fontSize * 0.18;
    const strokeColor = headlineWithAlpha(textColor, layerOpacity);
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeW;
    ctx.strokeText(displayText, cx, cy + yOffset - slide);
    ctx.restore();
  };

  if (stackCount > 0) {
    for (let i = 0; i < stackCount; i++) outlineCopy(-(i + 1));
    for (let i = 0; i < stackCount; i++) outlineCopy(i + 1);
  }

  // :512–522 — main word (alpha-faded; textShadow rides the same globalAlpha).
  applyTextShadow(ctx, theme.textShadow || (theme.lightBackground ? 'none' : '0 2px 24px rgba(0,0,0,0.85)'));
  ctx.fillStyle = textColor;
  ctx.globalAlpha *= opacity;
  ctx.fillText(displayText, cx, cy);
  ctx.restore();
}

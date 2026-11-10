/**
 * lib/renderer/lyrics/kinetic.ts — Canvas2D port of the LyricBand kinetic path:
 * AnimatedLyricsSlot.tsx hardcoded to InkBleed (LyricBand.tsx:150–157 —
 * lyricStyle="InkBleed", disableWrapperTransitions, position 'middle') →
 * lyric-styles/InkBleed.tsx.
 *
 * InkBleed's DOM geometry, replicated (InkBleed.tsx:80–163):
 *   - the justified column (useJustifiedLayout → justifiedLayoutCore, reused
 *     verbatim) is centred in the band: block at ((w−containerW)/2,
 *     (h−blockH)/2);
 *   - each sub-line is a flex row of ONE-CHAR inline-block spans (so no
 *     kerning between chars; each span is adv(ch) + 0.03em wide, the trailing
 *     letter-spacing included), words joined by 0.3em spacer spans;
 *   - a line's spans are vertically centred in an fs×1.1 row; each span is fs
 *     tall (lineHeight:1), so glyphs sit at the 1.4 line-box middle
 *     (textBaseline 'middle' at spanTop + fs/2);
 *   - per-char scale anchors at the span's CENTRE BOTTOM (spanTop + fs);
 *   - CSS blur() maps to ctx.filter blur() (same Skia gaussian in Chromium);
 *   - the phrase-level exitOpacity applies when every char is crisp and
     fully opaque, so per-char globalAlpha (char × exit) is exact.
 *
 * The AnimatedLyricsSlot wrapper (AnimatedLyricsSlot.tsx:379–387) clips to the
 * band and applies the beat transform (scale around centre + lift); like the
 * 1.4 hook wrapper, the content is rasterized at natural size and blitted
 * with the transform when it's non-identity.
 */
import type { WordTiming } from '@/lib/renderer/types';
import type { LyricPhrase } from '@/lib/renderer/vendor/slots/lyricPhrase';
import type { ThemeConfig } from '@/constants/themes';
import type { DisplayLine } from './shared';
import {
  buildJustifiedLayoutFromLines,
  buildHighlightSet,
  isWordHighlighted,
  kineticBeatIntensity,
  kineticFindActiveIdx,
  kineticResolvePhrases,
  splitIntoWordGroups,
  KINETIC_CROSSFADE_FRAMES,
  type KineticResolvedPhrase,
} from './shared';
import { applyTextShadow, setLetterSpacingEm } from '../overlays/text';
import { interpolate } from '../timing';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

// ─── Slot plumbing (AnimatedLyricsSlot.tsx:244–301) ─────────────────────────

export interface KineticPrepared {
  lines: DisplayLine[];
  resolvedPhrases: KineticResolvedPhrase[];
  lineDurations: number[];
}

export function prepareKinetic(
  phrases: LyricPhrase[],
  lyricsWords: WordTiming[],
  fps: number,
): KineticPrepared {
  const MIN_PHRASE_SECS = 6 / fps;
  const filtered = phrases
    .filter((p) => p.text.trim().length > 0 && p.end - p.start >= MIN_PHRASE_SECS)
    .sort((a, b) => a.start - b.start);
  const resolvedPhrases = kineticResolvePhrases(filtered, lyricsWords, fps);
  const lines = resolvedPhrases.map((phrase) => ({
    words: [],
    text: phrase.text,
    startFrame: Math.floor(phrase.renderStart * fps),
    endFrame: Math.ceil(phrase.renderEnd * fps),
  }));
  const lineDurations = lines.map((line, idx) => {
    const phraseDur = Math.max(1, line.endFrame - line.startFrame);
    const tailFrames = Math.max(3, Math.round(fps * 0.20));
    if (idx < lines.length - 1) {
      const nextStart = lines[idx + 1].startFrame;
      const displayEnd = Math.min(nextStart, line.endFrame + tailFrames);
      return Math.max(1, displayEnd - line.startFrame);
    }
    return phraseDur + tailFrames;
  });
  return { lines, resolvedPhrases, lineDurations };
}

// ─── InkBleed phrase renderer ────────────────────────────────────────────────

interface InkBleedParams {
  text: string;
  frame: number;
  durationInFrames: number;
  width: number;
  height: number;
  color: string;
  accentColor: string;
  fontFamily: string;
  highlightWords?: string[];
}

export function drawInkBleedPhrase(ctx: CanvasRenderingContext2D, p: InkBleedParams): void {
  const hlSet = buildHighlightSet(p.highlightWords);

  // useJustifiedLayout(text, width, height, {fontFamily, fontWeight: 700,
  // letterSpacingEm: 0.03, lineHeightRatio: 1.1}) — hook body unwrapped.
  const containerW = Math.round(p.width * 0.58);
  const maxBlockH = p.height * 0.52;
  const words = p.text.split(' ').filter(Boolean);
  const subLines = splitIntoWordGroups(words, words.length === 1 ? 1 : 2).map((line) =>
    line.split(' '),
  );
  const layout = buildJustifiedLayoutFromLines(
    subLines.map((line) => line.join(' ')),
    {
      containerW,
      maxBlockH,
      fontWeight: 700,
      letterSpacingEm: 0.03,
      fontFamily: p.fontFamily,
      lineHeightRatio: 1.1,
      minFontSize: 18,
      maxFontSize: 1200,
    },
  );
  const { lineFontSizes, blockH, lineHeightRatio } = layout;

  const SETTLE = 6;
  const STAGGER = 2;
  const EXIT_DUR = Math.min(10, Math.max(2, Math.floor(p.durationInFrames * 0.3)));
  const exitStart = Math.max(0, p.durationInFrames - EXIT_DUR);
  const exitOpacity = interpolate(p.frame, [exitStart, p.durationInFrames], [1, 0], clamp);

  const allChars = subLines.flat().join('');
  const totalChars = Array.from(allChars).length;

  const maxStagger = totalChars > 1 ? (exitStart - SETTLE) / (totalChars - 1) : STAGGER;
  const instant = maxStagger < 0.5;
  const effectiveSettle = instant ? 1 : SETTLE;
  const effectiveStagger = instant ? 0 : Math.min(STAGGER, Math.floor(maxStagger));

  const wordCharStarts: number[][] = [];
  {
    let running = 0;
    for (const lineWords of subLines) {
      const lineStarts: number[] = [];
      for (const rawWord of lineWords) {
        lineStarts.push(running);
        running += Array.from(rawWord.toUpperCase()).length;
      }
      wordCharStarts.push(lineStarts);
    }
  }

  // Geometry: the justified block is centred in the band (outer flex, inset 0).
  const blockLeft = (p.width - containerW) / 2;
  const blockTop = (p.height - blockH) / 2;

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  // Char spans draw/measured as raw glyph advances (+0.03em handled manually),
  // so make sure no inherited letter-spacing leaks in from the composite ctx.
  setLetterSpacingEm(ctx, 0, 1);

  let lineTop = blockTop;
  subLines.forEach((lineWords, li) => {
    const fs = lineFontSizes[li];
    const lsPx = 0.03 * fs;
    ctx.font = `700 ${fs}px ${p.fontFamily}`;

    // Row geometry (DOM flex row, verified against probes): each char span is
    // adv(ch) + lsPx wide — INCLUDING the word/line-final char (Chrome puts
    // the trailing letter-spacing inside the inline-block). The 0.3em word
    // spacer spans are the ONLY flex items that can shrink (their min-content
    // is 0; a text span can't shrink below its glyph), so when the row
    // exceeds containerW the overflow is absorbed by the spacers equally
    // (down to 0), and the result is centred in containerW — overflowing both
    // sides when the content is wider still.
    const wordChars = lineWords.map((rawWord) => Array.from(rawWord.toUpperCase()));
    const wordWidths = wordChars.map((chars) =>
      chars.reduce((s, ch) => s + ctx.measureText(ch).width + lsPx, 0),
    );
    const nSpacers = Math.max(0, lineWords.length - 1);
    const naturalSpacerW = 0.3 * fs;
    const contentW = wordWidths.reduce((s, w) => s + w, 0) + nSpacers * naturalSpacerW;
    const spacerW =
      contentW > containerW && nSpacers > 0
        ? Math.max(0, naturalSpacerW - (contentW - containerW) / nSpacers)
        : naturalSpacerW;
    const rowWidth = wordWidths.reduce((s, w) => s + w, 0) + nSpacers * spacerW;
    let x = blockLeft + (containerW - rowWidth) / 2;

    // Spans are fs tall, centred in the fs×1.1 flex row.
    const spanTop = lineTop + (fs * lineHeightRatio - fs) / 2;
    const glyphMiddleY = spanTop + fs / 2;

    lineWords.forEach((rawWord, wi) => {
      if (wi > 0) x += spacerW;
      const displayText = rawWord.toUpperCase();
      const chars = Array.from(displayText);
      const wordIsHL = isWordHighlighted(rawWord, hlSet);
      const wordCharStart = wordCharStarts[li][wi];

      chars.forEach((ch, ci) => {
        const charW = ctx.measureText(ch).width + lsPx;
        const charStart = instant ? -1 : (wordCharStart + ci) * effectiveStagger;
        const rawT = interpolate(p.frame, [charStart, charStart + effectiveSettle], [0, 1], clamp);
        const easedT = easeOutQuart(rawT);

        const blur = interpolate(easedT, [0, 1], [12, 0], clamp);
        const scale = interpolate(easedT, [0, 1], [1.4, 1.0], clamp);
        const opacity = interpolate(Math.min(rawT * 2.5, 1), [0, 1], [0, 1], clamp);
        const blendedColor =
          interpolate(easedT, [0, 1], [1, 0], clamp) > 0.05 || wordIsHL
            ? p.accentColor
            : p.color;

        ctx.save();
        ctx.globalAlpha *= opacity * exitOpacity;
        // transformOrigin 'center bottom' of the span (spanTop + fs).
        const originX = x + charW / 2;
        const originY = spanTop + fs;
        ctx.translate(originX, originY);
        ctx.scale(scale, scale);
        ctx.translate(-originX, -originY);
        if (blur > 0) {
          (ctx as CanvasRenderingContext2D & { filter: string }).filter = `blur(${blur}px)`;
        }
        if (blur > 1) {
          applyTextShadow(ctx, `0 0 ${Math.round(blur * 3)}px ${p.accentColor}88`);
        }
        ctx.fillStyle = blendedColor;
        ctx.fillText(ch, x, glyphMiddleY);
        ctx.restore();

        x += charW;
      });
    });

    lineTop += fs * lineHeightRatio;
  });
  ctx.restore();
}

// ─── Slot draw (AnimatedLyricsSlot.tsx:282–473, InkBleed + no wrappers) ─────

export interface KineticDrawArgs {
  width: number;
  height: number;
  theme: ThemeConfig;
  fontFamily?: string;
  fontSizeScale: number;
}

export function drawKinetic(
  ctx: CanvasRenderingContext2D,
  prepared: KineticPrepared,
  args: KineticDrawArgs,
  frame: number,
  fps: number,
  frequencyData: ArrayLike<number>,
): void {
  const { width, height, theme, fontSizeScale } = args;
  const fontFamily = args.fontFamily ?? 'Inter, Helvetica Neue, Arial, sans-serif';
  const { lines, resolvedPhrases, lineDurations } = prepared;

  const beat = kineticBeatIntensity(frequencyData);
  const beatScale = (1 + beat * 0.045) * fontSizeScale;
  const beatY = -beat * 6;

  const activeIdx = kineticFindActiveIdx(lines, frame);
  const line = activeIdx >= 0 ? lines[activeIdx] : null;
  const localFrame = line ? frame - line.startFrame : 0;
  const duration = activeIdx >= 0 ? lineDurations[activeIdx] : 1;

  const inCrossfade = line !== null && localFrame < KINETIC_CROSSFADE_FRAMES;
  const prevIdx = inCrossfade && activeIdx > 0 ? activeIdx - 1 : -1;
  const prevLine = prevIdx >= 0 ? lines[prevIdx] : null;
  const prevDuration = prevIdx >= 0 ? lineDurations[prevIdx] : 1;
  const prevLocalFrame = prevLine ? line!.startFrame - prevLine.startFrame + localFrame : 0;

  const isInGap =
    activeIdx < 0 ||
    (line !== null &&
      frame > line.endFrame + KINETIC_CROSSFADE_FRAMES &&
      localFrame > duration + KINETIC_CROSSFADE_FRAMES);

  const accentColor = theme.accentColor || '#ffffff';
  const textColor = theme.textColor || '#ffffff';

  const activePhrase = activeIdx >= 0 ? resolvedPhrases[activeIdx] : null;
  const prevPhrase = prevIdx >= 0 ? resolvedPhrases[prevIdx] : null;

  const drawContent = (c: CanvasRenderingContext2D) => {
    // Outgoing line first (DOM paint order), then the incoming line.
    if (prevLine && inCrossfade) {
      drawInkBleedPhrase(c, {
        text: prevLine.text,
        frame: prevLocalFrame,
        durationInFrames: prevDuration,
        width,
        height,
        color: textColor,
        accentColor,
        fontFamily,
        highlightWords: prevIdx >= 0 ? resolvedPhrases[prevIdx]?.highlight : undefined,
      });
    }
    if (!isInGap && line) {
      drawInkBleedPhrase(c, {
        text: line.text,
        frame: localFrame,
        durationInFrames: duration,
        width,
        height,
        color: textColor,
        accentColor,
        fontFamily,
        highlightWords: activePhrase?.highlight,
      });
    }
  };

  // Wrapper transform (position 'middle'): scale(beatScale) translateY(beatY)
  // around the band centre — rasterize-then-blit like the 1.4 hook wrapper.
  if (beatScale !== 1 || beatY !== 0) {
    const tmp = document.createElement('canvas');
    tmp.width = Math.max(1, Math.round(width));
    tmp.height = Math.max(1, Math.round(height));
    const tctx = tmp.getContext('2d');
    if (!tctx) return;
    drawContent(tctx);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(beatScale, beatScale);
    ctx.translate(0, beatY);
    ctx.translate(-width / 2, -height / 2);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(tmp, 0, 0);
    ctx.restore();
  } else {
    // The AnimatedLyricsSlot wrapper AND the InkBleed root are overflow:hidden
    // — clip to the band so edge blurs can't bleed outside it.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
    drawContent(ctx);
    ctx.restore();
  }
}

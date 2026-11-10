/**
 * lib/renderer/overlays/layouts/tiktok.ts — Canvas2D port of TikTokLayout's
 * DOM layer: the AnimatedHook in the top solid zone and the bottom-zone
 * karaoke band (Phase 1.5 slot) with the outro handoff. The world (zones,
 * stamp, credit) renders via the 'tiktok-world' scene; this file is only the
 * DOM overlay on top.
 *
 * AnimatedHook (AnimatedHook.tsx): animate=false → static text; animate=true
 * → per-word fade+slide stagger (interpolate, clamped). TikTok Sans at the
 * tikTokType role weights replaces the theme font for every text role here.
 * All px metrics scale with the frame height (canonical at 1080×1920).
 */
import { balanceWrap, splitWrapWords } from '../text-wrap';
import { drawTextLine, fontString, setLetterSpacingEm } from '../text';
import { interpolate } from '../../timing';
import {
  TIKTOK_FONT_FAMILY,
  TIKTOK_HOOK_FONT_WEIGHT,
  creditText,
  hookMaxWidth,
  lyricHandoffOpacity,
  resolveTikTokFrameStyle,
  tiktokMetrics,
  widowJoin,
} from './tiktok-shared';
import type { LayoutDrawFn } from './types';

export const drawTikTokLayout: LayoutDrawFn = (ctx, args, frame) => {
  const { width, height, theme, hook } = args;
  const style = resolveTikTokFrameStyle(theme, args.frameColor, args.frameTextColor);
  const m = tiktokMetrics(height);

  const hookDisplay = widowJoin(hook ?? '');
  if (hookDisplay) {
    const wordCount = hook.trim().split(/\s+/).filter(Boolean).length;
    const maxWidth = hookMaxWidth(hook, wordCount, m);

    // CSS: whiteSpace pre-wrap + textWrap balance at maxWidth → balanceWrap.
    const font = fontString(TIKTOK_HOOK_FONT_WEIGHT, m.hookFontSize, TIKTOK_FONT_FAMILY);
    ctx.save();
    ctx.font = font;
    setLetterSpacingEm(ctx, -0.01, m.hookFontSize);
    const words = splitWrapWords(hookDisplay);
    const lines = balanceWrap(words, maxWidth, (s) => ctx.measureText(s).width);
    ctx.restore();

    const lineStep = m.hookFontSize * 1.25;
    // AnimatedHook centerBand: the text block is vertically centred on the
    // artwork imprint's span (flex alignItems:center).
    const firstLineMiddle =
      m.imprintBandCentre - ((lines.length - 1) * lineStep) / 2;

    if (args.animateHook) {
      // AnimatedHook.tsx: per-word fade (0→1) + translateY (8→0), staggered
      // across ~1.8s; 0.28em margin between inline-block words.
      const revealFrames = Math.round(1.8 * args.fps);
      const allWords = hookDisplay.trim().split(/\s+/).filter(Boolean);
      const perWord = Math.max(2, Math.floor(revealFrames / Math.max(1, allWords.length)));
      const wordGapPx = 0.28 * m.hookFontSize;
      let wordIndex = 0;
      lines.forEach((line, li) => {
        const lineWords = line.split(/[  ]+/);
        let x = m.hookLeft;
        lineWords.forEach((word) => {
          const start = wordIndex * perWord;
          const opacity = interpolate(frame, [start, start + perWord], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const translateY = interpolate(frame, [start, start + perWord], [m.hookWordSlidePx, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          ctx.save();
          ctx.globalAlpha = opacity;
          ctx.translate(0, translateY);
          drawTextLine(ctx, word, {
            fontSize: m.hookFontSize,
            weight: TIKTOK_HOOK_FONT_WEIGHT,
            family: TIKTOK_FONT_FAMILY,
            color: style.hookColor,
            letterSpacingEm: -0.01,
            lineHeight: 1.25,
          }, { x, middle: firstLineMiddle + li * lineStep });
          ctx.restore();
          ctx.save();
          ctx.font = font;
          setLetterSpacingEm(ctx, -0.01, m.hookFontSize);
          x += ctx.measureText(word).width + wordGapPx;
          ctx.restore();
          wordIndex++;
        });
      });
    } else {
      lines.forEach((line, li) => {
        drawTextLine(ctx, line, {
          fontSize: m.hookFontSize,
          weight: TIKTOK_HOOK_FONT_WEIGHT,
          family: TIKTOK_FONT_FAMILY,
          color: style.hookColor,
          letterSpacingEm: -0.01,
          lineHeight: 1.25,
        }, { x: m.hookLeft, middle: firstLineMiddle + li * lineStep });
      });
    }
  }

  // Bottom-zone karaoke band (TikTokLayout.tsx:300–317, TikTokSubtitleBand):
  // top-anchored in the bottom solid zone. OUTRO HANDOFF — when the credit
  // pops in for the final 2.5s, the band fades out over 10 frames and the
  // credit (world imprint slot 2) takes the band.
  const credit = creditText(args.mainText, args.subText);
  const lyricOpacity = lyricHandoffOpacity(credit, frame, args.fps, args.durationInFrames);
  if (args.lyricBand && lyricOpacity > 0.001) {
    const bandTop = m.bottomZoneStart + m.bandTopOffset;
    ctx.save();
    ctx.globalAlpha *= lyricOpacity;
    args.lyricBand(ctx, {
      left: 0,
      top: bandTop,
      width,
      height: height - bandTop,
      compositionHeight: height,
      bandTop,
    });
    ctx.restore();
  }
};

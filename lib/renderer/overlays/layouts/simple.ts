/**
 * lib/renderer/overlays/layouts/simple.ts — Canvas2D ports of
 * FullscreenLayout, MinimalLayout, CinematicLayout, EditorialLayout and
 * LowerThirdLayout. All fade/entry values are 1/0 (entry animations removed:
 * useVisualizerSetup.ts:170–178), visualizer slots are preset='none' in this
 * phase's coverage (Phase 1.6 ports StandardVisualizerSlot).
 */
import { contrastingIconColor, drawCoverImage, drawIconCircle, fillRect } from '../draw';
import { drawTextLine, measureLine } from '../text';
import { drawSocialIcons } from '../social';
import { PLATFORM_ICONS } from '@/lib/renderer/vendor/components/socialIcons';
import type { LayoutDrawFn } from './types';

// ─── FullscreenLayout.tsx:97–174 (StandardOverlay) ───────────────────────────

export const drawFullscreenLayout: LayoutDrawFn = (ctx, args) => {
  const { width, height, isPortrait, theme, fontFamily, mainText, subText, socialLinks } =
    args;
  const scale = Math.min(width, height);
  const showText = !args.textLockupActive;

  // Visualizer — fullscreen-flex centred (FullscreenLayout.tsx:29–78).
  {
    const isRadial = args.preset === 'radial-bars';
    const radialD = Math.min(width, height) * 0.7;
    const isWaveform = args.preset === 'waveform-progress';
    const vizW = isRadial
      ? radialD
      : args.preset === 'bars'
        ? width * 0.8
        : isWaveform
          ? isPortrait
            ? scale * 0.82
            : width * 0.88
          : width * 0.9;
    const vizH = isRadial
      ? radialD
      : args.preset === 'bars'
        ? height * 0.6
        : isWaveform
          ? isPortrait
            ? scale * 0.18
            : height * 0.28
          : height * 0.5;
    args.visualizer?.(ctx, {
      left: (width - vizW) / 2,
      top: (height - vizH) / 2,
      width: vizW,
      height: vizH,
      accentColor: theme.accentColor || '#8B5CF6',
      opacity: theme.visualizerOpacity || 1,
      style: {
        lineThickness: args.preset === 'bars' ? 12 : 10,
        gapSize: args.preset === 'bars' ? 10 : 6,
        roundness: args.preset === 'bars' ? 6 : 5,
        innerRadiusRatio: 0.15,
        waveLineThickness: 3,
        waveLines: 3,
        waveLineGap: 30,
        waveSections: 12,
      },
    });
  }

  if ((mainText || subText) && showText) {
    const top = isPortrait ? height * 0.08 : height * 0.12;
    const gap = height * 0.015;
    let y = top;
    if (mainText) {
      drawTextLine(ctx, mainText, {
        fontSize: scale * 0.07,
        weight: 'bold',
        family: fontFamily,
        color: theme.textColor,
        textShadow: theme.textShadow,
        letterSpacingEm: 0.02,
      }, { x: width / 2, top: y, align: 'center', maxWidth: width * 0.85 });
      y += scale * 0.07 * 1.2 + gap;
    }
    if (subText) {
      drawTextLine(ctx, subText, {
        fontSize: scale * 0.04,
        weight: '500',
        family: fontFamily,
        color: theme.textColor,
        textShadow: theme.textShadow,
        letterSpacingEm: 0.01,
        opacity: 0.95,
      }, { x: width / 2, top: y, align: 'center', maxWidth: width * 0.85 });
    }
  }

  drawSocialIcons(ctx, socialLinks, { width, height }, theme, fontFamily, {
    isPortrait,
    hasImage: false,
  });
};

// ─── MinimalLayout.tsx:64–180 ────────────────────────────────────────────────

export const drawMinimalLayout: LayoutDrawFn = (ctx, args, frame) => {
  const { width, height, isPortrait, theme, fontFamily, mainText, subText, socialLinks } =
    args;
  const minDim = Math.min(width, height);
  const showText = !args.textLockupActive;

  // DOM paint order (MinimalLayout): z-auto social → fx → z-1 lyric band →
  // z-10 header text / viz strip.
  const hasSocial = !!(socialLinks && socialLinks.links.length > 0);
  if (hasSocial) {
    const iconSize = minDim * (isPortrait ? 0.055 : 0.04);
    const headingSize = minDim * (isPortrait ? 0.035 : 0.03);
    const socialBlockHeight = headingSize + iconSize * 0.4 * 0.8 + iconSize;
    drawSocialIcons(ctx, socialLinks!, { width, height }, theme, fontFamily, {
      isPortrait,
      hasImage: false,
      topOffsetPx: height - socialBlockHeight - minDim * 0.015,
    });
  }

  args.fxOverlays?.(ctx);

  args.lyricBand?.(ctx, {
    left: 0,
    top: height * 0.2,
    width,
    height: height * 0.6,
    compositionHeight: height,
    bandTop: height * 0.2,
  });
  void frame;

  if ((mainText || subText) && showText) {
    let y = minDim * 0.05;
    const gap = minDim * 0.008;
    if (mainText) {
      drawTextLine(ctx, mainText, {
        fontSize: minDim * 0.035,
        weight: 'bold',
        family: fontFamily,
        color: theme.textColor,
        textShadow: theme.textShadow,
        letterSpacingEm: 0.01,
        lineHeight: 1.2,
      }, { x: minDim * 0.06, top: y, maxWidth: width * 0.7 });
      y += minDim * 0.035 * 1.2 + gap;
    }
    if (subText) {
      drawTextLine(ctx, subText, {
        fontSize: minDim * 0.024,
        weight: '500',
        family: fontFamily,
        color: theme.textColor,
        textShadow: theme.textShadow,
        letterSpacingEm: 0.02,
        lineHeight: 1.2,
        opacity: 0.65,
      }, { x: minDim * 0.06, top: y, maxWidth: width * 0.7 });
    }
  }

  // Thin visualizer strip — centred near the bottom (MinimalLayout.tsx:56–57,
  // 137–169).
  if (args.preset !== 'none') {
    const vizWidth = width * 0.5;
    const vizHeight = minDim * 0.05;
    args.visualizer?.(ctx, {
      left: (width - vizWidth) / 2,
      top: height - height * 0.08 - vizHeight,
      width: vizWidth,
      height: vizHeight,
      accentColor: theme.accentColor || '#8B5CF6',
      opacity: 0.7,
      style: {
        lineThickness: Math.max(2, minDim * 0.004),
        gapSize: Math.max(2, minDim * 0.003),
        roundness: 4,
      },
    });
  }
};

// ─── CinematicLayout.tsx:72–205 ──────────────────────────────────────────────

export const drawCinematicLayout: LayoutDrawFn = (ctx, args, frame) => {
  const { width, height, isPortrait, theme, fontFamily, mainText, subText, socialLinks } =
    args;
  const minDim = Math.min(width, height);
  const showText = !args.textLockupActive;
  void frame;

  const barHeight = height * 0.11;

  // DOM paint order (CinematicLayout): z-auto viz → fx → z-10 letterbox bars
  // (title + social) → z-11 lockup → z-20 lyric band.
  if (args.preset !== 'none') {
    const vizWidth = width * 0.4;
    const vizHeight = minDim * 0.04;
    args.visualizer?.(ctx, {
      left: (width - vizWidth) / 2,
      top: height - height * 0.115 - vizHeight,
      width: vizWidth,
      height: vizHeight,
      accentColor: theme.accentColor || '#8B5CF6',
      opacity: 0.7,
      style: {
        lineThickness: Math.max(2, minDim * 0.004),
        gapSize: Math.max(2, minDim * 0.003),
        roundness: 4,
      },
    });
  }

  args.fxOverlays?.(ctx);

  // Top letterbox bar + the tiny title inside it.
  fillRect(ctx, 0, 0, width, barHeight, '#000000');
  if (showText && (mainText || subText)) {
    const fontSize = minDim * 0.028;
    const style = {
      fontSize,
      weight: 'bold' as const,
      family: fontFamily,
      color: theme.textColor,
      textShadow: theme.textShadow,
      letterSpacingEm: 0.02,
      lineHeight: 1.2,
    };
    // "title — subtitle" with a lighter subtitle span (opacity 0.65, weight 400).
    const middle = barHeight / 2;
    const maxX = width - minDim * 0.04 * 2;
    let x = minDim * 0.04;
    if (mainText) {
      drawTextLine(ctx, mainText, style, { x, middle, maxWidth: mainText && subText ? undefined : maxX });
      x += measureLine(ctx, mainText, style);
    }
    if (mainText && subText) {
      drawTextLine(ctx, ' — ', { ...style, weight: 400, opacity: 0.65 }, { x, middle });
      x += measureLine(ctx, ' — ', { ...style, weight: 400 });
    }
    if (subText) {
      drawTextLine(ctx, subText, { ...style, weight: 400, opacity: 0.65 }, { x, middle });
    }
  }

  // Bottom letterbox bar.
  fillRect(ctx, 0, height - barHeight, width, barHeight, '#000000');

  const hasSocial = !!(socialLinks && socialLinks.links.length > 0);
  if (hasSocial) {
    const iconSize = minDim * (isPortrait ? 0.055 : 0.04);
    const headingSize = minDim * (isPortrait ? 0.035 : 0.03);
    const socialBlockHeight = headingSize + iconSize * 0.4 * 0.8 + iconSize;
    const socialTop = height - barHeight + Math.max(0, (barHeight - socialBlockHeight) / 2);
    drawSocialIcons(ctx, socialLinks!, { width, height }, theme, fontFamily, {
      isPortrait,
      hasImage: false,
      topOffsetPx: socialTop,
    });
  }

  // Lyric band — floats above everything (z-20, CinematicLayout.tsx:75–93).
  args.lyricBand?.(ctx, {
    left: 0,
    top: height * 0.52,
    width,
    height: height * 0.34,
    compositionHeight: height,
    bandTop: height * 0.52,
  });
};

// ─── EditorialLayout.tsx:59–182 ──────────────────────────────────────────────

export const drawEditorialLayout: LayoutDrawFn = (ctx, args, frame) => {
  const { width, height, isPortrait, theme, fontFamily, mainText, subText, socialLinks } =
    args;
  const minDim = Math.min(width, height);
  const showText = !args.textLockupActive;
  void frame;

  const pad = minDim * 0.07;
  const coverSize = isPortrait ? width * 0.55 : height * 0.5;

  // DOM paint order (EditorialLayout): z-auto social → fx → z-1 lyric band →
  // z-2 framed cover → z-3 masthead.
  drawSocialIcons(ctx, socialLinks, { width, height }, theme, fontFamily, {
    isPortrait,
    hasImage: !!args.coverImage,
  });

  args.fxOverlays?.(ctx);

  args.lyricBand?.(ctx, {
    left: 0,
    top: height * 0.68,
    width,
    height: height * 0.26,
    compositionHeight: height,
    bandTop: height * 0.68,
  });

  if (args.coverImage) {
    const x = isPortrait ? width / 2 - coverSize / 2 : width - width * 0.06 - coverSize;
    const y = isPortrait ? height * 0.32 : height / 2 - coverSize / 2;
    // The wrapper is border-box with a 1px border, but WavyAlbumCover's inner
    // div is explicitly coverSize×coverSize and sits at the content-box origin
    // (+1,+1), overflowing the unclipped wrapper. The border ring stays on the
    // wrapper box; image and shadow shift to the content origin.
    drawCoverImage(ctx, args.coverImage.img, args.coverImage.width, args.coverImage.height,
      x + 1, y + 1, coverSize, coverSize, {
        boxShadow: '0 24px 70px rgba(0,0,0,0.55)',
      });
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, coverSize - 1, coverSize - 1);
    ctx.restore();
  }

  // Masthead — small-caps artist over a big bold title, top-left (z-3).
  if ((mainText || subText) && showText) {
    let y = pad;
    const gap = minDim * 0.012;
    if (subText) {
      drawTextLine(ctx, subText, {
        fontSize: minDim * 0.022,
        weight: 400,
        family: fontFamily,
        color: theme.textColor,
        textShadow: theme.textShadow,
        letterSpacingEm: 0.25,
        opacity: 0.7,
        textTransform: 'uppercase',
      }, { x: pad, top: y });
      y += minDim * 0.022 * 1.2 + gap;
    }
    if (mainText) {
      drawTextLine(ctx, mainText, {
        fontSize: minDim * 0.11,
        weight: 800,
        family: fontFamily,
        color: theme.textColor,
        textShadow: theme.textShadow,
        letterSpacingEm: -0.02,
        lineHeight: 1.05,
      }, { x: pad, top: y, maxWidth: width * 0.7 });
    }
  }
};

// ─── LowerThirdLayout.tsx:71–272 ─────────────────────────────────────────────

export const drawLowerThirdLayout: LayoutDrawFn = (ctx, args, frame) => {
  const { width, height, isPortrait, theme, fontFamily, mainText, subText, socialLinks } =
    args;
  const minDim = Math.min(width, height);
  const showText = !args.textLockupActive;
  void frame;

  const barHeight = height * 0.18;
  const barPad = barHeight * 0.2;
  const thumbSize = barHeight - barPad * 2;
  const hasSocial = !isPortrait && socialLinks && socialLinks.links.length > 0;

  // DOM paint order (LowerThirdLayout): fx → z-1 lyric band → z-10 bar.
  args.fxOverlays?.(ctx);

  args.lyricBand?.(ctx, {
    left: 0,
    top: height * 0.52,
    width,
    height: height * 0.24,
    compositionHeight: height,
    bandTop: height * 0.52,
  });

  // Lower-third bar.
  fillRect(ctx, 0, height - barHeight, width, barHeight, 'rgba(0,0,0,0.72)');

  let x = barPad * 2;
  const barTop = height - barHeight;

  if (args.coverImage) {
    drawCoverImage(ctx, args.coverImage.img, args.coverImage.width, args.coverImage.height,
      x, barTop + barPad, thumbSize, thumbSize, {});
    x += thumbSize + barPad;
  }

  if (showText && (mainText || subText)) {
    let y = 0;
    const gap = minDim * 0.006;
    const titleH = minDim * 0.036 * 1.2;
    const subH = subText ? minDim * 0.024 * 1.2 : 0;
    const totalH = (mainText ? titleH : 0) + (mainText && subText ? gap : 0) + subH;
    y = barTop + (barHeight - totalH) / 2;
    if (mainText) {
      drawTextLine(ctx, mainText, {
        fontSize: minDim * 0.036,
        weight: 'bold',
        family: fontFamily,
        color: theme.textColor,
        textShadow: theme.textShadow,
        lineHeight: 1.2,
      }, { x, top: y });
      y += titleH + gap;
    }
    if (subText) {
      drawTextLine(ctx, subText, {
        fontSize: minDim * 0.024,
        weight: 400,
        family: fontFamily,
        color: theme.textColor,
        textShadow: theme.textShadow,
        opacity: 0.65,
        lineHeight: 1.2,
      }, { x, top: y });
    }
  }

  // Thin visualizer strip — right end of the bar, vertically centred
  // (LowerThirdLayout.tsx:60–61, 177–200); social (marginLeft barPad*0.5)
  // follows it when present.
  let socialBlockLeft = width - barPad * 2;
  if (hasSocial) {
    const iconSize = thumbSize * 0.45;
    const headStyle = {
      fontSize: minDim * 0.018,
      weight: '600' as const,
      family: fontFamily,
      color: theme.textColor,
      letterSpacingEm: 0.05,
      textTransform: 'uppercase' as const,
      opacity: 0.8,
      textShadow: theme.textShadow,
    };
    const items = socialLinks!.links.map((link) => ({ link }));
    const headingW = socialLinks!.heading
      ? measureLine(ctx, socialLinks!.heading, headStyle) + barPad * 0.4
      : 0;
    const totalW =
      headingW +
      items.length * iconSize +
      Math.max(0, items.length - 1) * (barPad * 0.6) +
      barPad * 0.5;
    socialBlockLeft = width - barPad * 2 - totalW;
  }
  if (args.preset !== 'none') {
    const vizWidth = width * (isPortrait ? 0.15 : 0.25);
    const vizHeight = barHeight * 0.4;
    args.visualizer?.(ctx, {
      left: socialBlockLeft - vizWidth,
      top: barTop + (barHeight - vizHeight) / 2,
      width: vizWidth,
      height: vizHeight,
      accentColor: theme.accentColor || '#8B5CF6',
      opacity: 0.65,
      style: {
        lineThickness: Math.max(2, minDim * 0.004),
        gapSize: Math.max(1, minDim * 0.002),
        roundness: 4,
      },
    });
  }

  if (hasSocial) {
    // Compact row at the far right of the bar.
    const iconSize = thumbSize * 0.45;
    const headStyle = {
      fontSize: minDim * 0.018,
      weight: '600' as const,
      family: fontFamily,
      color: theme.textColor,
      letterSpacingEm: 0.05,
      textTransform: 'uppercase' as const,
      opacity: 0.8,
      textShadow: theme.textShadow,
    };
    const items = socialLinks!.links.map((link) => ({ link }));
    const headingW = socialLinks!.heading
      ? measureLine(ctx, socialLinks!.heading, headStyle) + barPad * 0.4
      : 0;
    const totalW =
      headingW +
      items.length * iconSize +
      Math.max(0, items.length - 1) * (barPad * 0.6) +
      barPad * 0.5;
    let sx = width - barPad * 2 - totalW + barPad * 0.5;
    const cy = barTop + barHeight / 2;
    if (socialLinks!.heading) {
      drawTextLine(ctx, socialLinks!.heading, headStyle, { x: sx, middle: cy });
      sx += headingW;
    }
    for (const it of items) {
      drawIconCircle(ctx, sx + iconSize / 2, cy, iconSize, theme.accentColor,
        PLATFORM_ICONS[it.link.platform], contrastingIconColor(theme.accentColor));
      sx += iconSize + barPad * 0.6;
    }
  }
};


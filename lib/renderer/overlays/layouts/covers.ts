/**
 * lib/renderer/overlays/layouts/covers.ts — Canvas2D ports of the cover-art
 * layouts: PosterLayout (header), StackedLayout (centered portrait),
 * SidebarLayout (centered landscape / floating-card), BlurredLayout
 * (full-bleed), CornerPocketLayout, CenterStageLayout, SplitLayout (split +
 * split-reverse). Entry fade values are 1/0 throughout.
 */
import { drawCoverImage, fillRect } from '../draw';
import { drawTextLine } from '../text';
import { drawSocialIcons, drawSocialPanel } from '../social';
import type { LayoutDrawFn } from './types';

// ─── PosterLayout.tsx (registry id 'header') ─────────────────────────────────

export const drawPosterLayout: LayoutDrawFn = (ctx, args, frame) => {
  const { width, height, isPortrait, theme, fontFamily, mainText, subText, socialLinks } =
    args;
  const minDim = Math.min(width, height);
  const textColor = theme.textColor || '#ffffff';
  const showText = !args.textLockupActive;
  void frame;

  const hasSocial = !!(socialLinks && socialLinks.links.length > 0);
  const hasHeaderText = !!(mainText || subText);
  const showHeaderDivider = hasHeaderText || hasSocial;
  const dividerColor = `${textColor}22`;

  if (isPortrait) {
    const pHeaderH = minDim * 0.17;
    const pPad = pHeaderH * 0.14;
    const pImgSize = pHeaderH - pPad * 2;
    const pMainSize = pHeaderH * 0.32;
    const pSubSize = pHeaderH * 0.21;

    if (showHeaderDivider) {
      fillRect(ctx, 0, pHeaderH - 1, width, 1, dividerColor);
    }

    // DOM paint order (PosterLayout portrait): z-auto social → fx → z-1 lyric
    // band → z-10 header → z-11 mini visualizer.
    if (hasSocial) {
      drawSocialIcons(ctx, socialLinks!, { width, height }, theme, fontFamily, {
        isPortrait: true,
        hasImage: !!args.coverImage,
        backdropColor: undefined,
      });
    }

    args.fxOverlays?.(ctx);

    // Lyrics slot — reserved middle band (PosterLayout.tsx:151–156).
    const lyricTop = pHeaderH + pPad * 0.4 + height * 0.12;
    const lyricHeight = Math.max(0, height - lyricTop - height * 0.38);
    args.lyricBand?.(ctx, {
      left: 0,
      top: lyricTop,
      width,
      height: lyricHeight,
      compositionHeight: height,
      bandTop: lyricTop,
    });

    // Header strip — centred, with optional cover thumb at the left.
    const padX = pPad * 2;
    let textX = padX;
    if (args.coverImage) {
      drawCoverImage(ctx, args.coverImage.img, args.coverImage.width, args.coverImage.height,
        padX, pPad, pImgSize, pImgSize, {});
      textX = padX + pImgSize + pPad;
    }
    if (showText && (mainText || subText)) {
      let y = 0;
      const gap = pSubSize * 0.3;
      const totalH =
        (mainText ? pMainSize * 1.2 : 0) + (mainText && subText ? gap : 0) +
        (subText ? pSubSize * 1.2 : 0);
      y = (pHeaderH - totalH) / 2;
      if (mainText) {
        drawTextLine(ctx, mainText, {
          fontSize: pMainSize, weight: 700, family: fontFamily, color: textColor,
          letterSpacingEm: -0.01, lineHeight: 1.2,
          textShadow: theme.textShadow || '0 1px 8px rgba(0,0,0,0.8)',
        }, { x: textX, top: y });
        y += pMainSize * 1.2 + gap;
      }
      if (subText) {
        drawTextLine(ctx, subText, {
          fontSize: pSubSize, weight: 400, family: fontFamily, color: textColor,
          opacity: 0.65, letterSpacingEm: 0.01, lineHeight: 1.2,
          textShadow: theme.textShadow || '0 1px 8px rgba(0,0,0,0.8)',
        }, { x: textX, top: y });
      }
    }

    // Mini visualizer — centred below the lyrics (PosterLayout.tsx:271–300).
    if (args.preset !== 'none') {
      const isRadial = args.preset === 'radial-bars';
      const isLargeViz =
        args.preset === 'waveform-progress' ||
        args.preset === 'bars' ||
        args.preset === 'hills' ||
        args.preset === 'wave';
      const pVizSize = isRadial ? minDim * 0.38 : isLargeViz ? width * 0.88 : width * 0.55;
      const pVizH = isRadial ? minDim * 0.38 : isLargeViz ? minDim * 0.14 : minDim * 0.045;
      args.visualizer?.(ctx, {
        left: (width - pVizSize) / 2,
        top: height - height * 0.22 - pVizH,
        width: pVizSize,
        height: pVizH,
        accentColor: theme.accentColor || '#8B5CF6',
        opacity: 0.85,
        style: {
          lineThickness: Math.max(3, width * 0.008),
          gapSize: Math.max(2, width * 0.004),
          roundness: 4,
          innerRadiusRatio: isRadial ? 0.28 : 0.15,
        },
      });
    }
    return;
  }

  // ── Landscape ──
  // DOM paint order (PosterLayout landscape): fx → z-1 lyric band → z-10
  // header (text + social) → z-11 mini visualizer.
  args.fxOverlays?.(ctx);

  args.lyricBand?.(ctx, {
    left: 0,
    top: height * 0.12,
    width,
    height: height * 0.65,
    compositionHeight: height,
    bandTop: height * 0.12,
  });

  const headerH = minDim * 0.13;
  const headerPad = headerH * 0.18;
  const mainFontSize = headerH * 0.3;
  const subFontSize = headerH * 0.19;
  const imgSize = headerH * 0.88;
  const padX = headerPad * 2;
  let textX = padX;
  if (args.coverImage) {
    drawCoverImage(ctx, args.coverImage.img, args.coverImage.width, args.coverImage.height,
      padX, (headerH - imgSize) / 2, imgSize, imgSize, {});
    textX = padX + imgSize + headerPad;
  }
  if (showText && (mainText || subText)) {
    const gap = subFontSize * 0.15;
    const totalH =
      (mainText ? mainFontSize * 1.2 : 0) + (mainText && subText ? gap : 0) +
      (subText ? subFontSize * 1.2 : 0);
    let y = (headerH - totalH) / 2;
    if (mainText) {
      drawTextLine(ctx, mainText, {
        fontSize: mainFontSize, weight: 700, family: fontFamily, color: textColor,
        letterSpacingEm: -0.01, lineHeight: 1.2,
        textShadow: theme.textShadow || '0 1px 8px rgba(0,0,0,0.8)',
      }, { x: textX, top: y });
      y += mainFontSize * 1.2 + gap;
    }
    if (subText) {
      drawTextLine(ctx, subText, {
        fontSize: subFontSize, weight: 400, family: fontFamily, color: textColor,
        opacity: 0.65, letterSpacingEm: 0.01, lineHeight: 1.2,
        textShadow: theme.textShadow || '0 1px 8px rgba(0,0,0,0.8)',
      }, { x: textX, top: y });
    }
  }
  if (showHeaderDivider) {
    fillRect(ctx, 0, headerH - 1, width, 1, dividerColor);
  }
  if (hasSocial) {
    drawSocialPanel(ctx, socialLinks!, { width, height }, theme, fontFamily,
      width - padX, (headerH - headerH * 0.055 * 1.2) / 2 - (socialLinks!.heading ? headerH * 0.1 : 0), {
        layout: 'row',
        handlePosition: 'after',
        align: 'right',
        iconSizeRatio: 0.045,
      });
  }

  // Mini visualizer — centred below the lyrics (PosterLayout.tsx:331–337,
  // 430–459).
  if (args.preset !== 'none') {
    const isRadial = args.preset === 'radial-bars';
    const bodyH = height - headerH;
    const lyricsH = isRadial ? bodyH * 0.6 : bodyH * 0.78;
    const vizGap = headerPad * 0.2;
    const availH = bodyH - lyricsH - vizGap;
    const vizW = width * 0.52;
    const vizH = headerH * 0.38;
    const isWaveform = args.preset === 'waveform-progress';
    const lVizSize = isRadial
      ? Math.min(availH * 0.92, minDim * 0.3)
      : isWaveform
        ? vizW * 1.1
        : vizW;
    const lVizH = isRadial ? lVizSize : isWaveform ? vizH * 3.2 : vizH;
    args.visualizer?.(ctx, {
      left: width / 2 - lVizSize / 2,
      top: headerH + lyricsH + vizGap,
      width: lVizSize,
      height: lVizH,
      accentColor: theme.accentColor || '#8B5CF6',
      opacity: 0.85,
      style: {
        lineThickness: Math.max(3, width * 0.005),
        gapSize: Math.max(2, width * 0.003),
        roundness: 4,
        innerRadiusRatio: isRadial ? 0.28 : 0.15,
      },
    });
  }
};

// ─── StackedLayout.tsx (registry id 'centered', portrait) ────────────────────

export const drawStackedLayout: LayoutDrawFn = (ctx, args) => {
  const { width, height, theme, fontFamily, mainText, subText, socialLinks } = args;
  const scale = Math.min(width, height);
  const showText = !args.textLockupActive;

  if (theme.useBlurredBackground && (args.colourGradeIntensity ?? 1) > 0) {
    fillRect(ctx, 0, 0, width, height, 'rgba(0,0,0,0.35)');
  }

  // Visualizer — centre/lower section (StackedLayout.tsx:42–63, 160–190).
  if (args.preset !== 'none') {
    const isRadial = args.preset === 'radial-bars';
    const isWaveform = args.preset === 'waveform-progress';
    const radialDiameter = Math.min(width, height * 0.5) * 0.7;
    const slotW = isRadial ? radialDiameter : isWaveform ? scale * 0.88 : width * 0.75;
    const slotH = isRadial ? radialDiameter : isWaveform ? scale * 0.14 : height * 0.22;
    const contBottom = isRadial ? height * 0.02 : height * 0.15;
    const contH = isRadial ? height * 0.5 : height * 0.28;
    const contTop = height - contBottom - contH;
    args.visualizer?.(ctx, {
      left: (width - slotW) / 2,
      top: contTop + (contH - slotH) / 2,
      width: slotW,
      height: slotH,
      accentColor: theme.accentColor || '#8B5CF6',
      opacity: theme.visualizerOpacity || 1,
      style: {
        lineThickness: 8,
        gapSize: 6,
        roundness: 4,
        innerRadiusRatio: isRadial
          ? (Math.min(width, height * 0.5) * 0.15) / radialDiameter
          : 0.15,
        waveLineThickness: 2,
        waveLines: 3,
        waveLineGap: 20,
        waveSections: 12,
      },
    });
  }

  drawSocialIcons(ctx, socialLinks ?? { links: [], heading: 'Available on' },
    { width, height }, theme, fontFamily, { isPortrait: true, hasImage: true });

  // DOM paint order (StackedLayout): z-auto scrim/viz/social → fx → z-2
  // cover/text.
  args.fxOverlays?.(ctx);

  if (args.coverImage) {
    drawCoverImage(ctx, args.coverImage.img, args.coverImage.width, args.coverImage.height,
      width * 0.08, height * 0.045, width * 0.84, width * 0.84, {
        boxShadow: theme.useBlurredBackground ? '0 20px 60px rgba(0,0,0,0.5)' : undefined,
      });
  }

  if (showText && (mainText || subText)) {
    const coverBottom = height * 0.045 + width * 0.84;
    let y = coverBottom + scale * 0.08;
    const gap = height * 0.012;
    if (mainText) {
      drawTextLine(ctx, mainText, {
        fontSize: scale * 0.055, weight: 'bold', family: fontFamily, color: theme.textColor,
        textShadow: theme.textShadow, letterSpacingEm: 0.02,
      }, { x: width / 2, top: y, align: 'center', maxWidth: width * 0.85 });
      y += scale * 0.055 * 1.2 + gap;
    }
    if (subText) {
      drawTextLine(ctx, subText, {
        fontSize: scale * 0.03, weight: '500', family: fontFamily, color: theme.textColor,
        textShadow: theme.textShadow, letterSpacingEm: 0.01, opacity: 0.95,
      }, { x: width / 2, top: y, align: 'center', maxWidth: width * 0.85 });
    }
  }
};

// ─── SidebarLayout.tsx ('centered' landscape + 'floating-card') ──────────────

export const drawSidebarLayout: LayoutDrawFn = (ctx, args) => {
  const { width, height, theme, fontFamily, mainText, subText, socialLinks, isPortrait } =
    args;
  const scale = Math.min(width, height);
  const showText = !args.textLockupActive;

  if (isPortrait) {
    // floating-card portrait variant (:48–191)
    // DOM paint order: fx → z-1 viz strip → z-2 cover → z-3 text/social.
    args.fxOverlays?.(ctx);

    if (args.preset !== 'none') {
      // Thin visualizer strip — bottom (SidebarLayout.tsx:131–166).
      const vizW = width * 0.8;
      const vizH = height * 0.07;
      args.visualizer?.(ctx, {
        left: width * 0.1,
        top: height - height * 0.1 - vizH,
        width: vizW,
        height: vizH,
        accentColor: theme.accentColor || '#8B5CF6',
        opacity: theme.visualizerOpacity || 1,
        style: {
          lineThickness: Math.max(3, width * 0.008),
          gapSize: Math.max(2, width * 0.004),
          roundness: 5,
          innerRadiusRatio: (height * 0.08) / (height * 0.45),
          waveLineThickness: 2,
          waveLines: 3,
          waveLineGap: 20,
          waveSections: 12,
        },
      });
    }

    const coverSize = width * 0.72;
    if (args.coverImage) {
      drawCoverImage(ctx, args.coverImage.img, args.coverImage.width, args.coverImage.height,
        (width - coverSize) / 2, height * 0.08, coverSize, coverSize, {});
    }
    if (showText && (mainText || subText)) {
      let y = height * 0.08 + coverSize + height * 0.05;
      if (mainText) {
        drawTextLine(ctx, mainText, {
          fontSize: scale * 0.048, weight: 'bold', family: fontFamily, color: theme.textColor,
          textShadow: theme.textShadow, letterSpacingEm: 0.02,
        }, { x: width / 2, top: y, align: 'center' });
        y += scale * 0.048 * 1.2 + height * 0.012;
      }
      if (subText) {
        drawTextLine(ctx, subText, {
          fontSize: scale * 0.03, weight: '500', family: fontFamily, color: theme.textColor,
          textShadow: theme.textShadow, letterSpacingEm: 0.01, opacity: 0.95,
        }, { x: width / 2, top: y, align: 'center' });
      }
    }
    if (socialLinks && socialLinks.links.length > 0) {
      // SocialPanel centred at bottom (:167–189).
      const iconSize = height * 0.055;
      const blockH = iconSize + (socialLinks.heading ? scale * 0.022 * 1.2 + height * 0.02 : 0);
      drawSocialPanel(ctx, socialLinks, { width, height }, theme, fontFamily,
        width / 2, height * 0.96 - blockH, {
          layout: 'row',
          handlePosition: 'after',
          align: 'left',
          iconSizeRatio: 0.055,
        });
    }
    return;
  }

  // Landscape (:223–344)
  if (args.coverImage) {
    drawCoverImage(ctx, args.coverImage.img, args.coverImage.width, args.coverImage.height,
      width - width * 0.03 - height * 0.84, height * 0.1, height * 0.84, height * 0.84, {});
  }

  // Left column: cover, then the flex-1 visualizer region + social (z-auto),
  // fx overlays, then the z-2 text (SidebarLayout.tsx:194–221, 281–296, 327).
  const showTextBlock = showText && (mainText || subText);
  const textBottom = showTextBlock
    ? height * 0.15 +
      (mainText ? scale * 0.048 * 1.2 + height * 0.015 : 0) +
      (subText ? scale * 0.032 * 1.2 : 0)
    : height * 0.1;

  if (args.preset !== 'none') {
    const isRadial = args.preset === 'radial-bars';
    const isWaveform = args.preset === 'waveform-progress';
    const vizW = isRadial ? height * 0.45 : height * 0.7;
    const vizH = isRadial
      ? height * 0.45
      : isWaveform
        ? height * 0.34
        : args.preset === 'hills' || args.preset === 'wave'
          ? height * 0.25
          : height * 0.28;
    // The viz box is left-aligned and vertically centred in the column's
    // flex-1 region (below the text, above the social block + marginBottom).
    const socialH = socialLinks && socialLinks.links.length > 0 ? height * 0.055 * 1.5 : 0;
    const regionTop = textBottom;
    const regionH = height - height * 0.1 - socialH - height * 0.03 - regionTop;
    args.visualizer?.(ctx, {
      left: width * 0.05,
      top: regionTop + Math.max(0, (regionH - vizH) / 2),
      width: vizW,
      height: vizH,
      accentColor: theme.accentColor || '#8B5CF6',
      opacity: theme.visualizerOpacity || 1,
      style: {
        lineThickness: 10,
        gapSize: 8,
        roundness: 5,
        innerRadiusRatio: (height * 0.08) / (height * 0.45),
        waveLineThickness: 2,
        waveLines: 3,
        waveLineGap: 20,
        waveSections: 12,
      },
    });
  }

  if (socialLinks && socialLinks.links.length > 0) {
    drawSocialPanel(ctx, socialLinks, { width, height }, theme, fontFamily,
      width * 0.05, height - height * 0.1 - height * 0.055 * 1.5, {
        layout: 'row',
        handlePosition: 'after',
        align: 'left',
        iconSizeRatio: 0.055,
      });
  }

  args.fxOverlays?.(ctx);

  if (showTextBlock) {
    let y = height * 0.1 + height * 0.05;
    const x = width * 0.05;
    if (mainText) {
      drawTextLine(ctx, mainText, {
        fontSize: scale * 0.048, weight: 'bold', family: fontFamily, color: theme.textColor,
        textShadow: theme.textShadow, letterSpacingEm: 0.02,
      }, { x, top: y });
      y += scale * 0.048 * 1.2 + height * 0.015;
    }
    if (subText) {
      drawTextLine(ctx, subText, {
        fontSize: scale * 0.032, weight: '500', family: fontFamily, color: theme.textColor,
        textShadow: theme.textShadow, letterSpacingEm: 0.01, opacity: 0.95,
      }, { x, top: y });
    }
  }
};

// ─── BlurredLayout.tsx (registry id 'full-bleed') ────────────────────────────

export const drawBlurredLayout: LayoutDrawFn = (ctx, args) => {
  const { width, height, theme, fontFamily, mainText, subText, socialLinks, isPortrait } =
    args;
  const scale = Math.min(width, height);
  const showText = !args.textLockupActive;

  if ((args.colourGradeIntensity ?? 1) > 0) {
    fillRect(ctx, 0, 0, width, height, 'rgba(0,0,0,0.35)');
  }

  if (isPortrait) {
    // DOM paint order (BlurredLayout portrait): z-auto social → fx → z-1 viz
    // strip → z-2 text/cover.
    if (socialLinks && socialLinks.links.length > 0) {
      drawSocialPanel(ctx, socialLinks, { width, height }, theme, fontFamily,
        width - width * 0.05, height * 0.95 - height * 0.05 * 1.5, {
          layout: 'row',
          handlePosition: 'after',
          align: 'right',
          iconSizeRatio: 0.05,
        });
    }

    args.fxOverlays?.(ctx);

    if (args.preset !== 'none') {
      // Thin visualizer strip — bottom (BlurredLayout.tsx:147–177).
      const vizW = width * 0.8;
      const vizH = height * 0.07;
      args.visualizer?.(ctx, {
        left: width * 0.1,
        top: height - height * 0.12 - vizH,
        width: vizW,
        height: vizH,
        accentColor: theme.accentColor || '#8B5CF6',
        opacity: theme.visualizerOpacity || 1,
        style: {
          lineThickness: Math.max(3, width * 0.008),
          gapSize: Math.max(2, width * 0.004),
          roundness: 5,
          waveLineThickness: 2,
          waveLines: 3,
          waveLineGap: 20,
          waveSections: 12,
        },
      });
    }

    const coverSize = width * 0.66;
    if (args.coverImage) {
      drawCoverImage(ctx, args.coverImage.img, args.coverImage.width, args.coverImage.height,
        (width - coverSize) / 2, height * 0.42 - coverSize / 2, coverSize, coverSize, {});
    }
    if (showText && mainText) {
      drawTextLine(ctx, mainText, {
        fontSize: scale * 0.045, weight: 'bold', family: fontFamily, color: theme.textColor,
        textShadow: theme.textShadow, letterSpacingEm: 0.02,
      }, { x: width * 0.05, top: height * 0.08, maxWidth: width * 0.35 });
    }
    if (showText && subText) {
      drawTextLine(ctx, subText, {
        fontSize: scale * 0.028, weight: '500', family: fontFamily, color: theme.textColor,
        textShadow: theme.textShadow, letterSpacingEm: 0.01, opacity: 0.95,
      }, { x: width - width * 0.05, top: height * 0.08, align: 'right', maxWidth: width * 0.35 });
    }
    return;
  }

  // Landscape (:233–398)
  // DOM paint order: z-auto social → fx → z-1 flanks → z-2 cover/text.
  if (socialLinks && socialLinks.links.length > 0) {
    drawSocialPanel(ctx, socialLinks, { width, height }, theme, fontFamily,
      width - width * 0.05, height * 0.95 - height * 0.05 * 1.5, {
        layout: 'row',
        handlePosition: 'after',
        align: 'right',
        iconSizeRatio: 0.05,
      });
  }

  args.fxOverlays?.(ctx);

  if (args.preset !== 'none') {
    const isRadial = args.preset === 'radial-bars';
    const vizW = isRadial ? height * 0.35 : width * 0.18;
    const vizH = height * 0.35;
    const flankStyle = {
      lineThickness: 10,
      gapSize: 8,
      roundness: 5,
      innerRadiusRatio: (height * 0.08) / (height * 0.35),
      waveLineThickness: 2,
      waveLines: 3,
      waveLineGap: 20,
      waveSections: 12,
    };
    const flankOpacity = theme.visualizerOpacity || 1;
    // Left flank (:250–264).
    args.visualizer?.(ctx, {
      left: width * 0.08,
      top: height / 2 - vizH / 2,
      width: vizW,
      height: vizH,
      accentColor: theme.accentColor || '#8B5CF6',
      opacity: flankOpacity,
      style: flankStyle,
    });
    // Right flank — mirrored via scaleX(-1) about its own centre (:267–285).
    ctx.save();
    ctx.translate(width - width * 0.08 - vizW / 2, height / 2);
    ctx.scale(-1, 1);
    args.visualizer?.(ctx, {
      left: -vizW / 2,
      top: -vizH / 2,
      width: vizW,
      height: vizH,
      accentColor: theme.accentColor || '#8B5CF6',
      opacity: flankOpacity,
      style: flankStyle,
    });
    ctx.restore();
  }

  if (args.coverImage) {
    drawCoverImage(ctx, args.coverImage.img, args.coverImage.width, args.coverImage.height,
      (width - height * 0.68) / 2, (height - height * 0.68) / 2, height * 0.68, height * 0.68, {});
  }
  if (showText && mainText) {
    drawTextLine(ctx, mainText, {
      fontSize: scale * 0.045, weight: 'bold', family: fontFamily, color: theme.textColor,
      textShadow: theme.textShadow, letterSpacingEm: 0.02,
    }, { x: width * 0.05, top: height * 0.08, maxWidth: width * 0.35 });
  }
  if (showText && subText) {
    drawTextLine(ctx, subText, {
      fontSize: scale * 0.028, weight: '500', family: fontFamily, color: theme.textColor,
      textShadow: theme.textShadow, letterSpacingEm: 0.01, opacity: 0.95,
    }, { x: width - width * 0.05, top: height * 0.08, align: 'right', maxWidth: width * 0.35 });
  }
};

// ─── CornerPocketLayout.tsx ──────────────────────────────────────────────────

export const drawCornerPocketLayout: LayoutDrawFn = (ctx, args, frame) => {
  const { width, height, theme, fontFamily, mainText, subText, socialLinks, isPortrait } =
    args;
  const minDim = Math.min(width, height);
  const showText = !args.textLockupActive;
  void frame;

  if (theme.useBlurredBackground && (args.colourGradeIntensity ?? 1) > 0) {
    fillRect(ctx, 0, 0, width, height, 'rgba(0,0,0,0.35)');
  }

  // DOM paint order (CornerPocketLayout): z-auto scrim/social → fx → z-1 lyric
  // band → z-2 cover/text/viz.
  if (socialLinks?.links?.length) {
    drawSocialIcons(ctx, socialLinks, { width, height }, theme, fontFamily, {
      isPortrait,
      hasImage: !!args.coverImage,
    });
  }

  args.fxOverlays?.(ctx);

  // Lyric band — top strip (CornerPocketLayout.tsx:60–61, 79–97).
  args.lyricBand?.(ctx, {
    left: 0,
    top: height * 0.1,
    width,
    height: height * 0.55,
    compositionHeight: height,
    bandTop: height * 0.1,
  });

  const coverSize = minDim * 0.26;
  const coverLeft = width * 0.05;
  const coverBottom = height * 0.06;
  const textGap = minDim * 0.02;
  const textBottom = coverBottom + coverSize + textGap;

  if (showText && (mainText || subText)) {
    const gap = minDim * 0.008;
    const mainH = mainText ? minDim * 0.04 * 1.2 : 0;
    const subH = subText ? minDim * 0.026 * 1.2 : 0;
    const totalH = mainH + (mainText && subText ? gap : 0) + subH;
    let y = height - textBottom - totalH;
    if (mainText) {
      drawTextLine(ctx, mainText, {
        fontSize: minDim * 0.04, weight: 'bold', family: fontFamily, color: theme.textColor,
        textShadow: theme.textShadow, letterSpacingEm: 0.02,
      }, { x: coverLeft, top: y, maxWidth: width * 0.5 });
      y += mainH + gap;
    }
    if (subText) {
      drawTextLine(ctx, subText, {
        fontSize: minDim * 0.026, weight: '500', family: fontFamily, color: theme.textColor,
        textShadow: theme.textShadow, letterSpacingEm: 0.01, opacity: 0.65,
      }, { x: coverLeft, top: y, maxWidth: width * 0.5 });
    }
  }

  if (args.coverImage) {
    drawCoverImage(ctx, args.coverImage.img, args.coverImage.width, args.coverImage.height,
      coverLeft, height - coverBottom - coverSize, coverSize, coverSize, {});
  }

  // Thin visualizer strip — bottom-right (CornerPocketLayout.tsx:179–199).
  if (args.preset !== 'none') {
    const vizW = width * 0.35;
    const vizH = minDim * 0.045;
    args.visualizer?.(ctx, {
      left: width - width * 0.05 - vizW,
      top: height - height * 0.07 - vizH,
      width: vizW,
      height: vizH,
      accentColor: theme.accentColor || '#8B5CF6',
      opacity: 0.85,
      style: {
        lineThickness: Math.max(3, width * 0.005),
        gapSize: Math.max(2, width * 0.003),
        roundness: 4,
        innerRadiusRatio: 0.15,
      },
    });
  }
};

// ─── CenterStageLayout.tsx ───────────────────────────────────────────────────

export const drawCenterStageLayout: LayoutDrawFn = (ctx, args, frame) => {
  const { width, height, theme, fontFamily, mainText, subText, socialLinks, isPortrait } =
    args;
  const minDim = Math.min(width, height);
  const showText = !args.textLockupActive;
  void frame;

  if (theme.useBlurredBackground && (args.colourGradeIntensity ?? 1) > 0) {
    fillRect(ctx, 0, 0, width, height, 'rgba(0,0,0,0.35)');
  }

  // DOM paint order (CenterStageLayout): z-auto content (scrim, social) → fx
  // overlays → z-1 lyric band → z-2 cover/text/viz.
  if (socialLinks?.links?.length) {
    drawSocialIcons(ctx, socialLinks, { width, height }, theme, fontFamily, {
      isPortrait,
      hasImage: !!args.coverImage,
    });
  }

  args.fxOverlays?.(ctx);

  // Lyric band — bottom strip (CenterStageLayout.tsx:66–67, 195–213).
  args.lyricBand?.(ctx, {
    left: 0,
    top: height * 0.72,
    width,
    height: height * 0.24,
    compositionHeight: height,
    bandTop: height * 0.72,
  });

  const coverSize = isPortrait ? width * 0.62 : height * 0.42;
  const coverTop = isPortrait ? height * 0.07 : height * 0.08;

  if (args.coverImage) {
    drawCoverImage(ctx, args.coverImage.img, args.coverImage.width, args.coverImage.height,
      (width - coverSize) / 2, coverTop, coverSize, coverSize, {
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      });
  }

  if (showText && (mainText || subText)) {
    const textGap = isPortrait ? minDim * 0.06 : minDim * 0.012;
    let y = coverTop + coverSize + textGap;
    const gap = minDim * 0.008;
    if (mainText) {
      drawTextLine(ctx, mainText, {
        fontSize: minDim * 0.045, weight: 'bold', family: fontFamily, color: theme.textColor,
        textShadow: theme.textShadow, letterSpacingEm: 0.02,
      }, { x: width / 2, top: y, align: 'center', maxWidth: width * 0.85 });
      y += minDim * 0.045 * 1.2 + gap;
    }
    if (subText) {
      drawTextLine(ctx, subText, {
        fontSize: minDim * 0.028, weight: '500', family: fontFamily, color: theme.textColor,
        textShadow: theme.textShadow, letterSpacingEm: 0.01, opacity: 0.7,
      }, { x: width / 2, top: y, align: 'center', maxWidth: width * 0.85 });
    }
  }

  // Thin visualizer strip — under the text block, above the lyric band
  // (CenterStageLayout.tsx:69–72, 163–191).
  if (args.preset !== 'none') {
    const vizW = width * 0.35;
    const vizH = minDim * 0.035;
    const vizTop = height * 0.72 - vizH - minDim * 0.02;
    args.visualizer?.(ctx, {
      left: (width - vizW) / 2,
      top: vizTop,
      width: vizW,
      height: vizH,
      accentColor: theme.accentColor || '#8B5CF6',
      opacity: 0.85,
      style: {
        lineThickness: Math.max(3, width * 0.005),
        gapSize: Math.max(2, width * 0.003),
        roundness: 4,
        innerRadiusRatio: 0.15,
      },
    });
  }
};

// ─── SplitLayout.tsx ('split' + reversed 'split-reverse') ────────────────────

export function makeDrawSplitLayout(reversed: boolean): LayoutDrawFn {
  return (ctx, args, frame) => {
    const { width, height, theme, fontFamily, mainText, subText, socialLinks, isPortrait } =
      args;
    const minDim = Math.min(width, height);
    const showText = !args.textLockupActive;
    void frame;

    if (isPortrait) {
      const coverSize = width * 0.7;
      const coverTop = reversed
        ? height * 0.5 + (height * 0.44 - coverSize) / 2
        : (height * 0.45 * 0.5) - coverSize / 2;

      // DOM paint order (SplitLayout portrait): z-auto social → fx → z-1 lyric
      // band → z-2 text → z-3 cover/viz.
      if (socialLinks && socialLinks.links.length > 0) {
        drawSocialIcons(ctx, socialLinks, { width, height }, theme, fontFamily, {
          isPortrait: true,
          hasImage: !!args.coverImage,
        });
      }

      args.fxOverlays?.(ctx);

      args.lyricBand?.(ctx, {
        left: 0,
        top: reversed ? height * 0.1 : height * 0.55,
        width,
        height: reversed ? height * 0.3 : height * 0.35,
        compositionHeight: height,
        bandTop: reversed ? height * 0.1 : height * 0.55,
      });

      if (showText && (mainText || subText)) {
        let y = reversed ? height * 0.03 : height * 0.47;
        const gap = minDim * 0.008;
        if (mainText) {
          drawTextLine(ctx, mainText, {
            fontSize: minDim * 0.05, weight: 'bold', family: fontFamily, color: theme.textColor,
            textShadow: theme.textShadow,
          }, { x: width / 2, top: y, align: 'center', maxWidth: width * 0.85 });
          y += minDim * 0.05 * 1.2 + gap;
        }
        if (subText) {
          drawTextLine(ctx, subText, {
            fontSize: minDim * 0.03, weight: 400, family: fontFamily, color: theme.textColor,
            textShadow: theme.textShadow, opacity: 0.65,
          }, { x: width / 2, top: y, align: 'center', maxWidth: width * 0.85 });
        }
      }

      if (args.coverImage) {
        drawCoverImage(ctx, args.coverImage.img, args.coverImage.width, args.coverImage.height,
          width / 2 - coverSize / 2, coverTop, coverSize, coverSize, {
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          });
      }

      // Thin visualizer strip (SplitLayout.tsx:182–211).
      if (args.preset !== 'none') {
        const vizW = width * 0.8;
        const vizH = height * 0.05;
        args.visualizer?.(ctx, {
          left: width * 0.1,
          top: reversed ? height * 0.43 : height - height * 0.06 - vizH,
          width: vizW,
          height: vizH,
          accentColor: theme.accentColor || '#8B5CF6',
          opacity: 0.85,
          style: {
            lineThickness: Math.max(3, width * 0.008),
            gapSize: Math.max(2, width * 0.004),
            roundness: 4,
          },
        });
      }
      return;
    }

    // ── Landscape ──
    const panelW = width / 2;
    const coverSize = height * 0.6;

    // Dimmed cover panel.
    if ((args.colourGradeIntensity ?? 1) > 0) {
      fillRect(ctx, reversed ? panelW : 0, 0, panelW, height, 'rgba(0,0,0,0.55)');
    }

    // DOM paint order (SplitLayout landscape): z-auto panel/text/social → fx →
    // z-1 lyric band → z-3 cover/viz.
    if (showText && (mainText || subText)) {
      let y = minDim * 0.06;
      const x = reversed ? minDim * 0.06 : panelW + minDim * 0.06;
      const gap = minDim * 0.008;
      if (mainText) {
        drawTextLine(ctx, mainText, {
          fontSize: minDim * 0.05, weight: 'bold', family: fontFamily, color: theme.textColor,
          textShadow: theme.textShadow,
        }, { x, top: y });
        y += minDim * 0.05 * 1.2 + gap;
      }
      if (subText) {
        drawTextLine(ctx, subText, {
          fontSize: minDim * 0.03, weight: 400, family: fontFamily, color: theme.textColor,
          textShadow: theme.textShadow, opacity: 0.65,
        }, { x, top: y });
      }
    }

    if (socialLinks && socialLinks.links.length > 0) {
      drawSocialIcons(ctx, socialLinks, { width, height }, theme, fontFamily, {
        isPortrait: false,
        hasImage: !!args.coverImage,
      });
    }

    args.fxOverlays?.(ctx);

    args.lyricBand?.(ctx, {
      left: reversed ? 0 : panelW,
      top: height * 0.28,
      width: panelW,
      height: height * 0.5,
      compositionHeight: height,
      bandTop: height * 0.28,
    });

    if (args.coverImage) {
      const panelLeft = reversed ? panelW : 0;
      drawCoverImage(ctx, args.coverImage.img, args.coverImage.width, args.coverImage.height,
        panelLeft + (panelW - coverSize) / 2, (height - coverSize) / 2, coverSize, coverSize, {
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        });
    }

    // Thin visualizer strip — bottom of the text panel (SplitLayout.tsx:346–374).
    if (args.preset !== 'none') {
      const vizW = panelW - width * 0.08;
      const vizH = height * 0.08;
      args.visualizer?.(ctx, {
        left: reversed ? width * 0.04 : panelW + width * 0.04,
        top: height - height * 0.08 - vizH,
        width: vizW,
        height: vizH,
        accentColor: theme.accentColor || '#8B5CF6',
        opacity: 0.85,
        style: {
          lineThickness: Math.max(3, height * 0.008),
          gapSize: Math.max(2, height * 0.004),
          roundness: 4,
        },
      });
    }
  };
}

export const drawSplitLayout = makeDrawSplitLayout(false);
export const drawSplitReverseLayout = makeDrawSplitLayout(true);

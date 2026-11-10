import type { LayoutId } from '@/constants/layouts';

/**
 * Artist mark placement resolver.
 *
 * The artist logo replaces the artist name, so it belongs where the name
 * sat in each layout — the Poster header text block, the Lower Third bar,
 * the Corner Pocket above the thumbnail, etc. The returned rect is in
 * pixels with a top-left origin (DOM space), matching the watermark
 * placement convention.
 *
 * Geometry mirrors the text-block math in each layout component — keep it
 * in sync when a layout moves its artist name.
 */

export interface ArtistMarkRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ArtistMarkPlacementInput {
  layoutId: LayoutId;
  width: number;
  height: number;
  isPortrait: boolean;
  /** Natural logo aspect (width / height). Defaults to 2 (typical wordmark). */
  logoAspect?: number;
  /** User size multiplier (0.5–2). Default 1. */
  scale?: number;
  /** Lets header / lower-third skip past the cover thumb when present. */
  hasCoverImage?: boolean;
}

interface Anchor {
  left?: number;
  /** Horizontal centre of the logo in px. */
  centerX?: number;
  /** Right edge of the logo in px. */
  right?: number;
  top: number;
  height: number;
}

/** Build a top-left rect from an anchor + the logo's natural aspect. */
function anchoredRect(anchor: Anchor, aspect: number): ArtistMarkRect {
  const h = anchor.height;
  const w = h * aspect;
  const left =
    anchor.left ??
    (anchor.centerX !== undefined ? anchor.centerX - w / 2 : (anchor.right ?? 0) - w);
  return { left, top: anchor.top, width: w, height: h };
}

export function getArtistMarkPlacement({
  layoutId,
  width,
  height,
  isPortrait,
  logoAspect = 2,
  scale = 1,
  hasCoverImage = false,
}: ArtistMarkPlacementInput): ArtistMarkRect {
  const minDim = Math.min(width, height);
  let anchor: Anchor;

  switch (layoutId) {
    // PosterLayout — header text block, name under the title.
    case 'header': {
      if (isPortrait) {
        const headerH = minDim * 0.17;
        anchor = { centerX: width / 2, top: headerH * 0.52, height: headerH * 0.34 };
      } else {
        const headerH = minDim * 0.13;
        const headerPad = headerH * 0.18;
        const thumbW = hasCoverImage ? headerH * 0.88 + headerPad : 0;
        anchor = {
          left: headerPad * 2 + thumbW,
          top: headerH * 0.55,
          height: headerH * 0.36,
        };
      }
      break;
    }
    // StackedLayout (portrait) / SidebarLayout (landscape) — name under the title.
    case 'centered': {
      if (isPortrait) {
        const textTop = height * 0.045 + width * 0.84 + minDim * 0.08;
        anchor = {
          centerX: width / 2,
          top: textTop + minDim * 0.066 + height * 0.012,
          height: minDim * 0.06,
        };
      } else {
        anchor = { left: width * 0.05, top: height * 0.223, height: height * 0.055 };
      }
      break;
    }
    // BlurredLayout — name sits top-right in both orientations.
    case 'full-bleed':
      anchor = { right: width - width * 0.05, top: height * 0.08, height: minDim * 0.05 };
      break;
    // SidebarLayout — landscape: left column under the title; portrait:
    // centred under the title below the cover card.
    case 'floating-card': {
      if (isPortrait) {
        anchor = {
          centerX: width / 2,
          top: height * 0.08 + width * 0.72 + height * 0.05 + width * 0.058 + height * 0.012,
          height: width * 0.055,
        };
      } else {
        anchor = { left: width * 0.05, top: height * 0.223, height: height * 0.055 };
      }
      break;
    }
    // FullscreenLayout — centred under the title at the top of the frame.
    case 'fullscreen': {
      const textTop = isPortrait ? height * 0.08 : height * 0.12;
      anchor = {
        centerX: width / 2,
        top: textTop + minDim * 0.084 + height * 0.015,
        height: minDim * 0.07,
      };
      break;
    }
    // MinimalLayout — small text block top-left, name under the title.
    case 'minimal':
      anchor = { left: minDim * 0.06, top: minDim * 0.1, height: minDim * 0.045 };
      break;
    // CinematicLayout — the name shares the top letterbox bar with the
    // title; the logo balances it from the right end of the bar.
    case 'cinematic': {
      const barH = height * 0.11;
      anchor = {
        right: width - minDim * 0.04,
        top: (barH - barH * 0.42) / 2,
        height: barH * 0.42,
      };
      break;
    }
    // CornerPocketLayout — name is the bottom line of the text block
    // stacked above the corner thumbnail.
    case 'corner-pocket': {
      const textBottom = height * 0.06 + minDim * 0.26 + minDim * 0.02;
      anchor = {
        left: width * 0.05,
        top: height - textBottom - minDim * 0.05,
        height: minDim * 0.05,
      };
      break;
    }
    // CenterStageLayout — centred under the title, directly below the cover.
    case 'center-stage': {
      const coverTop = isPortrait ? height * 0.07 : height * 0.08;
      const coverSize = isPortrait ? width * 0.62 : height * 0.42;
      const textGap = isPortrait ? minDim * 0.06 : minDim * 0.012;
      const textTop = coverTop + coverSize + textGap;
      anchor = {
        centerX: width / 2,
        top: textTop + minDim * 0.054 + minDim * 0.008,
        height: minDim * 0.05,
      };
      break;
    }
    // SplitLayout — landscape: top of the right content half; portrait:
    // centred under the title beneath the cover.
    case 'split': {
      if (isPortrait) {
        anchor = {
          centerX: width / 2,
          top: height * 0.47 + minDim * 0.06 + minDim * 0.008,
          height: minDim * 0.05,
        };
      } else {
        anchor = {
          left: width / 2 + minDim * 0.06,
          top: minDim * 0.128,
          height: minDim * 0.05,
        };
      }
      break;
    }
    // SplitLayout reversed — content half on the left (landscape) / top
    // (portrait).
    case 'split-reverse': {
      if (isPortrait) {
        anchor = {
          centerX: width / 2,
          top: height * 0.03 + minDim * 0.06 + minDim * 0.008,
          height: minDim * 0.05,
        };
      } else {
        anchor = { left: minDim * 0.06, top: minDim * 0.128, height: minDim * 0.05 };
      }
      break;
    }
    // EditorialLayout — masthead top-left; the name sits ABOVE the title here.
    case 'editorial':
      anchor = { left: minDim * 0.07, top: minDim * 0.07, height: minDim * 0.045 };
      break;
    // LowerThirdLayout — lower line of the text block inside the bottom bar.
    case 'lower-third': {
      const barH = height * 0.18;
      const barPad = barH * 0.2;
      const thumbW = hasCoverImage ? barH - barPad * 2 + barPad : 0;
      anchor = {
        left: barPad * 2 + thumbW,
        top: height - barH + barPad + minDim * 0.043 + minDim * 0.006,
        height: barH * 0.3,
      };
      break;
    }
    // VinylLayout — landscape: right of the record under the title;
    // portrait: centred under the title below the record.
    case 'vinyl': {
      if (isPortrait) {
        anchor = {
          centerX: width / 2,
          top: height * 0.12 + width * 0.7 + minDim * 0.04 + minDim * 0.066 + minDim * 0.012,
          height: minDim * 0.05,
        };
      } else {
        anchor = { left: width * 0.52, top: height * 0.5 - minDim * 0.01, height: minDim * 0.05 };
      }
      break;
    }
    default:
      // Safe fallback — bottom-centre, like a small watermark.
      anchor = { centerX: width / 2, top: height * 0.8, height: minDim * 0.05 };
      break;
  }

  const base = anchoredRect(anchor, logoAspect);
  if (scale === 1) return base;

  // Scale from the anchor edge so left/right/centre-anchored marks grow
  // away from their anchor instead of drifting.
  const h = base.height * scale;
  const w = h * logoAspect;
  const left =
    anchor.left !== undefined
      ? base.left
      : anchor.centerX !== undefined
        ? anchor.centerX - w / 2
        : (anchor.right ?? 0) - w;
  return { left, top: base.top, width: w, height: h };
}

// ─── Artist lockup placement ────────────────────────────────────────────────

export interface ArtistLockupPlacementInput {
  layoutId: LayoutId;
  width: number;
  height: number;
  isPortrait: boolean;
  /** Lets header / lower-third skip past the cover thumb when present. */
  hasCoverImage?: boolean;
  /** User logo-size multiplier (0.5–2). Default 1 — scales the logo row. */
  scale?: number;
  /** Which rows the lockup will stack (logo / title / artist name). */
  hasLogo: boolean;
  hasTitle: boolean;
  hasName: boolean;
}

export interface ArtistLockupAnchor {
  left?: number;
  /** Horizontal centre of the lockup in px. */
  centerX?: number;
  /** Right edge of the lockup in px. */
  right?: number;
  top: number;
}

export interface ArtistLockupPlacement {
  anchor: ArtistLockupAnchor;
  align: 'left' | 'center' | 'right';
  /** The layout's actual main-title size. */
  titleFontSize: number;
  /** The layout's actual artist-name size. */
  nameFontSize: number;
  /** Logo row height in px (already scaled by the user size multiplier). */
  logoHeight: number;
  /** Vertical gap between stacked rows. */
  gap: number;
  /** Room available from the anchor in the alignment direction. */
  maxWidth: number;
}

/** Line box each text row occupies inside the lockup (mirrors the hook). */
const LOCKUP_LINE_BOX = 1.25;

/**
 * Lockup placement resolver — positions the combined logo + title + artist
 * name imprint where the layout's title/name text block sat.
 *
 * Geometry mirrors the text-block math in each layout component — keep it in
 * sync when a layout moves its title or artist name. The lockup is vertically
 * centred on the layout's text block; `anchor.top` is derived from the rows
 * actually present (`hasLogo`/`hasTitle`/`hasName`).
 */
export function getArtistLockupPlacement({
  layoutId,
  width,
  height,
  isPortrait,
  hasCoverImage = false,
  scale = 1,
  hasLogo,
  hasTitle,
  hasName,
}: ArtistLockupPlacementInput): ArtistLockupPlacement {
  const minDim = Math.min(width, height);

  let anchorX: Omit<ArtistLockupAnchor, 'top'>;
  let align: 'left' | 'center' | 'right';
  let textBlockCentreY: number;
  let titleFontSize: number;
  let nameFontSize: number;
  let baseLogoHeight: number;
  let maxWidth: number;

  switch (layoutId) {
    // PosterLayout — header text block, vertically centred in the header band.
    case 'header': {
      if (isPortrait) {
        const headerH = minDim * 0.17;
        anchorX = { centerX: width / 2 };
        align = 'center';
        textBlockCentreY = headerH / 2;
        titleFontSize = headerH * 0.32;
        nameFontSize = headerH * 0.21;
        baseLogoHeight = headerH * 0.34;
        maxWidth = hasCoverImage ? width * 0.72 : width * 0.9;
      } else {
        const headerH = minDim * 0.13;
        const headerPad = headerH * 0.18;
        const thumbW = hasCoverImage ? headerH * 0.88 + headerPad : 0;
        const left = headerPad * 2 + thumbW;
        anchorX = { left };
        align = 'left';
        textBlockCentreY = headerH / 2;
        titleFontSize = headerH * 0.3;
        nameFontSize = headerH * 0.19;
        baseLogoHeight = headerH * 0.36;
        maxWidth = width - left - headerPad * 2;
      }
      break;
    }
    // StackedLayout (portrait) — centred text block below the cover.
    // SidebarLayout (landscape) — left column, name under the title.
    case 'centered': {
      if (isPortrait) {
        const titleH = minDim * 0.055 * 1.2;
        const nameH = minDim * 0.03 * 1.2;
        const textTop = height * 0.045 + width * 0.84 + minDim * 0.08;
        anchorX = { centerX: width / 2 };
        align = 'center';
        textBlockCentreY = textTop + (titleH + height * 0.012 + nameH) / 2;
        titleFontSize = minDim * 0.055;
        nameFontSize = minDim * 0.03;
        baseLogoHeight = minDim * 0.06;
        maxWidth = width * 0.85;
      } else {
        const titleH = minDim * 0.048 * 1.2;
        const nameH = minDim * 0.032 * 1.2;
        anchorX = { left: width * 0.05 };
        align = 'left';
        textBlockCentreY = height * 0.15 + (titleH + height * 0.015 + nameH) / 2;
        titleFontSize = minDim * 0.048;
        nameFontSize = minDim * 0.032;
        baseLogoHeight = height * 0.055;
        maxWidth = height * 0.8;
      }
      break;
    }
    // BlurredLayout — title top-left / name top-right at the same height.
    // The lockup takes the title's corner (top-left); centring a multi-row
    // lockup on a one-line block would push it off-frame, so we top-align.
    case 'full-bleed': {
      anchorX = { left: width * 0.05 };
      align = 'left';
      textBlockCentreY = 0; // unused — top set below
      titleFontSize = minDim * 0.045;
      nameFontSize = minDim * 0.028;
      baseLogoHeight = minDim * 0.05;
      maxWidth = width * 0.4;
      break;
    }
    // SidebarLayout — portrait: centred under the cover card; landscape:
    // left column under the title (same math as 'centered' landscape).
    case 'floating-card': {
      if (isPortrait) {
        const titleH = minDim * 0.048 * 1.2;
        const nameH = minDim * 0.03 * 1.2;
        const textTop = height * 0.08 + width * 0.72 + height * 0.05;
        anchorX = { centerX: width / 2 };
        align = 'center';
        textBlockCentreY = textTop + (titleH + height * 0.012 + nameH) / 2;
        titleFontSize = minDim * 0.048;
        nameFontSize = minDim * 0.03;
        baseLogoHeight = minDim * 0.055;
        maxWidth = width * 0.88;
      } else {
        const titleH = minDim * 0.048 * 1.2;
        const nameH = minDim * 0.032 * 1.2;
        anchorX = { left: width * 0.05 };
        align = 'left';
        textBlockCentreY = height * 0.15 + (titleH + height * 0.015 + nameH) / 2;
        titleFontSize = minDim * 0.048;
        nameFontSize = minDim * 0.032;
        baseLogoHeight = height * 0.055;
        maxWidth = height * 0.8;
      }
      break;
    }
    // FullscreenLayout — centred text block at the top of the frame.
    case 'fullscreen': {
      const textTop = isPortrait ? height * 0.08 : height * 0.12;
      const titleH = minDim * 0.07 * 1.2;
      const nameH = minDim * 0.04 * 1.2;
      anchorX = { centerX: width / 2 };
      align = 'center';
      textBlockCentreY = textTop + (titleH + height * 0.015 + nameH) / 2;
      titleFontSize = minDim * 0.07;
      nameFontSize = minDim * 0.04;
      baseLogoHeight = minDim * 0.07;
      maxWidth = width * 0.85;
      break;
    }
    // MinimalLayout — small text block top-left.
    case 'minimal': {
      const titleH = minDim * 0.035 * 1.2;
      const nameH = minDim * 0.024 * 1.2;
      anchorX = { left: minDim * 0.06 };
      align = 'left';
      textBlockCentreY = minDim * 0.05 + (titleH + minDim * 0.008 + nameH) / 2;
      titleFontSize = minDim * 0.035;
      nameFontSize = minDim * 0.024;
      baseLogoHeight = minDim * 0.045;
      maxWidth = width * 0.7;
      break;
    }
    // CinematicLayout — the title shares the top letterbox bar; the lockup
    // is centred in the bar where the combined title—name line sat.
    case 'cinematic': {
      const barH = height * 0.11;
      anchorX = { left: minDim * 0.04 };
      align = 'left';
      textBlockCentreY = barH / 2;
      titleFontSize = minDim * 0.028;
      nameFontSize = minDim * 0.028;
      baseLogoHeight = barH * 0.42;
      maxWidth = width - minDim * 0.08;
      break;
    }
    // CornerPocketLayout — text block stacked above the corner thumbnail.
    case 'corner-pocket': {
      const titleH = minDim * 0.04 * 1.2;
      const nameH = minDim * 0.026 * 1.2;
      const blockH = titleH + minDim * 0.008 + nameH;
      const blockBottom = height - (height * 0.06 + minDim * 0.26 + minDim * 0.02);
      anchorX = { left: width * 0.05 };
      align = 'left';
      textBlockCentreY = blockBottom - blockH / 2;
      titleFontSize = minDim * 0.04;
      nameFontSize = minDim * 0.026;
      baseLogoHeight = minDim * 0.05;
      maxWidth = width * 0.5;
      break;
    }
    // CenterStageLayout — centred text block directly below the cover.
    case 'center-stage': {
      const coverTop = isPortrait ? height * 0.07 : height * 0.08;
      const coverSize = isPortrait ? width * 0.62 : height * 0.42;
      const textGap = isPortrait ? minDim * 0.06 : minDim * 0.012;
      const textTop = coverTop + coverSize + textGap;
      const titleH = minDim * 0.045 * 1.2;
      const nameH = minDim * 0.028 * 1.2;
      anchorX = { centerX: width / 2 };
      align = 'center';
      textBlockCentreY = textTop + (titleH + minDim * 0.008 + nameH) / 2;
      titleFontSize = minDim * 0.045;
      nameFontSize = minDim * 0.028;
      baseLogoHeight = minDim * 0.05;
      maxWidth = width * 0.85;
      break;
    }
    // SplitLayout — landscape: top of the right content half; portrait:
    // centred under the cover.
    case 'split':
    case 'split-reverse': {
      const titleH = minDim * 0.05 * 1.2;
      const nameH = minDim * 0.03 * 1.2;
      const blockH = titleH + minDim * 0.008 + nameH;
      if (isPortrait) {
        const textTop = layoutId === 'split' ? height * 0.47 : height * 0.03;
        anchorX = { centerX: width / 2 };
        align = 'center';
        textBlockCentreY = textTop + blockH / 2;
        maxWidth = width * 0.85;
      } else {
        const left =
          layoutId === 'split' ? width / 2 + minDim * 0.06 : minDim * 0.06;
        anchorX = { left };
        align = 'left';
        textBlockCentreY = minDim * 0.06 + blockH / 2;
        maxWidth = width / 2 - minDim * 0.12;
      }
      titleFontSize = minDim * 0.05;
      nameFontSize = minDim * 0.03;
      baseLogoHeight = minDim * 0.05;
      break;
    }
    // EditorialLayout — masthead top-left (name above the big title; the
    // lockup stacks logo/title/name but stays centred on the same block).
    case 'editorial': {
      const pad = minDim * 0.07;
      const titleH = minDim * 0.11 * 1.05;
      const nameH = minDim * 0.022 * 1.2;
      anchorX = { left: pad };
      align = 'left';
      textBlockCentreY = pad + (nameH + minDim * 0.012 + titleH) / 2;
      titleFontSize = minDim * 0.11;
      nameFontSize = minDim * 0.022;
      baseLogoHeight = minDim * 0.045;
      maxWidth = width * 0.7;
      break;
    }
    // LowerThirdLayout — text block vertically centred inside the bottom bar.
    case 'lower-third': {
      const barH = height * 0.18;
      const barPad = barH * 0.2;
      const thumbW = hasCoverImage ? barH - barPad * 2 + barPad : 0;
      const left = barPad * 2 + thumbW;
      const vizW = width * (isPortrait ? 0.15 : 0.25);
      anchorX = { left };
      align = 'left';
      textBlockCentreY = height - barH / 2;
      titleFontSize = minDim * 0.036;
      nameFontSize = minDim * 0.024;
      baseLogoHeight = barH * 0.3;
      maxWidth = width - left - barPad * 2 - vizW;
      break;
    }
    // VinylLayout — landscape: right of the record; portrait: centred below it.
    case 'vinyl': {
      const titleH = minDim * 0.055 * 1.2;
      const nameH = minDim * 0.03 * 1.2;
      const blockH = titleH + minDim * 0.012 + nameH;
      if (isPortrait) {
        const textTop = height * 0.12 + width * 0.7 + minDim * 0.04;
        anchorX = { centerX: width / 2 };
        align = 'center';
        textBlockCentreY = textTop + blockH / 2;
        maxWidth = width * 0.85;
      } else {
        // Text block + gap + visualizer strip are centred as a unit.
        const unitH = blockH + minDim * 0.03 + minDim * 0.06;
        anchorX = { left: width * 0.52 };
        align = 'left';
        textBlockCentreY = height * 0.5 - unitH / 2 + blockH / 2;
        maxWidth = width * 0.44;
      }
      titleFontSize = minDim * 0.055;
      nameFontSize = minDim * 0.03;
      baseLogoHeight = minDim * 0.05;
      break;
    }
    default: {
      // Safe fallback — bottom-centre, like a small watermark.
      anchorX = { centerX: width / 2 };
      align = 'center';
      textBlockCentreY = height * 0.825;
      titleFontSize = minDim * 0.05;
      nameFontSize = minDim * 0.03;
      baseLogoHeight = minDim * 0.05;
      maxWidth = width * 0.85;
      break;
    }
  }

  const logoHeight = baseLogoHeight * scale;
  const gap = titleFontSize * 0.35;

  // Top-align the stack on the text block's vertical centre, using only the
  // rows that will actually be drawn.
  const rows: number[] = [];
  if (hasLogo) rows.push(logoHeight);
  if (hasTitle) rows.push(titleFontSize * LOCKUP_LINE_BOX);
  if (hasName) rows.push(nameFontSize * LOCKUP_LINE_BOX);
  const totalH =
    rows.reduce((sum, r) => sum + r, 0) + gap * Math.max(0, rows.length - 1);

  // BlurredLayout is the one top-aligned case (see its comment above).
  const top =
    layoutId === 'full-bleed'
      ? height * 0.08
      : textBlockCentreY - totalH / 2;

  return {
    anchor: { ...anchorX, top },
    align,
    titleFontSize,
    nameFontSize,
    logoHeight,
    gap,
    maxWidth,
  };
}

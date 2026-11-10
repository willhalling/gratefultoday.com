/**
 * lib/renderer/overlays/watermark.ts — Canvas2D port of the DOM
 * WatermarkBadge (remotion/components/WatermarkBadge.tsx): the "Made with"
 * caption pill + white logo pill used for COVER placements (the in-shader
 * badge from lib/renderer/imprints.ts is a different visual used for edge
 * placements — WatermarkBadge.tsx:50–160).
 */

// LogoSvg paths — WatermarkBadge.tsx:37–45 (viewBox 552×90, fill rgba(0,0,0,0.92)).
const LOGO_SVG_PATHS: string[] = [
  'M127.088 18.048L128.312 16.32H135.512L144.368 58.008H145.16L154.592 21.36H163.304L172.664 58.008H173.528L182.384 16.32H189.584L190.808 18.048L180.512 66H166.328L158.912 36.768L151.568 66H137.456L127.088 18.048ZM205.502 66C197.918 66 194.126 62.256 194.126 54.768C194.126 47.28 197.918 43.536 205.502 43.536H216.59V38.856C216.59 36.648 215.486 35.544 213.278 35.544H198.014V31.008L201.758 28.2H213.71C221.246 28.2 225.014 31.992 225.014 39.576V66H205.502ZM202.55 55.344C202.55 57.552 203.654 58.656 205.862 58.656H216.59V50.088H205.862C203.654 50.088 202.55 51.168 202.55 53.328V55.344ZM231.485 29.496L232.349 28.2H239.621L249.125 58.656H250.205L259.709 28.2H266.981L267.845 29.496L256.037 66H243.365L231.485 29.496ZM274.035 54.624V39.576C274.035 31.992 277.827 28.2 285.411 28.2H294.771C302.307 28.2 306.075 31.992 306.075 39.576V50.232H282.459V55.344C282.459 57.552 283.563 58.656 285.771 58.656H304.635V63.192L300.819 66H285.411C277.827 66 274.035 62.208 274.035 54.624ZM282.459 43.68H297.651V38.856C297.651 36.648 296.547 35.544 294.339 35.544H285.771C283.563 35.544 282.459 36.648 282.459 38.856V43.68ZM316.306 54.264V28.056C316.306 20.232 320.218 16.32 328.042 16.32H347.626L351.874 19.632V24.312H328.258C326.146 24.312 325.09 25.344 325.09 27.408V54.912C325.09 56.976 326.146 58.008 328.258 58.008H351.874V62.688L347.626 66H328.042C320.218 66 316.306 62.088 316.306 54.264ZM370.244 66C362.66 66 358.868 62.256 358.868 54.768C358.868 47.28 362.66 43.536 370.244 43.536H381.332V38.856C381.332 36.648 380.228 35.544 378.02 35.544H362.756V31.008L366.5 28.2H378.452C385.988 28.2 389.756 31.992 389.756 39.576V66H370.244ZM367.292 55.344C367.292 57.552 368.396 58.656 370.604 58.656H381.332V50.088H370.604C368.396 50.088 367.292 51.168 367.292 53.328V55.344ZM400.259 66V28.2H420.995C428.531 28.2 432.299 31.992 432.299 39.576V66H423.875V38.856C423.875 36.648 422.771 35.544 420.563 35.544H408.683V66H400.259ZM438.766 29.496L439.63 28.2H446.902L456.406 58.656H457.486L466.99 28.2H474.262L475.126 29.496L463.318 66H450.646L438.766 29.496ZM490.549 66C482.965 66 479.173 62.256 479.173 54.768C479.173 47.28 482.965 43.536 490.549 43.536H501.637V38.856C501.637 36.648 500.533 35.544 498.325 35.544H483.061V31.008L486.805 28.2H498.757C506.293 28.2 510.061 31.992 510.061 39.576V66H490.549ZM487.597 55.344C487.597 57.552 488.701 58.656 490.909 58.656H501.637V50.088H490.909C488.701 50.088 487.597 51.168 487.597 53.328V55.344ZM519.196 63.192V58.656H535.828C538.036 58.656 539.14 57.48 539.14 55.128C539.14 52.68 538.228 51.288 536.404 50.952L528.34 49.656C522.244 48.6 519.196 45.144 519.196 39.288C519.196 31.896 522.988 28.2 530.572 28.2H542.02L545.836 31.008V35.544H530.932C528.676 35.544 527.548 36.72 527.548 39.072C527.548 41.424 528.508 42.768 530.428 43.104L538.492 44.4C544.54 45.408 547.564 48.888 547.564 54.84C547.564 62.28 543.748 66 536.116 66H523.012L519.196 63.192Z',
  'M49.2841 0.51124C48.7801 0.763225 48.0557 1.2672 47.6777 1.61367C47.2367 2.02315 44.4019 10.1497 38.7322 27.0957C34.1335 40.7659 30.3222 51.8532 30.1962 51.7272C30.1017 51.6012 27.7709 45.0496 25.0305 37.1751C22.2902 29.3005 19.8018 22.3395 19.4869 21.7095C17.282 17.2683 10.9824 17.2998 8.87198 21.804C8.5255 22.5284 6.38363 28.3556 4.11576 34.6867C-0.419975 47.349 -0.608964 48.2309 0.713958 50.5618C2.63535 53.9636 7.26557 54.4991 10.0374 51.6642C10.9824 50.6878 11.5178 49.6169 12.5888 46.5615C14.0377 42.4353 14.0692 42.3408 14.3212 42.5928C14.4787 42.7188 20.0223 58.2473 23.8021 69.1142C25.7865 74.7839 26.196 75.4453 28.4008 76.5793C30.7317 77.7762 34.102 77.0202 35.6769 74.9414C36.4644 73.8704 40.6536 62.1531 47.9612 40.4194C49.9141 34.6552 51.5835 30.0565 51.678 30.1825C51.804 30.3085 52.7804 33.0803 53.8513 36.3876C59.395 53.1131 66.5451 73.6814 67.2381 74.6894C68.12 76.0753 70.2619 77.1777 71.9943 77.1777C73.6007 77.1462 75.5536 76.2643 76.5615 75.0674C77.0655 74.4689 79.0499 69.3347 82.1997 60.6097C84.8455 53.1761 87.4599 45.9946 87.9638 44.6086L88.9088 42.1203L90.3577 46.2151C92.3106 51.6012 93.35 52.8297 96.4368 53.3966C100.059 54.0896 103.87 50.3098 103.114 46.845C102.642 44.6086 94.421 21.8355 93.728 20.7645C91.6491 17.6462 86.3259 17.6462 84.1211 20.7331C83.5856 21.489 80.2153 30.7495 74.7346 46.3725C73.7267 49.3019 72.8447 51.6642 72.7502 51.6642C72.6557 51.6642 68.939 40.6714 64.4662 27.2532C58.4501 9.20473 56.0877 2.55862 55.4892 1.83416C54.0088 0.0702655 51.237 -0.528199 49.2841 0.51124Z',
];

const LOGO_VIEWBOX_W = 552;
const LOGO_VIEWBOX_H = 90;
const LOGO_FILL = 'rgba(0,0,0,0.92)';
const CAPTION_FONT_STACK =
  "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

import { applyBoxShadow, clearShadow, roundedRectPath } from './draw';
import { drawTextLine, measureLine } from './text';

export interface DomWatermarkBadgeInput {
  width: number;
  height: number;
  isPortrait: boolean;
  bottomOffset?: number;
  horizontalAlign?: 'left' | 'center' | 'right';
  coverRect?: { left: number; top: number; width: number; height: number } | null;
  scale?: number;
}

function drawLogoSvg(ctx: CanvasRenderingContext2D, x: number, y: number, height: number): void {
  const scale = height / LOGO_VIEWBOX_H;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = LOGO_FILL;
  for (const d of LOGO_SVG_PATHS) {
    ctx.fill(new Path2D(d));
  }
  ctx.restore();
}

/** WatermarkBadge.tsx:56–160. Returns the badge stack's bounds (for tests). */
export function drawDomWatermarkBadge(
  ctx: CanvasRenderingContext2D,
  input: DomWatermarkBadgeInput,
): void {
  const {
    width,
    height,
    isPortrait,
    bottomOffset = 0,
    horizontalAlign,
    coverRect,
    scale = 1,
  } = input;
  const align = horizontalAlign ?? 'center';

  const logoHeight = Math.round(height * (isPortrait ? 0.025 : 0.04) * scale);
  const margin = Math.round(Math.min(width, height) * 0.02);
  const bottomLift = Math.round(height * (isPortrait ? 0.28 : 0.12));

  const captionFontSize = Math.round(height * (isPortrait ? 0.01 : 0.016) * scale);
  const { totalW } = measureMadeWithBadge(ctx, { logoHeight, captionFontSize });

  // Stack position (WatermarkBadge.tsx:88–101).
  let centerX: number;
  let bottomY: number;
  if (coverRect) {
    centerX = coverRect.left + coverRect.width / 2;
    bottomY = coverRect.top + coverRect.height - margin;
  } else {
    bottomY = height - (bottomLift + bottomOffset);
    centerX =
      align === 'center'
        ? width / 2
        : align === 'left'
          ? margin + totalW / 2
          : width - margin - totalW / 2;
  }
  drawMadeWithBadge(ctx, { centerX, bottomY, logoHeight, captionFontSize });
}

interface MadeWithBadgeSizes {
  /** Logo height in px; the logo pill pads around it. */
  logoHeight: number;
  /** "MADE WITH" caption font size in px. */
  captionFontSize: number;
}

const captionStyleFor = (captionFontSize: number) => ({
  fontSize: captionFontSize,
  weight: 700,
  family: CAPTION_FONT_STACK,
  color: 'rgba(255,255,255,0.95)',
  letterSpacingEm: 0.06,
});

function badgeMetrics(ctx: CanvasRenderingContext2D, { logoHeight, captionFontSize }: MadeWithBadgeSizes) {
  const pillPadding = Math.round(logoHeight * 0.28);
  const pillHeight = logoHeight + pillPadding * 2;
  const logoWidth = Math.round(logoHeight * (LOGO_VIEWBOX_W / LOGO_VIEWBOX_H));
  const pillWidth = logoWidth + pillPadding * 2;
  const captionPaddingV = Math.round(captionFontSize * 0.45);
  const captionPaddingH = Math.round(captionFontSize * 1.0);
  const captionTextW = measureLine(ctx, 'MADE WITH', {
    ...captionStyleFor(captionFontSize),
    textTransform: 'uppercase',
  });
  const captionW = captionTextW + captionPaddingH * 2;
  const captionH = captionFontSize * 1 + captionPaddingV * 2; // lineHeight 1
  const gap = Math.round(captionFontSize * 0.15);
  return {
    pillPadding, pillHeight, pillWidth, captionPaddingH, captionW, captionH, gap,
    totalH: captionH + gap + pillHeight,
    totalW: Math.max(captionW, pillWidth),
  };
}

/** Size of the "Made with" badge stack (caption pill over logo pill). */
export function measureMadeWithBadge(
  ctx: CanvasRenderingContext2D,
  sizes: MadeWithBadgeSizes,
): { totalW: number; totalH: number } {
  const { totalW, totalH } = badgeMetrics(ctx, sizes);
  return { totalW, totalH };
}

/**
 * The one WaveCanvas watermark: a dark "MADE WITH" caption pill stacked over
 * a white logo pill, centred on `centerX` with its bottom edge at `bottomY`.
 * Used by video exports/previews and generated thumbnails alike.
 */
export function drawMadeWithBadge(
  ctx: CanvasRenderingContext2D,
  { centerX, bottomY, logoHeight, captionFontSize }: MadeWithBadgeSizes & { centerX: number; bottomY: number },
): void {
  const m = badgeMetrics(ctx, { logoHeight, captionFontSize });
  const { pillPadding, pillHeight, pillWidth, captionPaddingH, captionW, captionH, gap } = m;
  const borderRadius = Math.round(pillHeight * 0.5);
  const captionStyle = captionStyleFor(captionFontSize);
  const topY = bottomY - m.totalH;

  // Caption pill.
  const capX = centerX - captionW / 2;
  ctx.save();
  applyBoxShadow(ctx, '0 2px 8px rgba(0,0,0,0.35)');
  ctx.fillStyle = 'rgba(0,0,0,0.82)';
  roundedRectPath(ctx, capX, topY, captionW, captionH, Math.round(captionFontSize * 1.4));
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1;
  roundedRectPath(ctx, capX + 0.5, topY + 0.5, captionW - 1, captionH - 1, Math.round(captionFontSize * 1.4));
  ctx.stroke();
  ctx.restore();
  drawTextLine(ctx, 'MADE WITH', { ...captionStyle, textTransform: 'uppercase' }, {
    x: capX + captionPaddingH,
    middle: topY + captionH / 2,
  });

  // Logo pill.
  const pillX = centerX - pillWidth / 2;
  const pillY = topY + captionH + gap;
  ctx.save();
  applyBoxShadow(ctx, '0 4px 16px rgba(0,0,0,0.35)');
  ctx.fillStyle = 'rgba(255,255,255,0.98)';
  roundedRectPath(ctx, pillX, pillY, pillWidth, pillHeight, borderRadius);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  roundedRectPath(ctx, pillX + 0.5, pillY + 0.5, pillWidth - 1, pillHeight - 1, borderRadius);
  ctx.stroke();
  ctx.restore();
  clearShadow(ctx);
  drawLogoSvg(ctx, pillX + pillPadding, pillY + pillPadding, logoHeight);
}

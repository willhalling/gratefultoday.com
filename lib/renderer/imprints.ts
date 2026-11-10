/**
 * lib/renderer/imprints.ts — Canvas2D rasterisation of the in-shader imprint
 * textures (watermark badge + artist lockup), replacing the Remotion hooks
 * remotion/hooks/useWatermarkTexture.ts, useArtistMarkTexture.ts and
 * useArtistLockupTexture.ts, plus the UV-rect math from
 * remotion/three/uvImprints.ts:85–165 and the composition's
 * uvImprints assembly (VisualizerComposition.tsx:1052–1116).
 *
 * Everything is async preparation (session prepare phase): fonts MUST be
 * registered (lib/renderer/fonts.ts / the harness's @font-face injection)
 * before prepareImprints runs — the lockup rasteriser measures text with the
 * hook's exact document.fonts.load discipline (:148–156), and a missing
 * family silently changes every metric.
 *
 * The UV-rect functions are VERBATIM COPIES of uvImprints.ts (importing that
 * module drags useImprintSlot → the whole Remotion component tree into the
 * engine's consumers — same reason world-renderer.ts inlines
 * MAX_UV_IMPRINTS). Keep in sync.
 */
import type { FrameContext } from './frame-context';
import {
  TIKTOK_CREDIT_FONT_WEIGHT,
  TIKTOK_FONT_FAMILY,
  creditText,
  resolveTikTokFrameStyle,
  tiktokMetrics,
  widowJoin,
} from './overlays/layouts/tiktok-shared';
import { balanceWrap, preventWidows, splitWrapWords } from './overlays/text-wrap';

// ═══ Watermark badge (useWatermarkTexture.ts) ═══════════════════════════════

const LOGO_PATHS: string[] = [
  'M128.088 18.0471L129.312 16.3191H136.512L145.368 58.0071H146.16L155.592 21.3591H164.304L173.664 58.0071H174.528L183.384 16.3191H190.584L191.808 18.0471L181.512 65.9991H167.328L159.912 36.7671L152.568 65.9991H138.456L128.088 18.0471Z',
  'M206.502 65.9991C198.918 65.9991 195.126 62.2551 195.126 54.7671C195.126 47.2791 198.918 43.5351 206.502 43.5351H217.59V38.8551C217.59 36.6471 216.486 35.5431 214.278 35.5431H199.014V31.0071L202.758 28.1991H214.71C222.246 28.1991 226.014 31.9911 226.014 39.5751V65.9991H206.502ZM203.55 55.3431C203.55 57.5511 204.654 58.6551 206.862 58.6551H217.59V50.0871H206.862C204.654 50.0871 203.55 51.1671 203.55 53.3271V55.3431Z',
  'M232.485 29.4951L233.349 28.1991H240.621L250.125 58.6551H251.205L260.709 28.1991H267.981L268.845 29.4951L257.037 65.9991H244.365L232.485 29.4951Z',
  'M275.035 54.6231V39.5751C275.035 31.9911 278.827 28.1991 286.411 28.1991H295.771C303.307 28.1991 307.075 31.9911 307.075 39.5751V50.2311H283.459V55.3431C283.459 57.5511 284.563 58.6551 286.771 58.6551H305.635V63.1911L301.819 65.9991H286.411C278.827 65.9991 275.035 62.2071 275.035 54.6231ZM283.459 43.6791H298.651V38.8551C298.651 36.6471 297.547 35.5431 295.339 35.5431H286.771C284.563 35.5431 283.459 36.6471 283.459 38.8551V43.6791Z',
  'M317.306 54.2631V28.0551C317.306 20.2311 321.218 16.3191 329.042 16.3191H348.626L352.874 19.6311V24.3111H329.258C327.146 24.3111 326.09 25.3431 326.09 27.4071V54.9111C326.09 56.9751 327.146 58.0071 329.258 58.0071H352.874V62.6871L348.626 65.9991H329.042C321.218 65.9991 317.306 62.0871 317.306 54.2631Z',
  'M371.244 65.9991C363.66 65.9991 359.868 62.2551 359.868 54.7671C359.868 47.2791 363.66 43.5351 371.244 43.5351H382.332V38.8551C382.332 36.6471 381.228 35.5431 379.02 35.5431H363.756V31.0071L367.5 28.1991H379.452C386.988 28.1991 390.756 31.9911 390.756 39.5751V65.9991H371.244ZM368.292 55.3431C368.292 57.5511 369.396 58.6551 371.604 58.6551H382.332V50.0871H371.604C369.396 50.0871 368.292 51.1671 368.292 53.3271V55.3431Z',
  'M401.259 65.9991V28.1991H421.995C429.531 28.1991 433.299 31.9911 433.299 39.5751V65.9991H424.875V38.8551C424.875 36.6471 423.771 35.5431 421.563 35.5431H409.683V65.9991H401.259Z',
  'M439.766 29.4951L440.63 28.1991H447.902L457.406 58.6551H458.486L467.99 28.1991H475.262L476.126 29.4951L464.318 65.9991H451.646L439.766 29.4951Z',
  'M491.549 65.9991C483.965 65.9991 480.173 62.2551 480.173 54.7671C480.173 47.2791 483.965 43.5351 491.549 43.5351H502.637V38.8551C502.637 36.6471 501.533 35.5431 499.325 35.5431H484.061V31.0071L487.805 28.1991H499.757C507.293 28.1991 511.061 31.9911 511.061 39.5751V65.9991H491.549ZM488.597 55.3431C488.597 57.5511 489.701 58.6551 491.909 58.6551H502.637V50.0871H491.909C489.701 50.0871 488.597 51.1671 488.597 53.3271V55.3431Z',
  'M520.196 63.1911V58.6551H536.828C539.036 58.6551 540.14 57.4791 540.14 55.1271C540.14 52.6791 539.228 51.2871 537.404 50.9511L529.34 49.6551C523.244 48.5991 520.196 45.1431 520.196 39.2871C520.196 31.8951 523.988 28.1991 531.572 28.1991H543.02L546.836 31.0071V35.5431H531.932C529.676 35.5431 528.548 36.7191 528.548 39.0711C528.548 41.4231 529.508 42.7671 531.428 43.1031L539.492 44.3991C545.54 45.4071 548.564 48.8871 548.564 54.8391C548.564 62.2791 544.748 65.9991 537.116 65.9991H524.012L520.196 63.1911Z',
  'M557.628 65.9991V56.6391H566.988V65.9991H557.628Z',
  'M577.247 21.6471V13.0791H586.103V21.6471H577.247ZM577.463 65.9991V28.1991H585.887V65.9991H577.463Z',
  'M596.082 54.6231V39.5751C596.082 31.9911 599.874 28.1991 607.458 28.1991H617.538C625.074 28.1991 628.842 31.9911 628.842 39.5751V54.6231C628.842 62.2071 625.074 65.9991 617.538 65.9991H607.458C599.874 65.9991 596.082 62.2071 596.082 54.6231ZM604.506 55.3431C604.506 57.5511 605.61 58.6551 607.818 58.6551H617.106C619.314 58.6551 620.418 57.5511 620.418 55.3431V38.8551C620.418 36.6471 619.314 35.5431 617.106 35.5431H607.818C605.61 35.5431 604.506 36.6471 604.506 38.8551V55.3431Z',
  'M49.2841 0.51124C48.7801 0.763225 48.0557 1.2672 47.6777 1.61367C47.2367 2.02315 44.4019 10.1497 38.7322 27.0957C34.1335 40.7659 30.3222 51.8532 30.1962 51.7272C30.1017 51.6012 27.7709 45.0496 25.0305 37.1751C22.2902 29.3005 19.8018 22.3395 19.4869 21.7095C17.282 17.2683 10.9824 17.2998 8.87198 21.804C8.5255 22.5284 6.38363 28.3556 4.11576 34.6867C-0.419975 47.349 -0.608964 48.2309 0.713958 50.5618C2.63535 53.9636 7.26557 54.4991 10.0374 51.6642C10.9824 50.6878 11.5178 49.6169 12.5888 46.5615C14.0377 42.4353 14.0692 42.3408 14.3212 42.5928C14.4787 42.7188 20.0223 58.2473 23.8021 69.1142C25.7865 74.7839 26.196 75.4453 28.4008 76.5793C30.7317 77.7762 34.102 77.0202 35.6769 74.9414C36.4644 73.8704 40.6536 62.1531 47.9612 40.4194C49.9141 34.6552 51.5835 30.0565 51.678 30.1825C51.804 30.3085 52.7804 33.0803 53.8513 36.3876C59.395 53.1131 66.5451 73.6814 67.2381 74.6894C68.12 76.0753 70.2619 77.1777 71.9943 77.1777C73.6007 77.1462 75.5536 76.2643 76.5615 75.0674C77.0655 74.4689 79.0499 69.3347 82.1997 60.6097C84.8455 53.1761 87.4599 45.9946 87.9638 44.6086L88.9088 42.1203L90.3577 46.2151C92.3106 51.6012 93.35 52.8297 96.4368 53.3966C100.059 54.0896 103.87 50.3098 103.114 46.845C102.642 44.6086 94.421 21.8355 93.728 20.7645C91.6491 17.6462 86.3259 17.6462 84.1211 20.7331C83.5856 21.489 80.2153 30.7495 74.7346 46.3725C73.7267 49.3019 72.8447 51.6642 72.7502 51.6642C72.6557 51.6642 68.939 40.6714 64.4662 27.2532C58.4501 9.20473 56.0877 2.55862 55.4892 1.83416C54.0088 0.0702655 51.237 -0.528199 49.2841 0.51124Z',
];

const LOGO_VIEWBOX_WIDTH = 629;
const LOGO_VIEWBOX_HEIGHT = 78;
const PILL_FILL = 'rgba(0,0,0,0.35)';
const LOGO_FILL = 'rgba(255,255,255,0.85)';

export interface WatermarkBadgeInput {
  width: number;
  height: number;
  isPortrait: boolean;
  bottomOffset?: number;
  horizontalAlign?: 'left' | 'center' | 'right';
  coverRect?: { left: number; top: number; width: number; height: number } | null;
  scale?: number;
}

interface BadgeGeometry {
  badgeWidth: number;
  badgeHeight: number;
  badgeLeft: number;
  badgeTop: number;
  logoLeft: number;
  logoTop: number;
  logoHeight: number;
  pillBorderRadius: number;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, height: number): void {
  const scale = height / LOGO_VIEWBOX_HEIGHT;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  if (typeof Path2D !== 'undefined') {
    try {
      ctx.fillStyle = LOGO_FILL;
      for (const d of LOGO_PATHS) {
        ctx.fill(new Path2D(d));
      }
      ctx.restore();
      return;
    } catch {
      // Fall through to text fallback.
    }
  }

  ctx.fillStyle = LOGO_FILL;
  ctx.font = `700 ${LOGO_VIEWBOX_HEIGHT * 0.72}px Inter, "SF Pro Display", sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText('GratefulToday.com', 0, LOGO_VIEWBOX_HEIGHT * 0.55);
  ctx.restore();
}

/** computeBadgeGeometry (useWatermarkTexture.ts:132–184) — verbatim. */
function computeBadgeGeometry(input: WatermarkBadgeInput): BadgeGeometry {
  const { width, height, isPortrait, bottomOffset = 0, horizontalAlign, coverRect, scale = 1 } =
    input;

  const align = horizontalAlign ?? 'center';

  const logoHeight = Math.round(height * (isPortrait ? 0.018 : 0.028) * scale);
  const paddingV = Math.round(logoHeight * 0.6);
  const paddingH = Math.round(logoHeight * 1.4);
  const pillBorderRadius = Math.round(logoHeight * 1.5);
  const logoWidth = Math.round(logoHeight * (LOGO_VIEWBOX_WIDTH / LOGO_VIEWBOX_HEIGHT));
  const badgeWidth = logoWidth + paddingH * 2;
  const badgeHeight = logoHeight + paddingV * 2;
  const margin = Math.round(Math.min(width, height) * 0.02);
  const bottomLift = Math.round(height * (isPortrait ? 0.28 : 0.12));

  let badgeLeft: number;
  let badgeTop: number;

  if (coverRect) {
    badgeLeft = coverRect.left + coverRect.width / 2 - badgeWidth / 2;
    badgeTop = coverRect.top + coverRect.height - margin - badgeHeight;
  } else {
    badgeTop = height - (bottomLift + bottomOffset) - badgeHeight;
    if (align === 'center') {
      badgeLeft = (width - badgeWidth) / 2;
    } else if (align === 'left') {
      badgeLeft = margin;
    } else {
      badgeLeft = width - margin - badgeWidth;
    }
  }

  return {
    badgeWidth,
    badgeHeight,
    badgeLeft,
    badgeTop,
    logoLeft: badgeLeft + paddingH,
    logoTop: badgeTop + paddingV,
    logoHeight,
    pillBorderRadius,
  };
}

function drawBadge(ctx: CanvasRenderingContext2D, g: BadgeGeometry): void {
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = PILL_FILL;
  drawRoundedRect(ctx, g.badgeLeft, g.badgeTop, g.badgeWidth, g.badgeHeight, g.pillBorderRadius);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  drawLogo(ctx, g.logoLeft, g.logoTop, g.logoHeight);
}

const CROPPED_SHADOW_PADDING = { horizontal: 24, top: 12, bottom: 20 };

/** renderCroppedWatermarkToCanvas (useWatermarkTexture.ts:232–273) — the
 * tightly-cropped badge canvas the WebGL imprint samples. */
export function renderWatermarkBadge(
  input: WatermarkBadgeInput,
): { canvas: HTMLCanvasElement; size: { width: number; height: number } } | null {
  const g = computeBadgeGeometry(input);

  const badgeAspect = g.badgeWidth / g.badgeHeight;
  const minVertPad = CROPPED_SHADOW_PADDING.top + CROPPED_SHADOW_PADDING.bottom;
  const minHorizPad = CROPPED_SHADOW_PADDING.horizontal * 2;

  const totalVertPad = Math.max(minVertPad, Math.ceil(minHorizPad / badgeAspect));
  const totalHorizPad = Math.ceil(badgeAspect * totalVertPad);

  const canvas = document.createElement('canvas');
  canvas.width = g.badgeWidth + totalHorizPad;
  canvas.height = g.badgeHeight + totalVertPad;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const badgeLeft = Math.round(totalHorizPad / 2);
  const badgeTop = CROPPED_SHADOW_PADDING.top;

  const shifted: BadgeGeometry = {
    ...g,
    badgeLeft,
    badgeTop,
    logoLeft: g.logoLeft - g.badgeLeft + badgeLeft,
    logoTop: g.logoTop - g.badgeTop + badgeTop,
  };

  drawBadge(ctx, shifted);

  return { canvas, size: { width: canvas.width, height: canvas.height } };
}

// ═══ Artist mark rasterisation (useArtistMarkTexture.ts) ════════════════════

const MAX_RASTER_EDGE = 1024;

export interface RasterizedMark {
  canvas: HTMLCanvasElement;
  naturalSize: { width: number; height: number };
}

export function rasterizeArtistMark(
  imageUrl: string,
  frameSize: { width: number; height: number },
): Promise<RasterizedMark | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const naturalWidth = img.naturalWidth || img.width || frameSize.width;
      const naturalHeight = img.naturalHeight || img.height || frameSize.height;

      const capScale = Math.min(1, MAX_RASTER_EDGE / Math.max(naturalWidth, naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(naturalWidth * capScale));
      canvas.height = Math.max(1, Math.round(naturalHeight * capScale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ canvas, naturalSize: { width: naturalWidth, height: naturalHeight } });
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

// ═══ Artist lockup (useArtistLockupTexture.ts) ══════════════════════════════

const LINE_BOX = 1.25;
const TITLE_WEIGHT = 700;
const NAME_WEIGHT = 400;
const NAME_OPACITY = 0.65;

export interface ArtistLockupInput {
  active: boolean;
  title: string;
  name: string;
  /** Pre-rasterised logo canvas (rasterizeArtistMark), or null. */
  logo?: RasterizedMark | null;
  fontFamily: string;
  textColor: string;
  align: 'left' | 'center' | 'right';
  titleFontSize: number;
  nameFontSize: number;
  logoHeight: number;
  gap: number;
  maxWidth: number;
}

function primaryFamily(fontFamily: string): string {
  const m = fontFamily.match(/'([^']+)'/) ?? fontFamily.match(/"([^"]+)"/);
  return m ? m[1] : fontFamily.split(',')[0].trim();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = '…';
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(text.slice(0, mid) + ellipsis).width <= maxWidth) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return text.slice(0, Math.max(0, lo)) + ellipsis;
}

interface LockupElement {
  kind: 'logo' | 'title' | 'name';
  height: number;
  width: number;
}

/** The useArtistLockupTexture effect body (:144–279) — verbatim apart from
 * taking a pre-rasterised canvas instead of a data URL (PNG roundtrip is
 * lossless; pixels identical). */
export async function renderArtistLockup(
  input: ArtistLockupInput,
): Promise<{ canvas: HTMLCanvasElement; size: { width: number; height: number } } | null> {
  const {
    active,
    title,
    name,
    logo = null,
    fontFamily,
    textColor,
    align,
    titleFontSize,
    nameFontSize,
    logoHeight,
    gap,
    maxWidth,
  } = input;

  const hasContent = active && (!!title || !!name || !!logo);
  if (!hasContent || typeof window === 'undefined') return null;

  // Wait for the exact weights we draw with (:148–156). Faces must be
  // registered by the environment (fonts.ts / harness injection) first.
  const family = primaryFamily(fontFamily);
  try {
    await Promise.all([
      document.fonts.load(`${TITLE_WEIGHT} ${titleFontSize}px "${family}"`),
      document.fonts.load(`${NAME_WEIGHT} ${nameFontSize}px "${family}"`),
    ]);
  } catch {
    // Fall back to whatever the stack resolves to.
  }

  const measureCanvas = document.createElement('canvas');
  measureCanvas.width = 1;
  measureCanvas.height = 1;
  const measureCtx = measureCanvas.getContext('2d');
  if (!measureCtx) return null;

  const elements: LockupElement[] = [];

  if (logo && logoHeight > 0) {
    const naturalW = logo.naturalSize.width;
    const naturalH = logo.naturalSize.height;
    const logoWidth = naturalH > 0 ? (logoHeight * naturalW) / naturalH : 0;
    if (logoWidth > 0) {
      const clampedW = Math.min(logoWidth, maxWidth);
      const clampedH = (logoHeight * clampedW) / logoWidth;
      elements.push({ kind: 'logo', height: clampedH, width: clampedW });
    }
  }

  let fittedTitle = '';
  if (title) {
    measureCtx.font = `${TITLE_WEIGHT} ${titleFontSize}px ${fontFamily}`;
    fittedTitle = fitText(measureCtx, title, maxWidth);
    elements.push({
      kind: 'title',
      height: titleFontSize * LINE_BOX,
      width: measureCtx.measureText(fittedTitle).width,
    });
  }

  let fittedName = '';
  if (name) {
    measureCtx.font = `${NAME_WEIGHT} ${nameFontSize}px ${fontFamily}`;
    fittedName = fitText(measureCtx, name, maxWidth);
    elements.push({
      kind: 'name',
      height: nameFontSize * LINE_BOX,
      width: measureCtx.measureText(fittedName).width,
    });
  }

  if (elements.length === 0) return null;

  const canvasWidth = Math.max(
    1,
    Math.ceil(Math.min(maxWidth, Math.max(...elements.map((e) => e.width)))),
  );
  const canvasHeight = Math.max(
    1,
    Math.ceil(elements.reduce((sum, e) => sum + e.height, 0) + gap * (elements.length - 1)),
  );

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.textBaseline = 'middle';

  const xFor = (w: number): number =>
    align === 'left' ? 0 : align === 'right' ? canvasWidth - w : (canvasWidth - w) / 2;

  let y = 0;
  for (const el of elements) {
    if (el.kind === 'logo' && logo) {
      ctx.drawImage(logo.canvas, xFor(el.width), y, el.width, el.height);
    } else if (el.kind === 'title') {
      ctx.font = `${TITLE_WEIGHT} ${titleFontSize}px ${fontFamily}`;
      ctx.fillStyle = textColor;
      ctx.textAlign = align;
      const letterSpacingContext = ctx as CanvasRenderingContext2D & { letterSpacing: string };
      letterSpacingContext.letterSpacing = `${titleFontSize * -0.01}px`;
      const tx = align === 'left' ? 0 : align === 'right' ? canvasWidth : canvasWidth / 2;
      ctx.fillText(fittedTitle, tx, y + el.height / 2);
      letterSpacingContext.letterSpacing = '0px';
    } else if (el.kind === 'name') {
      ctx.font = `${NAME_WEIGHT} ${nameFontSize}px ${fontFamily}`;
      ctx.fillStyle = textColor;
      ctx.globalAlpha = NAME_OPACITY;
      ctx.textAlign = align;
      const tx = align === 'left' ? 0 : align === 'right' ? canvasWidth : canvasWidth / 2;
      ctx.fillText(fittedName, tx, y + el.height / 2);
      ctx.globalAlpha = 1;
    }
    y += el.height + gap;
  }

  return { canvas, size: { width: canvasWidth, height: canvasHeight } };
}

// ═══ UV-rect math (VERBATIM copies — uvImprints.ts:85–165, keep in sync) ════

export interface UvRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** uvImprints.ts:85–126 — screen DOM rect → background-image UV rect with
 * the shaders' cover-fit transform (+ frame-0 rig correction). */
export function screenRectToUvImprintRect(
  screenRect: { left: number; top: number; width: number; height: number },
  frameSize: { width: number; height: number },
  imageSize: { width: number; height: number } | null | undefined,
  rig?: { planeMargin: number; pose: { x: number; y: number; zoom: number } } | null,
): UvRect | null {
  if (!imageSize || imageSize.height <= 0 || frameSize.height <= 0 || frameSize.width <= 0) {
    return null;
  }

  const frameAspect = frameSize.width / frameSize.height;
  const imageAspect = imageSize.width / imageSize.height;
  const csx = frameAspect > imageAspect ? 1 : frameAspect / imageAspect;
  const csy = frameAspect > imageAspect ? imageAspect / frameAspect : 1;

  const screenCx = (screenRect.left + screenRect.width / 2) / frameSize.width;
  const screenCy = 1 - (screenRect.top + screenRect.height / 2) / frameSize.height;

  const margin = rig?.planeMargin ?? 1;
  const pose = rig?.pose ?? { x: 0, y: 0, zoom: 1 };
  const planeCx =
    (pose.x + ((screenCx - 0.5) * frameSize.width) / pose.zoom) / (frameSize.width * margin) +
    0.5;
  const planeCy =
    (pose.y + ((screenCy - 0.5) * frameSize.height) / pose.zoom) / (frameSize.height * margin) +
    0.5;
  const planeW = screenRect.width / pose.zoom / (frameSize.width * margin);
  const planeH = screenRect.height / pose.zoom / (frameSize.height * margin);

  const cx = (planeCx - 0.5) * csx + 0.5;
  const cy = (planeCy - 0.5) * csy + 0.5;
  const w = planeW * csx;
  const h = planeH * csy;

  return { x: cx - w / 2, y: cy - h / 2, width: w, height: h };
}

/** uvImprints.ts:134–165 — default-rule UV rect (fraction of image height,
 * aspect preserved, maxW 0.92 clamp). */
export function uvImprintRect(
  spec: {
    naturalSize?: { width: number; height: number } | null;
    position?: { x: number; y: number };
    scale?: number;
    heightFraction?: number;
  },
  imageSize: { width: number; height: number } | null | undefined,
  isPortrait: boolean,
): UvRect | null {
  const { naturalSize, position, scale = 1, heightFraction } = spec;
  const effectivePosition = position ?? { x: 0.5, y: isPortrait ? 0.28 : 0.22 };
  if (!naturalSize || !imageSize || naturalSize.height <= 0 || imageSize.height <= 0) {
    return null;
  }

  const imprintAspect = naturalSize.width / naturalSize.height;
  const imageAspect = imageSize.width / imageSize.height;

  let h = (heightFraction ?? (isPortrait ? 0.04 : 0.06)) * scale;
  let w = (h * imprintAspect) / imageAspect;

  const maxW = 0.92;
  if (w > maxW) {
    w = maxW;
    h = (w * imageAspect) / imprintAspect;
  }

  return {
    x: effectivePosition.x - w / 2,
    y: effectivePosition.y - h / 2,
    width: w,
    height: h,
  };
}

// ═══ Composition-level orchestration ════════════════════════════════════════

export interface PreparedWatermarkSlot {
  canvas: HTMLCanvasElement;
  size: { width: number; height: number };
  alpha: number;
}

export interface PreparedLockupSlot {
  canvas: HTMLCanvasElement;
  size: { width: number; height: number };
  alpha: number;
  /** On-screen rect in DOM pixels — converted to image UV at scene build. */
  screenRect: { left: number; top: number; width: number; height: number };
}

export interface PreparedTikTokImprints {
  /** Slot 1: the 1:1 artwork stamp (uses the cover image itself, not a raster). */
  stamp: { alpha: number; screenRect: { left: number; top: number; width: number; height: number } } | null;
  /** Slot 2: the outro credit raster (frame-locked). */
  credit: PreparedLockupSlot | null;
}

export interface PreparedImprints {
  watermark: PreparedWatermarkSlot | null;
  lockup: PreparedLockupSlot | null;
  tiktok?: PreparedTikTokImprints | null;
}

/** VisualizerComposition.tsx:954–969 — final on-screen lockup rect from the
 * placement anchor + rasterised size, clamped to the frame. */
export function computeArtistLockupRect(
  anchor: { left?: number; centerX?: number; right?: number; top: number },
  size: { width: number; height: number },
  width: number,
  height: number,
): { left: number; top: number; width: number; height: number } {
  const rawLeft =
    anchor.left ??
    (anchor.centerX !== undefined ? anchor.centerX - size.width / 2 : (anchor.right ?? 0) - size.width);
  return {
    left: Math.min(Math.max(0, rawLeft), Math.max(0, width - size.width)),
    top: Math.min(Math.max(0, anchor.top), Math.max(0, height - size.height)),
    width: size.width,
    height: size.height,
  };
}

/**
 * Session-phase preparation of the uvImprints slots (the composition's
 * useWatermarkTexture + useArtistMarkTexture + useArtistLockupTexture +
 * uvImprints memo, VisualizerComposition.tsx:1044–1116). Returns null for
 * both slots when the background isn't a single-image WebGL scene (the
 * composition uses the HTML overlay path there instead).
 */
export async function prepareImprints(ctx: FrameContext): Promise<PreparedImprints> {
  const p = ctx.props;
  const { width, height } = ctx;

  // ── Watermark badge (slot 0) ────────────────────────────────────────────
  // Off: the watermark is always the crisp overlay badge drawn on top of the
  // finished frame (overlays/index.ts §6). The in-shader ghost imprint was
  // blended in before grade/grain/blur and read as faint and soft.
  const watermark: PreparedWatermarkSlot | null = null;

  // ── Artist lockup (slot 1) ──────────────────────────────────────────────
  let lockup: PreparedLockupSlot | null = null;
  if (ctx.lockupContent) {
    // Logo raster (useArtistMarkTexture) — only when displayed as 'logo'.
    let logo: RasterizedMark | null = null;
    if (ctx.artistMarkActive && p.artistLogoUrl) {
      logo = await rasterizeArtistMark(p.artistLogoUrl, { width, height });
    }

    const mainText = p.mainText ?? '';
    const subText = p.subText ?? '';
    const rendered = await renderArtistLockup({
      active: ctx.lockupContent,
      title: mainText || '',
      name: ctx.lockupHasName ? subText || '' : '',
      logo,
      fontFamily: ctx.fontFamily,
      textColor: ctx.effectiveTheme.textColor || '#ffffff',
      align: ctx.lockupPlacement.align,
      titleFontSize: ctx.lockupPlacement.titleFontSize,
      nameFontSize: ctx.lockupPlacement.nameFontSize,
      logoHeight: ctx.lockupPlacement.logoHeight,
      gap: ctx.lockupPlacement.gap,
      maxWidth: ctx.lockupPlacement.maxWidth,
    });

    if (rendered) {
      const screenRect = computeArtistLockupRect(
        ctx.lockupPlacement.anchor,
        rendered.size,
        width,
        height,
      );
      lockup = {
        canvas: rendered.canvas,
        size: rendered.size,
        alpha: ctx.lockupOverlayOnly || ctx.isTikTokLayout ? 0 : 1,
        screenRect,
      };
    }
  }

  // ── TikTok layout imprints (slots 1–2) ────────────────────────────────
  let tiktok: PreparedTikTokImprints | null = null;
  if (ctx.isTikTokLayout) {
    const style = resolveTikTokFrameStyle(
      ctx.theme,
      p.visualStyle?.tiktokFrameColor,
      p.visualStyle?.tiktokFrameTextColor,
    );
    // Canonical metrics are 1080×1920 px — scale to the actual frame height.
    const m = tiktokMetrics(height);
    const stamp = ctx.proxiedCoverImageUrl
      ? {
          alpha: 1,
          screenRect: {
            left: width - m.imprintRight - m.imprintSize,
            top: m.imprintTop,
            width: m.imprintSize,
            height: m.imprintSize,
          },
        }
      : null;

    let credit: PreparedLockupSlot | null = null;
    const mainText = p.mainText ?? '';
    const subText = p.subText ?? '';
    const creditRaw = creditText(mainText, subText);
    if (creditRaw) {
      const creditDisplay = widowJoin(creditRaw);
      const raster = renderHookText({
        text: creditDisplay,
        fontFamily: TIKTOK_FONT_FAMILY,
        color: style.hookColor,
        fontSize: m.creditFontSize,
        fontWeight: TIKTOK_CREDIT_FONT_WEIGHT,
        maxWidth: m.creditMaxWidth,
        lineHeight: 1.3,
        letterSpacing: '0.16em',
      });
      if (raster) {
        credit = {
          canvas: raster.canvas,
          size: raster.size,
          // Per-frame gate (showCreditAt) applied at uniform sync time.
          alpha: 0.55,
          screenRect: {
            left: (width - raster.size.width) / 2,
            top: m.bottomZoneStart + m.creditTopOffset,
            width: raster.size.width,
            height: raster.size.height,
          },
        };
      }
    }
    tiktok = { stamp, credit };
  }

  return { watermark, lockup, tiktok };
}

// ─── Hook/credit text raster (useTikTokHookTexture.ts) ──────────────────────

const HOOK_PAD_X = 4;
const HOOK_PAD_Y = 4;

export interface HookTextInput {
  text: string;
  fontFamily: string;
  color: string;
  fontSize?: number;
  fontWeight?: number;
  maxWidth?: number;
  lineHeight?: number;
  letterSpacing?: string;
}

/**
 * useTikTokHookTexture (:131–177) — balance-wrap + widow-protect the text
 * and rasterise it with PAD 4 margins (top baseline).
 */
export function renderHookText(
  input: HookTextInput,
): { canvas: HTMLCanvasElement; size: { width: number; height: number } } | null {
  const {
    text,
    fontFamily,
    color,
    fontSize = 44,
    fontWeight = 600,
    maxWidth = 620,
    lineHeight = 1.25,
    letterSpacing,
  } = input;

  const clean = text.trim();
  if (!clean || typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.font = font;
  if (letterSpacing) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      letterSpacing;
  }

  const words = splitWrapWords(clean);
  const wrapped = preventWidows(
    balanceWrap(words, maxWidth, (s) => ctx.measureText(s).width),
  );

  const lineStep = Math.round(fontSize * lineHeight);
  const textWidth = Math.ceil(
    Math.min(maxWidth, Math.max(...wrapped.map((l) => ctx.measureText(l).width))),
  );
  canvas.width = textWidth + HOOK_PAD_X * 2;
  canvas.height = lineStep * wrapped.length + HOOK_PAD_Y * 2;

  const draw = canvas.getContext('2d');
  if (!draw) return null;
  draw.font = font;
  if (letterSpacing) {
    (draw as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      letterSpacing;
  }
  draw.fillStyle = color;
  draw.textBaseline = 'top';
  wrapped.forEach((line, i) => {
    draw.fillText(line, HOOK_PAD_X, HOOK_PAD_Y + i * lineStep);
  });

  return {
    canvas,
    size: { width: canvas.width, height: canvas.height },
  };
}

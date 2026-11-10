/**
 * lib/renderer/overlays/index.ts — the fixed draw-order orchestrator for the
 * Canvas2D overlay layer, replicating the VisualizerComposition DOM stack
 * (VisualizerComposition.tsx:1585–1790) bottom→top:
 *
 *   1. dark scrim (:1602–1609) + overlay gradient (:1611–1616)
 *   2. hook wrapper transform (scale/shake — :1621–1628; the cinematic
 *      grayscale CSS filter is deferred, noted below)
 *   3. layout (15 ids via resolveLayoutComponent equivalent)
 *   4. fx overlays (:1634–1647 — grain via NoiseOverlay, vignette; sparkles
 *      (BokehLensFlare) + dust (DustOverlay) ported in Phase 1.7; snow is a
 *      wavecanvas-native procedural overlay with no DOM original)
 *   5. hook-opening fullscreen overlays (:1650–1691)
 *   6. DOM watermark badge (:1714–1734 — cover placements only; edge
 *      placements are the in-shader imprint from 1.3)
 *   7. DOM artist-lockup overlay (:1742–1750 — cinematic/lower-third only;
 *      other layouts use the in-shader imprint)
 *
 * Lyrics route through args.lyricBand (Phase 1.5 slot) — absent = no lyrics.
 */
import type { LayoutId } from '@/constants/layouts';
import { classicVisualizerPreset } from '@/constants/visualizers';
import type { FrameContext } from '../frame-context';
import { fillRect } from './draw';
import { drawGrain, drawVignette, drawSparkles, drawDust, drawSnow } from './fx';
import { drawDomWatermarkBadge } from './watermark';
import { drawClipHookCard } from './hook-card';
import { drawFullscreenLayout, drawMinimalLayout, drawCinematicLayout, drawEditorialLayout, drawLowerThirdLayout } from './layouts/simple';
import {
  drawPosterLayout,
  drawStackedLayout,
  drawSidebarLayout,
  drawBlurredLayout,
  drawCornerPocketLayout,
  drawCenterStageLayout,
  drawSplitLayout,
  drawSplitReverseLayout,
} from './layouts/covers';
import { drawVinylLayout } from './layouts/vinyl';
import { drawTikTokLayout } from './layouts/tiktok';
import type { LayoutArgs, LayoutDrawFn, LoadedImage } from './layouts/types';
import type { PreparedImprints } from '../imprints';
import type { LyricBandFrameDrawFn } from '../lyrics';
import type { VisualizerFrameFn } from '../visualizers';

const LAYOUT_DRAWERS: Record<LayoutId, LayoutDrawFn> = {
  header: drawPosterLayout,
  centered: drawStackedLayout, // portrait; landscape swapped below (resolveLayoutComponent)
  'full-bleed': drawBlurredLayout,
  'floating-card': drawSidebarLayout,
  fullscreen: drawFullscreenLayout,
  minimal: drawMinimalLayout,
  cinematic: drawCinematicLayout,
  'corner-pocket': drawCornerPocketLayout,
  'center-stage': drawCenterStageLayout,
  split: drawSplitLayout,
  'split-reverse': drawSplitReverseLayout,
  editorial: drawEditorialLayout,
  'lower-third': drawLowerThirdLayout,
  vinyl: drawVinylLayout,
  tiktok: drawTikTokLayout,
};

/** resolveLayoutComponent (layouts/index.ts:45–50) — 'centered' is
 * StackedLayout in portrait, SidebarLayout in landscape. */
function resolveLayoutDrawer(id: LayoutId, isPortrait: boolean): LayoutDrawFn {
  if (id === 'centered') return isPortrait ? drawStackedLayout : drawSidebarLayout;
  return LAYOUT_DRAWERS[id] ?? drawPosterLayout;
}

export interface OverlayLayerDeps {
  coverImage?: LoadedImage | null;
  imprints?: PreparedImprints | null;
  /** Phase 1.5 lyric-band renderer — bound to frame + spectrum per frame. */
  lyricBand?: LyricBandFrameDrawFn | null;
  /** Phase 1.6 visualizer renderer — bound to frame per frame. */
  visualizer?: VisualizerFrameFn | null;
  customLayer?: (ctx: CanvasRenderingContext2D, frame: number) => void;
}

/** Parse the theme's CSS `linear-gradient(…)` / `radial-gradient(…)` overlay
 * scrim into a canvas fill. Radial support covers the theme stock
 * (`circle|ellipse [at top|bottom|center|left|right]`, CSS default size
 * farthest-corner): circle radius = distance to the farthest corner; ellipse
 * radii = √2 × farthest-side distances (css-images-3), drawn via a scaled CTM
 * since canvas gradients are circular. */
function fillCssGradient(
  ctx: CanvasRenderingContext2D,
  value: string,
  width: number,
  height: number,
): void {
  const v = value.trim();
  const radial = v.match(/^radial-gradient\((.+)\)$/i);
  if (radial) {
    const parts = radial[1].split(/,(?![^()]*\))/).map((p) => p.trim()).filter(Boolean);
    const first = parts[0];
    let shape: 'circle' | 'ellipse' = 'circle';
    let cx = width / 2;
    let cy = height / 2;
    const sm = first.match(/^(circle|ellipse)(?:\s+at\s+(.+))?$/i);
    if (sm) {
      shape = sm[1].toLowerCase() as 'circle' | 'ellipse';
      const pos = (sm[2] ?? 'center').trim().toLowerCase();
      if (pos.includes('left')) cx = 0;
      else if (pos.includes('right')) cx = width;
      if (pos.includes('top')) cy = 0;
      else if (pos.includes('bottom')) cy = height;
      parts.shift();
    }
    const fx = Math.max(cx, width - cx);
    const fy = Math.max(cy, height - cy);
    ctx.save();
    let g: CanvasGradient;
    if (shape === 'circle') {
      const r = Math.hypot(fx, fy);
      g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    } else {
      // Ellipse: scale the CTM so the unit circle maps to (√2·fx, √2·fy).
      const rx = Math.SQRT2 * fx;
      const ry = Math.SQRT2 * fy;
      ctx.translate(cx, cy);
      ctx.scale(rx, ry);
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    }
    parts.forEach((part, i) => {
      const stop = part.match(/^(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}|[a-zA-Z]+)\s*(\d+(?:\.\d+)?%)?$/);
      if (!stop) return;
      const pos = stop[2] ? parseFloat(stop[2]) / 100 : i / Math.max(1, parts.length - 1);
      g.addColorStop(pos, stop[1]);
    });
    ctx.fillStyle = g;
    if (shape === 'circle') {
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillRect(-cx / (Math.SQRT2 * fx), -cy / (Math.SQRT2 * fy), width / (Math.SQRT2 * fx), height / (Math.SQRT2 * fy));
    }
    ctx.restore();
    return;
  }
  const m = v.match(/^linear-gradient\((.+)\)$/i);
  if (!m) {
    fillRect(ctx, 0, 0, width, height, value);
    return;
  }
  const parts = m[1].split(/,(?![^()]*\))/).map((p) => p.trim()).filter(Boolean);
  let angleDeg = 180;
  let stopParts = parts;
  const angleMatch = parts[0]?.match(/^(-?\d+(?:\.\d+)?)deg$/);
  const keywordMatch = parts[0]?.match(/^to\s+(left|right|top|bottom)$/i);
  if (angleMatch) {
    angleDeg = parseFloat(angleMatch[1]);
    stopParts = parts.slice(1);
  } else if (keywordMatch) {
    angleDeg = { left: 270, right: 90, top: 0, bottom: 180 }[keywordMatch[1].toLowerCase() as 'left' | 'right' | 'top' | 'bottom'];
    stopParts = parts.slice(1);
  }
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const half = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;
  const cx = width / 2;
  const cy = height / 2;
  const g = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
  stopParts.forEach((part, i) => {
    const sm = part.match(/^(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}|[a-zA-Z]+)\s*(\d+(?:\.\d+)?%)?$/);
    if (!sm) return;
    const pos = sm[2] ? parseFloat(sm[2]) / 100 : i / Math.max(1, stopParts.length - 1);
    g.addColorStop(pos, sm[1]);
  });
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * Radial-gradient vignette used by the hook-opening overlays — CSS
 * `radial-gradient(circle at 50% 45%, <stop1> <pct1>%, <tint> 100%)`: a
 * CIRCLE (not the ellipse used by VignetteOverlay) centred at (0.5w, 0.45h)
 * whose radius is the distance to the farthest corner from that centre.
 */
function drawRadialVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  centerStops: [number, string][],
): void {
  const cx = width / 2;
  const cy = height * 0.45;
  const radius = Math.max(
    Math.hypot(cx - 0, cy - 0),
    Math.hypot(width - cx, cy - 0),
    Math.hypot(cx - 0, height - cy),
    Math.hypot(width - cx, height - cy),
  );
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  for (const [pos, color] of centerStops) g.addColorStop(pos, color);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** RMS of the frequency bins (NoiseOverlay's getRms). */
function freqRms(frequencyData: ArrayLike<number>): number {
  if (frequencyData.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < frequencyData.length; i++) sum += frequencyData[i] * frequencyData[i];
  return Math.sqrt(sum / frequencyData.length);
}

export function drawOverlayLayer(
  ctx: CanvasRenderingContext2D,
  fctx: FrameContext,
  frame: number,
  deps: OverlayLayerDeps = {},
): void {
  const { width, height } = fctx;
  const a = fctx.frameArgs(frame);
  const p = fctx.props;

  // 1. Scrims (:1602–1616). The TikTok layout paints its own OPAQUE
  // full-frame background over these (TikTokLayout's AbsoluteFill sits above
  // them in DOM order), so they are never visible for it.
  if (!fctx.isTikTokLayout && fctx.darkScrimVisible) {
    fillRect(ctx, 0, 0, width, height, 'rgba(0,0,0,0.40)');
  }
  if (!fctx.isTikTokLayout && fctx.overlayGradientVisible && fctx.theme.overlayGradient) {
    fillCssGradient(ctx, fctx.theme.overlayGradient, width, height);
  }

  // Hook-opening overlays (:1650–1691): screen flashes, vignettes, the
  // minimal black fade and the cinematic letterbox bars. DOM order puts
  // them AFTER the hook wrapper, but the wrapper carries z-index: 20 while
  // they don't — so it paints ON TOP of them: every one of these overlays
  // only shows where the wrapper is transparent (the background, scrims and
  // fx layers below the layout). mix-blend-mode: screen flashes additionally
  // blend only with that same below-wrapper backdrop. Draw them all BEFORE
  // the layout to replicate the real stacking exactly.
  if (a.hookMinimalBlackOpacity > 0) {
    fillRect(ctx, 0, 0, width, height, `rgba(0,0,0,${a.hookMinimalBlackOpacity})`);
  }
  if (a.hookSubtleAmberOpacity > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    fillRect(ctx, 0, 0, width, height, `rgba(255,180,60,${a.hookSubtleAmberOpacity})`);
    ctx.restore();
  }
  if (a.hookImpactFlash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    fillRect(ctx, 0, 0, width, height, `rgba(255,255,255,${a.hookImpactFlash})`);
    ctx.restore();
  }
  if (a.hookAggressiveRedFlash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    fillRect(ctx, 0, 0, width, height, `rgba(220,20,0,${a.hookAggressiveRedFlash})`);
    ctx.restore();
  }
  if (a.hookAggressiveWhiteFlash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    fillRect(ctx, 0, 0, width, height, `rgba(255,255,255,${a.hookAggressiveWhiteFlash})`);
    ctx.restore();
  }
  if (a.hookSubtleVignette > 0) {
    drawRadialVignette(ctx, width, height, [
      [0.3, 'rgba(0,0,0,0)'],
      [1, `rgba(0,0,0,${a.hookSubtleVignette})`],
    ]);
  }
  if (a.hookImpactVignette > 0) {
    drawRadialVignette(ctx, width, height, [
      [0.34, 'rgba(0,0,0,0)'],
      [1, `rgba(0,0,0,${a.hookImpactVignette})`],
    ]);
  }
  if (a.hookAggressiveVignette > 0) {
    drawRadialVignette(ctx, width, height, [
      [0.2, 'rgba(0,0,0,0)'],
      [1, `rgba(0,0,0,${a.hookAggressiveVignette})`],
    ]);
  }
  if (a.hookCinematicBarHeight > 0) {
    const barPx = a.hookCinematicBarHeight * height;
    fillRect(ctx, 0, 0, width, barPx, '#000000');
    fillRect(ctx, 0, height - barPx, width, barPx, '#000000');
  }
  if (a.hookCinematicVignette > 0) {
    drawRadialVignette(ctx, width, height, [
      [0.4, 'rgba(0,0,0,0)'],
      [1, `rgba(0,0,0,${a.hookCinematicVignette})`],
    ]);
  }

  // 2–3. Hook wrapper transform + layout (:1621–1631).
  // The wrapper is a promoted compositor layer: Chrome rasterizes its content
  // at natural size and then GPU-SCALES the bitmap. Drawing each primitive
  // under a scaled CTM instead would anti-alias differently at edges, so we
  // rasterize the wrapper section (layout + fx) into a temp canvas first and
  // blit it with the wrapper's transform — matching the compositor exactly.
  const wrapTransform = a.hookPushScale !== 1 || a.hookShakeX !== 0;
  let wrapCtx = ctx;
  let wrapCanvas: HTMLCanvasElement | null = null;
  if (wrapTransform) {
    wrapCanvas = document.createElement('canvas');
    wrapCanvas.width = width;
    wrapCanvas.height = height;
    const c = wrapCanvas.getContext('2d');
    if (!c) throw new Error('overlay: no 2d context (hook wrapper)');
    wrapCtx = c;
  }

  const textLockupActive = fctx.lockupContent && !!deps.imprints?.lockup;

  // 4. Fx overlays (:1634–1647 + FxOverlays.tsx:66–82) — inside the wrapper.
  const overlayEffects = fctx.fxOverlayEffects;
  const overlayEffect = fctx.fxOverlayEffect;
  const hasNewEffects = overlayEffects !== undefined && overlayEffects !== null;
  const effects = hasNewEffects
    ? overlayEffects!
    : overlayEffect && overlayEffect !== 'none'
      ? [overlayEffect]
      : [];
  const hasExplicitEffects = effects.length > 0;
  const enableFilmGrain = p.enableFilmGrain ?? true;
  const isOriginalGrade = (p.colourGradeIntensity ?? 1) <= 0;
  const showGrain = hasNewEffects
    ? effects.includes('grain')
    : effects.includes('grain') || (!hasExplicitEffects && enableFilmGrain);
  const showVignette = !isOriginalGrade && effects.includes('vignette');
  const showSparkles = effects.includes('sparkles');
  const showDust = effects.includes('dust');
  const showSnow = effects.includes('snow');
  // The fx overlays carry zIndex:auto in the real DOM — they paint AFTER the
  // layout's own z-index:auto content but BEFORE any layout element with an
  // explicit z-index (covers, titles, bars, lyric bands). Layouts call
  // args.fxOverlays at that stacking-correct point; whatever they don't draw
  // here falls back to after the whole layout (correct for z-index-free
  // layouts like fullscreen/vinyl).
  let fxDrawn = false;
  const drawFx = (c: CanvasRenderingContext2D) => {
    if (fxDrawn) return;
    fxDrawn = true;
    // FxOverlays render order: NoiseOverlay → BokehLensFlare → DustOverlay →
    // VignetteOverlay. Snow is a wavecanvas-native procedural overlay (no DOM
    // original); it draws after dust and before the vignette.
    if (showGrain) {
      drawGrain(c, frame, width, height, freqRms(a.frequencyData));
    }
    if (showSparkles) {
      drawSparkles(c, frame, width, height, a.frequencyData,
        fctx.effectiveTheme.accentColor || '#4ECDC4', p.isPodcast ?? false);
    }
    if (showDust) {
      drawDust(c, frame, fctx.fps, width, height);
    }
    if (showSnow) {
      drawSnow(c, frame, fctx.fps, width, height);
    }
    if (showVignette) {
      drawVignette(c, width, height);
    }
  };

  const layoutArgs: LayoutArgs = {
    width,
    height,
    isPortrait: fctx.isPortrait,
    theme: fctx.effectiveTheme,
    fontFamily: fctx.fontFamily,
    mainText: fctx.props.mainText ?? '',
    subText: fctx.props.subText ?? '',
    hook: fctx.effectiveHook,
    textLockupActive,
    socialLinks: p.socialLinks,
    coverImage: deps.coverImage ?? null,
    // Layouts size the slot by preset; WebGL presets borrow their classic
    // base's geometry (the slot's visualizer draw still uses fctx.preset).
    preset: classicVisualizerPreset(fctx.preset),
    fps: fctx.fps,
    durationInFrames: fctx.durationInFrames,
    isPodcast: p.isPodcast ?? false,
    isThumbnail: p.isThumbnail ?? false,
    colourGradeIntensity: p.colourGradeIntensity ?? 0.5,
    frameColor: p.visualStyle?.tiktokFrameColor,
    frameTextColor: p.visualStyle?.tiktokFrameTextColor,
    animateHook: p.visualStyle?.animateHook ?? false,
    subtitle: fctx.effectiveSubtitle,
    frequencyData: a.frequencyData,
    imprints: deps.imprints ?? null,
    lyricBand: deps.lyricBand
      ? (c, band) => deps.lyricBand!(c, band, frame, a.frequencyData)
      : null,
    visualizer: deps.visualizer
      ? (c, slot) => deps.visualizer!(c, slot, frame)
      : null,
    fxOverlays: drawFx,
  };
  resolveLayoutDrawer(fctx.layoutId, fctx.isPortrait)(wrapCtx, layoutArgs, frame);
  deps.customLayer?.(wrapCtx, frame);
  drawFx(wrapCtx);

  if (wrapCanvas) {
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(a.hookPushScale, a.hookPushScale);
    ctx.translate(-width / 2 + a.hookShakeX, -height / 2);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(wrapCanvas, 0, 0);
    ctx.restore();
  }

  // 6. Watermark badge — drawn on top of the finished frame for EVERY
  // watermarked video (free tier). It used to be skipped for edge placements
  // in favour of the in-shader imprint, but that ghost is blended in before
  // grade/grain/blur and read as faint and soft (easy to miss entirely), and
  // the TikTok-layout exclusion let old videos export with no watermark.
  const showWatermark = p.showWatermark ?? false;
  if (showWatermark && !(p.isThumbnail ?? false)) {
    drawDomWatermarkBadge(ctx, {
      width,
      height,
      isPortrait: fctx.isPortrait,
      bottomOffset:
        fctx.isPortrait && p.socialLinks?.links?.length ? Math.round(height * 0.12) : 0,
      horizontalAlign:
        fctx.watermarkPlacement.type === 'edge' ? fctx.watermarkPlacement.align : undefined,
      coverRect:
        fctx.watermarkPlacement.type === 'cover' ? fctx.watermarkPlacement.rect : null,
      scale: 0.65,
    });
  }

  // 7. DOM artist-lockup overlay (:1742–1750) — cinematic/lower-third bars.
  const lockup = deps.imprints?.lockup;
  if (
    textLockupActive &&
    lockup &&
    !(p.isThumbnail ?? false) &&
    !fctx.isTikTokLayout &&
    (!fctx.webglSingleImageBackground || fctx.lockupOverlayOnly)
  ) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.drawImage(
      lockup.canvas,
      lockup.screenRect.left,
      lockup.screenRect.top,
      lockup.screenRect.width,
      lockup.screenRect.height,
    );
    ctx.restore();
  }

  // 8. Held intro card (ClipHookCard — VisualizerComposition.tsx:1985–2001):
  // paints on top of everything for voEndFrames when a clipHook is set.
  if (fctx.clipHook) {
    drawClipHookCard(ctx, fctx, fctx.clipHook, frame);
  }
}

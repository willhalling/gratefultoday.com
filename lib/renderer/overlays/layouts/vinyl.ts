/**
 * lib/renderer/overlays/layouts/vinyl.ts — Canvas2D port of VinylLayout.tsx.
 * The record is the cover inside a circular clip rotating frame×0.15° with a
 * dark ring + centre spindle. The cloth-wave WebGL sim inside WavyAlbumScene
 * (used only when NOT isPodcast) is deferred — fixtures run the isPodcast
 * static-image path (WavyAlbumCover.tsx:52–74), which this replicates
 * exactly; the rotation is outside the WebGL part and included here.
 */
import { drawTextLine } from '../text';
import { drawSocialIcons } from '../social';
import { WavyAlbumRenderer } from '../../wavy-album';
import type { LayoutDrawFn } from './types';

// Per-image WavyAlbumScene instances (the record's GL canvas), keyed by image.
const albumCache = new WeakMap<HTMLImageElement, { canvas: HTMLCanvasElement; renderer: WavyAlbumRenderer }>();

function albumEntry(img: HTMLImageElement, size: number) {
  let entry = albumCache.get(img);
  if (!entry || entry.canvas.width !== size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const renderer = new WavyAlbumRenderer(canvas, size, size);
    renderer.setImage(img);
    entry = { canvas, renderer };
    albumCache.set(img, entry);
  }
  return entry;
}

function getAlbumRenderer(img: HTMLImageElement, size: number): WavyAlbumRenderer | null {
  return albumEntry(img, size).renderer;
}

function albumCanvas(img: HTMLImageElement, size: number): HTMLCanvasElement | null {
  return albumEntry(img, size).canvas;
}

export const drawVinylLayout: LayoutDrawFn = (ctx, args, frame) => {
  const { width, height, isPortrait, theme, fontFamily, mainText, subText, socialLinks } =
    args;
  const minDim = Math.min(width, height);
  const showText = !args.textLockupActive;

  const recordSize = isPortrait ? width * 0.7 : minDim * 0.55;
  const spindleSize = recordSize * 0.16;
  const ringWidth = minDim * 0.012;

  const center = isPortrait
    ? { x: width / 2, y: height * 0.12 + recordSize / 2 }
    : { x: width * 0.08 + recordSize / 2, y: height / 2 };

  // Record: circular clip, rotation, the WavyAlbumScene artwork at
  // recordSize². The scene's 756px canvas is displayed at 100% of the
  // border-box CONTENT box (recordSize − 2×ring = 730.08) — CSS downscales
  // it; draw at content size, centred.
  if (args.coverImage && args.coverImage.img instanceof HTMLImageElement) {
    const contentSize = recordSize - ringWidth * 2;
    const album = getAlbumRenderer(args.coverImage.img, Math.round(recordSize));
    if (album) {
      album.renderFrame({ frame, fps: args.fps, frequencyData: args.frequencyData });
      ctx.save();
      // Box shadow on the outer circle (0 20px 60px rgba(0,0,0,0.6)).
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 60;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 20;
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(center.x, center.y, recordSize / 2 + ringWidth, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(center.x, center.y, recordSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.translate(center.x, center.y);
      ctx.rotate((frame * 0.15 * Math.PI) / 180);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      ctx.drawImage(
        albumCanvas(args.coverImage.img, Math.round(recordSize))!,
        -contentSize / 2,
        -contentSize / 2,
        contentSize,
        contentSize,
      );
      ctx.restore();
    }
  }

  // Spindle: theme background fill + accent ring.
  ctx.save();
  ctx.fillStyle = theme.background.type === 'solid' ? theme.background.value : '#111';
  ctx.beginPath();
  ctx.arc(center.x, center.y, spindleSize / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = theme.accentColor;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  const textBlock = (centered: boolean, top: number, x: number) => {
    let y = top;
    const gap = minDim * 0.012;
    if (mainText && showText) {
      drawTextLine(ctx, mainText, {
        fontSize: minDim * 0.055,
        weight: 'bold',
        family: fontFamily,
        color: theme.textColor,
        textShadow: theme.textShadow,
        lineHeight: 1.2,
      }, {
        x,
        top: y,
        align: centered ? 'center' : 'left',
        maxWidth: centered ? width * 0.85 : undefined,
      });
      y += minDim * 0.055 * 1.2 + gap;
    }
    if (subText && showText) {
      drawTextLine(ctx, subText, {
        fontSize: minDim * 0.03,
        weight: 400,
        family: fontFamily,
        color: theme.textColor,
        textShadow: theme.textShadow,
        opacity: 0.65,
        lineHeight: 1.2,
      }, {
        x,
        top: y,
        align: centered ? 'center' : 'left',
        maxWidth: centered ? width * 0.85 : undefined,
      });
    }
  };

  const hasViz = args.preset !== 'none';
  const vizHeight = minDim * 0.06;
  const textH =
    (mainText && showText ? minDim * 0.055 * 1.2 : 0) +
    (mainText && subText && showText ? minDim * 0.012 : 0) +
    (subText && showText ? minDim * 0.03 * 1.2 : 0);
  const vizStyle = {
    lineThickness: Math.max(3, minDim * 0.006),
    gapSize: Math.max(2, minDim * 0.003),
    roundness: 4,
  };

  if (isPortrait) {
    const columnTop = height * 0.12 + recordSize + minDim * 0.04;
    textBlock(true, columnTop, width / 2);
    if (hasViz) {
      const vizWidth = width * 0.7;
      args.visualizer?.(ctx, {
        left: (width - vizWidth) / 2,
        top: columnTop + textH + minDim * 0.05,
        width: vizWidth,
        height: vizHeight,
        accentColor: theme.accentColor || '#8B5CF6',
        style: vizStyle,
      });
    }
  } else {
    // Column (text + visualizer, gap minDim*0.03) vertically centred as a unit.
    const totalH = textH + (hasViz ? minDim * 0.03 + vizHeight : 0);
    const columnTop = height / 2 - totalH / 2;
    textBlock(false, columnTop, width * 0.52);
    if (hasViz) {
      args.visualizer?.(ctx, {
        left: width * 0.52,
        top: columnTop + textH + minDim * 0.03,
        width: width * 0.35,
        height: vizHeight,
        accentColor: theme.accentColor || '#8B5CF6',
        style: vizStyle,
      });
    }
  }

  if (socialLinks && socialLinks.links.length > 0) {
    drawSocialIcons(ctx, socialLinks, { width, height }, theme, fontFamily, {
      isPortrait,
      hasImage: !!args.coverImage,
    });
  }
};

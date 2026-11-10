/**
 * lib/renderer/overlays/hook-card.ts — Canvas2D port of ClipHookCard.tsx, the
 * held intro card mounted for `voEndFrames` when a clipHook is set
 * (VisualizerComposition.tsx:1985–2001).
 *
 * Fades (ClipHookCard.tsx:46–85):
 *   fadeFrames  = min(round(0.3·fps), floor(holdFrames/3))
 *   scrimStart  = floor(holdFrames·0.3)
 *   opacity     = 1 → 0 over the last fadeFrames (Easing.inOut(ease)) — a GROUP
 *                 opacity on the whole card (scrim + content rasterized first,
 *                 then alpha-faded, like CSS opacity on the AbsoluteFill)
 *   scale       = 1 → 0.985 over the last fadeFrames (Easing.out(cubic))
 *   scrim       = rgba(0,0,0,0.55) fading from scrimStart to holdFrames
 *                 (Easing.inOut(cubic))
 *
 * Variants:
 *   pill     — tilted (−3deg) per-line painted pills (boxDecorationBreak:
 *              clone), boxShadow '0 10px 32px rgba(0,0,0,0.35)'
 *   inkBleed — the lyric InkBleed (reused via drawInkBleedPhrase) over the
 *              same scrim, text colour through ensureReadableTextColor on
 *              black (the 55% scrim), accent = bgColor
 */
import { Easing, interpolate } from '../timing';
import { drawInkBleedPhrase } from '../lyrics/kinetic';
import { ensureReadableTextColor } from '@/lib/hook-contrast';
import { applyTextShadow } from './text';
import type { FrameContext } from '../frame-context';

type ClipHook = NonNullable<FrameContext['clipHook']>;

/** Word-wrap into lines that fit maxWidth (space-separated greedy wrap). */
function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function drawClipHookCard(
  ctx: CanvasRenderingContext2D,
  fctx: FrameContext,
  clipHook: ClipHook,
  frame: number,
): void {
  const { width, height, fps, voEndFrames } = fctx;
  if (frame >= voEndFrames || voEndFrames <= 0) return;

  const holdFrames = Math.max(1, voEndFrames);
  const fadeFrames = Math.min(Math.round(0.3 * fps), Math.floor(holdFrames / 3));
  const scrimStart = Math.floor(holdFrames * 0.3);

  const opacity = interpolate(
    frame,
    [Math.max(0, holdFrames - fadeFrames), holdFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.bezier(0.25, 0.1, 0.25, 1)) },
  );
  const scale = interpolate(
    frame,
    [Math.max(0, holdFrames - fadeFrames), holdFrames],
    [1, 0.985],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) },
  );
  const scrimOpacity = interpolate(
    frame,
    [scrimStart, holdFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) },
  );
  if (opacity <= 0) return;

  // The card's AbsoluteFill opacity is a GROUP opacity (scrim + content
  // rasterized first, then faded) — draw into a temp canvas, blit at `opacity`.
  const tmp = document.createElement('canvas');
  tmp.width = width;
  tmp.height = height;
  const c = tmp.getContext('2d');
  if (!c) return;

  // Dark scrim (dims the live scene while the hook is held).
  if (scrimOpacity > 0) {
    c.save();
    c.globalAlpha *= scrimOpacity;
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.fillRect(0, 0, width, height);
    c.restore();
  }

  if ((clipHook.animation ?? 'pill') === 'inkBleed') {
    const { textColor: safeText } = ensureReadableTextColor('#000000', clipHook.textColor, {
      minRatio: 4.5,
    });
    drawInkBleedPhrase(c, {
      text: clipHook.text,
      frame,
      durationInFrames: holdFrames,
      width,
      height,
      color: safeText,
      accentColor: clipHook.bgColor,
      fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif',
    });
  } else {
    // ── pill variant ──
    const fontSize = Math.round(width * 0.07);
    const padH = Math.round(fontSize * 0.45);
    const padV = Math.round(fontSize * 0.22);
    const radius = Math.round(fontSize * 0.24);
    const lineHeight = 1.55;

    c.save();
    // The card sets no font-family — it renders in the UA default (serif),
    // which maps identically on both parity pages.
    c.font = `700 ${fontSize}px serif`;
    c.textBaseline = 'middle';
    c.textAlign = 'center';

    // The wrapper div is maxWidth 88% of the AbsoluteFill's 8%-padded content
    // box — wrap at 0.88 × 0.84 × width.
    const lines = wrapLines(c, clipHook.text, width * 0.84 * 0.88);
    const lineBoxH = fontSize * lineHeight;
    const blockH = lines.length * lineBoxH;
    const blockTop = (height - blockH) / 2;

    // rotate(-3deg) scale(s) about the text block's centre (= frame centre).
    const cx = width / 2;
    const cy = blockTop + blockH / 2;
    c.translate(cx, cy);
    c.rotate((-3 * Math.PI) / 180);
    c.scale(scale, scale);
    c.translate(-cx, -cy);

    lines.forEach((line, i) => {
      const lineW = c.measureText(line).width;
      const lineX = cx - lineW / 2;
      const lineTop = blockTop + i * lineBoxH;
      // The pill hugs the line's content + padding; the span's bg covers the
      // em box (≈ fontSize) + padV vertically, centred in the line box.
      const pillX = lineX - padH;
      const pillY = lineTop + (lineBoxH - fontSize) / 2 - padV;
      const pillW = lineW + padH * 2;
      const pillH = fontSize + padV * 2;

      // boxShadow '0 10px 32px rgba(0,0,0,0.35)' — CSS box-shadow is
      // outside-only: fill with shadow, clear, then paint the pill.
      c.save();
      c.shadowColor = 'rgba(0,0,0,0.35)';
      c.shadowBlur = 32;
      c.shadowOffsetX = 0;
      c.shadowOffsetY = 10;
      c.fillStyle = clipHook.bgColor;
      c.beginPath();
      c.roundRect(pillX, pillY, pillW, pillH, radius);
      c.fill();
      c.restore();
      c.save();
      c.beginPath();
      c.roundRect(pillX, pillY, pillW, pillH, radius);
      c.clip();
      c.clearRect(pillX - 1, pillY - 1, pillW + 2, pillH + 2);
      c.fillStyle = clipHook.bgColor;
      c.beginPath();
      c.roundRect(pillX, pillY, pillW, pillH, radius);
      c.fill();
      c.restore();

      applyTextShadow(c, clipHook.textShadow ?? 'none');
      c.fillStyle = clipHook.textColor;
      c.fillText(line, cx, lineTop + lineBoxH / 2);
    });
    c.restore();
  }

  ctx.save();
  ctx.globalAlpha *= opacity;
  ctx.drawImage(tmp, 0, 0);
  ctx.restore();
}

/**
 * lib/renderer/overlays/draw.ts — Canvas2D primitives shared by the layout
 * ports: CSS object-fit: cover image drawing (with rounded clip + CSS
 * box-shadow), rounded rects, 1px borders, SVG icon paths in accent circles.
 */

/** Rounded-rect path (same semantics as the watermark helper). */
export function roundedRectPath(
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

/** Parse `0 20px 60px rgba(0,0,0,0.5)`-style CSS box-shadow. */
export function applyBoxShadow(ctx: CanvasRenderingContext2D, shadow: string | undefined): void {
  if (!shadow) return;
  const first = shadow.split(/,(?![^()]*\))/)[0].trim();
  const m = /^(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px(?:\s+(-?[\d.]+)px)?\s+(.+)$/.exec(first);
  if (m) {
    ctx.shadowOffsetX = parseFloat(m[1]);
    ctx.shadowOffsetY = parseFloat(m[2]);
    ctx.shadowBlur = parseFloat(m[3]);
    ctx.shadowColor = m[5].trim();
  }
}

export function clearShadow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

export interface CoverImageOpts {
  borderRadius?: number;
  boxShadow?: string;
  opacity?: number;
  /** CSS border (e.g. editorial's `1px solid rgba(255,255,255,0.25)`). */
  border?: { width: number; color: string };
}

/**
 * CSS object-fit: cover — draw `img` into (x, y, w, h) with a centred crop,
 * optional rounded clip, box-shadow and 1px border. The image is treated as
 * sRGB (DOM <img> equivalence — Canvas2D does no colour conversion either way).
 */
export function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  srcW: number,
  srcH: number,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: CoverImageOpts = {},
): void {
  const { borderRadius = 0, boxShadow, opacity = 1, border } = opts;
  if (!(srcW > 0) || !(srcH > 0) || !(w > 0) || !(h > 0)) return;

  const scale = Math.max(w / srcW, h / srcH);
  const cw = w / scale;
  const ch = h / scale;
  const sx = (srcW - cw) / 2;
  const sy = (srcH - ch) / 2;

  ctx.save();
  ctx.globalAlpha *= opacity;
  if (boxShadow) {
    applyBoxShadow(ctx, boxShadow);
    // CSS box-shadow renders OUTSIDE the box only — canvas shadows fall on
    // both sides of the shape, so fill the shape first (casting the shadow),
    // then clear the shadow before drawing the image itself.
    ctx.fillStyle = '#000';
    if (borderRadius > 0) {
      roundedRectPath(ctx, x, y, w, h, borderRadius);
    } else {
      ctx.beginPath();
      ctx.rect(x, y, w, h);
    }
    ctx.fill();
    clearShadow(ctx);
  }
  if (borderRadius > 0) {
    roundedRectPath(ctx, x, y, w, h, borderRadius);
    ctx.clip();
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';
  ctx.drawImage(img, sx, sy, cw, ch, x, y, w, h);
  ctx.restore();

  if (border && border.width > 0) {
    ctx.save();
    ctx.globalAlpha *= opacity;
    if (borderRadius > 0) {
      roundedRectPath(ctx, x + border.width / 2, y + border.width / 2, w - border.width, h - border.width, borderRadius);
    } else {
      ctx.beginPath();
      ctx.rect(x + border.width / 2, y + border.width / 2, w - border.width, h - border.width);
    }
    ctx.strokeStyle = border.color;
    ctx.lineWidth = border.width;
    ctx.stroke();
    ctx.restore();
  }
}

/** A solid rgba fill rect (scrims, bars, dividers). */
export function fillRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** Platform icon inside an accent circle (SocialIcons/SocialPanel visual). */
export function drawIconCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  diameter: number,
  accentColor: string,
  iconPathD: string,
  iconColor: string,
): void {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = diameter * 0.16;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = diameter * 0.08;
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(cx, cy, diameter / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const scale = (diameter * 0.55) / 24;
  ctx.save();
  ctx.translate(cx - (diameter * 0.55) / 2, cy - (diameter * 0.55) / 2);
  ctx.scale(scale, scale);
  ctx.fillStyle = iconColor;
  ctx.fill(new Path2D(iconPathD));
  ctx.restore();
}

/** sRGB → relative luminance (SocialIcons' getColorLuminance). */
export function relativeLuminance(color: string): number {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const [rs, gs, bs] = [r, g, b].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function contrastingIconColor(accentColor: string): string {
  return relativeLuminance(accentColor) > 0.5 ? '#000000' : '#FFFFFF';
}

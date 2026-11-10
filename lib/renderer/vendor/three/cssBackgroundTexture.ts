/**
 * Render a theme background (solid colour or CSS linear-gradient) into a
 * canvas and return it as a PNG data URL.
 *
 * Colour/gradient backgrounds have no image file, so historically they never
 * entered the WebGL background pipeline — the shader scenes all key off an
 * image URL. Feeding them a generated texture instead lets solid/gradient
 * backgrounds flow through the exact same scenes as image backgrounds, which
 * is what unlocks the atmosphere controls (wave, shader effects, colour
 * grade, camera motion, in-shader imprints) for colour-only videos.
 *
 * The plate is not a perfectly flat fill: the atmosphere shaders are
 * pixel-distortion effects (wave/glitch/rain/pulse displace UVs, camera
 * motion transforms the plane), and distorting a uniform field yields the
 * same uniform field — nothing would be visible. So on top of the user's
 * exact base colour/gradient we add a few large, soft palette-tinted blobs
 * and a gentle vignette. Static, it still reads as "my colour"; in motion,
 * every effect has detail to act on. All geometry is fixed (no randomness)
 * so Remotion server renders match the client preview.
 */

interface GradientStop {
  color: string;
  position: number;
}

export interface CssBackgroundTextureOptions {
  /** Theme accent colour — tints the ambient blobs. */
  accentColor?: string;
}

/** Parse `linear-gradient(<angle>deg, #aaa 0%, #bbb 100%)` — the only
 *  gradient format the app generates (visualStyleToThemeConfig /
 *  buildThemeFromCustom). Returns null for anything else. */
function parseLinearGradient(
  value: string
): { angleDeg: number; stops: GradientStop[] } | null {
  const m = value.trim().match(/^linear-gradient\((.+)\)$/i);
  if (!m) return null;
  const parts = m[1]
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  let angleDeg = 180; // CSS default: to bottom
  let stopParts = parts;
  const angleMatch = parts[0]?.match(/^(-?\d+(?:\.\d+)?)deg$/);
  if (angleMatch) {
    angleDeg = parseFloat(angleMatch[1]);
    stopParts = parts.slice(1);
  }

  const stops: GradientStop[] = [];
  stopParts.forEach((part, i) => {
    const sm = part.match(/^(#[0-9a-fA-F]{3,8})\s*(\d+(?:\.\d+)?%)?$/);
    if (!sm) return;
    const position = sm[2]
      ? parseFloat(sm[2]) / 100
      : i / Math.max(1, stopParts.length - 1);
    stops.push({ color: sm[1], position });
  });
  return stops.length >= 2 ? { angleDeg, stops } : null;
}

/** Canvas endpoints for a CSS gradient angle (0deg = to top, clockwise). */
function gradientLine(angleDeg: number, width: number, height: number) {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const half = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;
  const cx = width / 2;
  const cy = height / 2;
  return {
    x0: cx - dx * half,
    y0: cy - dy * half,
    x1: cx + dx * half,
    y1: cy + dy * half,
  };
}

// ── Colour helpers ────────────────────────────────────────────────────────

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): Rgb | null {
  const m = hex.trim().match(/^#([0-9a-fA-F]{6})/);
  if (!m) return null;
  const n = parseInt(m[1].slice(0, 6), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/** Perceived luminance 0–255 (Rec. 601). */
function luminance({ r, g, b }: Rgb): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function rgba({ r, g, b }: Rgb, alpha: number): string {
  return `rgba(${r},${g},${b},${alpha})`;
}

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const BLACK: Rgb = { r: 0, g: 0, b: 0 };

// ── Ambient detail ─────────────────────────────────────────────────────────
// Fixed blob layout (fractions of the plate, golden-ratio-ish spacing) so
// the texture is deterministic across client preview and server renders.
const BLOBS: { x: number; y: number; radius: number }[] = [
  { x: 0.24, y: 0.3, radius: 0.62 },
  { x: 0.8, y: 0.6, radius: 0.52 },
  { x: 0.46, y: 0.88, radius: 0.56 },
];

/** Longest-side cap for the generated texture — the plate is all soft
 *  gradients, so a small texture upscaled by the scene looks identical and
 *  keeps data URLs / GPU uploads cheap. */
const MAX_TEXTURE_SIDE = 512;

export function cssBackgroundToDataUrl(
  value: string,
  width: number,
  height: number,
  options: CssBackgroundTextureOptions = {}
): string | null {
  if (typeof document === 'undefined') return null;
  const clean = value.trim();
  if (!clean) return null;

  const scale = Math.min(1, MAX_TEXTURE_SIDE / Math.max(width, height));
  const w = Math.max(2, Math.round(width * scale));
  const h = Math.max(2, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Base — the user's exact solid colour or gradient.
  const gradient = parseLinearGradient(clean);
  if (gradient) {
    const { x0, y0, x1, y1 } = gradientLine(gradient.angleDeg, w, h);
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const stop of gradient.stops) g.addColorStop(stop.position, stop.color);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = clean;
  }
  ctx.fillRect(0, 0, w, h);

  // 2. Ambient detail — soft palette blobs so distortion-based atmospheres
  //    (wave, glitch, rain, pulse, camera motion) have something to act on.
  const startRgb = hexToRgb(gradient?.stops[0]?.color ?? clean) ?? BLACK;
  const endRgb = hexToRgb(gradient?.stops[gradient.stops.length - 1]?.color ?? clean) ?? startRgb;
  const accentRgb = hexToRgb(options.accentColor ?? '') ?? mix(startRgb, WHITE, 0.35);
  const baseIsDark = luminance(mix(startRgb, endRgb, 0.5)) < 128;

  // Dark plates get additive glow blobs; light plates get soft shading blobs
  // (a glow on white would be invisible).
  const blobColors = baseIsDark
    ? [accentRgb, mix(accentRgb, endRgb, 0.5), mix(startRgb, WHITE, 0.4)]
    : [mix(accentRgb, BLACK, 0.25), mix(startRgb, BLACK, 0.3), mix(endRgb, BLACK, 0.2)];
  const blobAlpha = baseIsDark ? 0.22 : 0.16;

  ctx.globalCompositeOperation = baseIsDark ? 'screen' : 'multiply';
  const maxDim = Math.max(w, h);
  BLOBS.forEach((blob, i) => {
    const cx = blob.x * w;
    const cy = blob.y * h;
    const radius = blob.radius * maxDim;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    g.addColorStop(0, rgba(blobColors[i % blobColors.length], blobAlpha));
    g.addColorStop(1, rgba(blobColors[i % blobColors.length], 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  // 3. Gentle vignette — gives camera moves an edge to travel past.
  ctx.globalCompositeOperation = baseIsDark ? 'source-over' : 'multiply';
  const vignette = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.45,
    w / 2,
    h / 2,
    maxDim * 0.85
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, baseIsDark ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.10)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = 'source-over';

  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

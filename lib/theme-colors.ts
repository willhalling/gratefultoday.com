/**
 * Theme colour accessibility utilities.
 *
 * Every colour that goes into a CustomThemeConfig — whether from the AI
 * generator or a manual colour picker — should pass through
 * `ensureReadableThemeColors` before it reaches the renderer. This keeps
 * lyrics, titles and visualizers legible against any background the user or
 * the LLM chooses.
 */

import type { CustomThemeConfig } from '@/constants/themes';

const HEX_RE = /^#?([0-9a-fA-F]{6})$/;

export interface ContrastOptions {
  /** Minimum ratio for body/title text (WCAG AA normal text = 4.5). */
  textMinRatio?: number;
  /** Minimum ratio for accents/visualizers (WCAG AA large text/UI = 3.0). */
  accentMinRatio?: number;
}

const DEFAULT_OPTIONS: Required<ContrastOptions> = {
  textMinRatio: 4.5,
  accentMinRatio: 3.0,
};

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): Rgb | null {
  const m = HEX_RE.exec(hex.trim());
  if (!m) return null;
  const raw = m[1];
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function ensureHex(hex: string, fallback = '#000000'): string {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHex(rgb) : fallback;
}

/** Convert an sRGB channel value to linear light. */
function toLinear(channel: number): number {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of an sRGB colour. */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return (
    0.2126 * toLinear(rgb.r) +
    0.7152 * toLinear(rgb.g) +
    0.0722 * toLinear(rgb.b)
  );
}

/** WCAG contrast ratio between two sRGB colours. */
export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Perceived brightness (slower than luminance but matches human "lightness"). */
function brightness(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return Math.sqrt(
    rgb.r * rgb.r * 0.299 + rgb.g * rgb.g * 0.587 + rgb.b * rgb.b * 0.114
  );
}

function isLight(hex: string): boolean {
  return relativeLuminance(hex) > 0.179;
}

/** Mix two colours by ratio (0 = first colour, 1 = second colour). */
function mix(a: string, b: string, ratio: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  if (!ca || !cb) return a;
  return rgbToHex({
    r: ca.r + (cb.r - ca.r) * ratio,
    g: ca.g + (cb.g - ca.g) * ratio,
    b: ca.b + (cb.b - ca.b) * ratio,
  });
}

/** Lighten or darken a colour by an HSL-lightness amount (positive = lighter). */
function adjustLightness(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  const newL = Math.max(0, Math.min(1, l + amount));
  return hslToHex(h, s, newL);
}

function hslToHex(h: number, s: number, l: number): string {
  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return rgbToHex({ r: r * 255, g: g * 255, b: b * 255 });
}

/**
 * Pick a colour that satisfies `minRatio` against `background` while staying
 * as close as possible to the requested colour. If `preferred` is already
 * good enough it is returned unchanged.
 */
export function ensureContrast(
  background: string,
  preferred: string,
  minRatio: number
): string {
  const bg = ensureHex(background);
  const candidate = ensureHex(preferred, bg);

  if (contrastRatio(bg, candidate) >= minRatio) {
    return candidate;
  }

  // First try shifting the candidate toward white or black until it passes.
  const bgLight = isLight(bg);
  const target = bgLight ? '#000000' : '#ffffff';

  // Bisect between the original colour and the high-contrast target.
  let low = 0;
  let high = 1;
  for (let i = 0; i < 12; i++) {
    const mid = (low + high) / 2;
    const mixed = mix(candidate, target, mid);
    if (contrastRatio(bg, mixed) >= minRatio) {
      high = mid;
    } else {
      low = mid;
    }
  }

  const final = mix(candidate, target, high);
  if (contrastRatio(bg, final) >= minRatio) {
    return final;
  }

  // Fallback: pure white or black whichever is stronger.
  return pickBestContrast(bg, ['#ffffff', '#000000']);
}

/** Choose the candidate with the highest contrast ratio against the background. */
export function pickBestContrast(
  background: string,
  candidates: (string | null | undefined)[]
): string {
  const bg = ensureHex(background);
  let best = candidates[0];
  let bestScore = best ? contrastRatio(bg, best) : 0;
  for (let i = 1; i < candidates.length; i++) {
    const c = candidates[i];
    if (!c) continue;
    const score = contrastRatio(bg, c);
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return ensureHex(best ?? '#ffffff');
}

export interface BackgroundPalette {
  background: string;
  blob1: string;
  blob2: string;
}

/**
 * Return the single dominant background colour to compare foreground colours
 * against. For gradients we use the darker stop because that is usually where
 * text has the hardest time. For image/video backgrounds we use the supplied
 * palette (from the generated image or artwork) so colours are checked against
 * the real backdrop, not an assumed black scrim.
 */
function effectiveBackgroundColor(
  config: CustomThemeConfig,
  palette?: BackgroundPalette | null
): string {
  if (config.backgroundType === 'gradient' && config.backgroundColorEnd) {
    const start = ensureHex(config.backgroundColor, '#18181b');
    const end = ensureHex(config.backgroundColorEnd, start);
    // Choose the stop with lower luminance (darker) as the conservative base.
    return relativeLuminance(start) <= relativeLuminance(end) ? start : end;
  }

  if (config.backgroundType === 'image' || config.backgroundType === 'video') {
    if (palette?.background) return ensureHex(palette.background, '#000000');
    if (config.backgroundColor) return ensureHex(config.backgroundColor, '#000000');
    // Fallback: assume a dark scrim is applied by the renderer.
    return '#000000';
  }

  return ensureHex(config.backgroundColor, '#18181b');
}

/** True if the background is perceptually light. */
export function isThemeBackgroundLight(
  config: CustomThemeConfig,
  palette?: BackgroundPalette | null
): boolean {
  return isLight(effectiveBackgroundColor(config, palette));
}

/** Shadow/glow that contrasts with the text colour so it reads on any backdrop. */
function deriveTextShadow(textColor: string): string {
  return isLight(textColor)
    ? '0 1px 3px rgba(0,0,0,0.75), 0 0 18px rgba(0,0,0,0.45)'
    : '0 1px 3px rgba(255,255,255,0.75), 0 0 18px rgba(255,255,255,0.35)';
}

/** Header backdrop that contrasts with the text colour. */
function deriveLyricsBackdrop(textColor: string): string {
  return isLight(textColor)
    ? 'rgba(0,0,0,0.55)'
    : 'rgba(255,255,255,0.55)';
}

/**
 * Return a copy of `config` with `textColor` and `accentColor` adjusted so they
 * always meet readable contrast against the effective background.
 *
 * The function never invents new hues: it nudges the existing colours toward
 * white or black until the ratios pass, preserving the theme's identity.
 */
export function ensureReadableThemeColors(
  config: CustomThemeConfig,
  options: ContrastOptions & { backgroundPalette?: BackgroundPalette | null } = {}
): CustomThemeConfig {
  const { textMinRatio, accentMinRatio, backgroundPalette } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };
  const bg = effectiveBackgroundColor(config, backgroundPalette);

  const textColor = ensureContrast(bg, config.textColor, textMinRatio);
  const accentColor = ensureContrast(bg, config.accentColor, accentMinRatio);

  return {
    ...config,
    textColor,
    accentColor,
  };
}

/**
 * Full contrast pass: corrects text/accent colours, sets `lightBackground`,
 * and derives a matching text shadow and lyrics backdrop. Use this whenever a
 * CustomThemeConfig is finalised (AI generation, manual save, background image
 * selection).
 */
export function normaliseCustomThemeConfig(
  config: CustomThemeConfig,
  options: ContrastOptions & { backgroundPalette?: BackgroundPalette | null } = {}
): CustomThemeConfig {
  const corrected = ensureReadableThemeColors(config, options);
  const bgIsLight = isThemeBackgroundLight(config, options.backgroundPalette);
  const textShadow = deriveTextShadow(corrected.textColor);
  const lyricsBackdrop = deriveLyricsBackdrop(corrected.textColor);

  return {
    ...corrected,
    lightBackground: bgIsLight,
    textShadow,
    lyricsBackdrop,
  };
}

/**
 * Convenience: true if the theme already passes contrast requirements.
 * Useful for UI warnings or deciding whether to show a correction indicator.
 */
export function isThemeReadable(
  config: CustomThemeConfig,
  options: ContrastOptions & { backgroundPalette?: BackgroundPalette | null } = {}
): boolean {
  const { textMinRatio, accentMinRatio, backgroundPalette } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };
  const bg = effectiveBackgroundColor(config, backgroundPalette);
  return (
    contrastRatio(bg, config.textColor) >= textMinRatio &&
    contrastRatio(bg, config.accentColor) >= accentMinRatio
  );
}

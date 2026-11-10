/**
 * WCAG contrast safety net for the per-clip hook card.
 *
 * Theme presets pair an `accentColor` (the hook pill background) with a
 * `textColor` that's been hand-tuned for that theme — but the user can
 * also pick *any* theme, and some accent / text pairs (e.g. light accent
 * + light text on the "wavecanvas" preset) fall under AA. We never want
 * the hook to be unreadable.
 *
 * Public API: `ensureReadableTextColor(bgColor, preferredTextColor)` —
 * returns the preferred colour when it already clears 4.5:1, otherwise
 * swaps to whichever of pure black / pure white wins the contrast race
 * and adds a soft counter-colour textShadow for an extra readability
 * boost on busy silhouettes.
 */

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): Rgb | null {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff };
}

function parseColor(input: string): Rgb | null {
  if (!input) return null;
  const s = input.trim();
  if (s.startsWith('#')) return hexToRgb(s);
  const m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (!m) return null;
  const parts = m[1].split(',').map((p) => parseFloat(p.trim()));
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  return { r: parts[0], g: parts[1], b: parts[2] };
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const conv = (channel: number) => {
    const cs = channel / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * conv(r) + 0.7152 * conv(g) + 0.0722 * conv(b);
}

/** WCAG 2.1 contrast ratio — always returns a value >= 1. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Returns a `{ textColor, textShadow }` pair guaranteed to clear AA-large
 * (3:1) at minimum and AA-normal (4.5:1) when possible against `bgColor`.
 * Falls back to the preferred colour if either input fails to parse so
 * we never accidentally clobber a valid theme choice.
 */
export function ensureReadableTextColor(
  bgColor: string,
  preferredTextColor: string,
  options: { minRatio?: number; preferredShadow?: string } = {},
): { textColor: string; textShadow?: string } {
  const { minRatio = 4.5, preferredShadow } = options;
  const bg = parseColor(bgColor);
  const preferred = parseColor(preferredTextColor);
  if (!bg) {
    return { textColor: preferredTextColor, textShadow: preferredShadow };
  }
  if (preferred && contrastRatio(bg, preferred) >= minRatio) {
    return { textColor: preferredTextColor, textShadow: preferredShadow };
  }

  // Preferred colour fails AA — pick the higher-contrast of black/white
  // and add a soft counter-colour shadow so the text still reads when
  // the silhouette behind the pill is busy.
  const white: Rgb = { r: 255, g: 255, b: 255 };
  const black: Rgb = { r: 0, g: 0, b: 0 };
  const useWhite = contrastRatio(bg, white) >= contrastRatio(bg, black);
  return {
    textColor: useWhite ? '#ffffff' : '#000000',
    textShadow: useWhite
      ? '0 1px 3px rgba(0, 0, 0, 0.55)'
      : '0 1px 3px rgba(255, 255, 255, 0.55)',
  };
}

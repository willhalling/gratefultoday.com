// Google Fonts configuration for themes
// (was sourced via @remotion/google-fonts before the Remotion removal)

export const THEME_FONTS = {
  minimalist: {
    name: 'Inter',
    weights: ['400', '500', '600', '700'],
  },
  energetic: {
    name: 'Poppins',
    weights: ['400', '500', '600', '700', '800'],
  },
  cinematic: {
    name: 'Playfair Display',
    weights: ['400', '500', '600', '700'],
  },
  retro: {
    name: 'Orbitron',
    weights: ['400', '500', '600', '700', '800', '900'],
  },
  corporate: {
    name: 'Roboto',
    weights: ['300', '400', '500', '700'],
  },
  organic: {
    name: 'Nunito',
    weights: ['400', '600', '700'],
  },
  glitch: {
    name: 'Rajdhani',
    weights: ['500', '600', '700'],
  },
  sketchy: {
    name: 'Patrick Hand',
    weights: ['400'],
  },
  data: {
    name: 'IBM Plex Mono',
    weights: ['400', '500', '600', '700'],
  },
  lofi: {
    name: 'Quicksand',
    weights: ['400', '500', '600', '700'],
  },
  // ── Extra fonts — great for lyrics / custom themes ────────────────────────
  bold: {
    name: 'Poppins',
    weights: ['400', '500', '600', '700', '800', '900'],
  },
  impact: {
    name: 'Bebas Neue',
    weights: ['400'],
  },
  condensed: {
    name: 'Oswald',
    weights: ['300', '400', '500', '600', '700'],
  },
  elegant: {
    name: 'Raleway',
    weights: ['300', '400', '500', '600', '700', '800'],
  },
  romantic: {
    name: 'Dancing Script',
    weights: ['400', '500', '600', '700'],
  },
  modern: {
    name: 'Space Grotesk',
    weights: ['300', '400', '500', '600', '700'],
  },
  // ── Synth lyric fonts — the Font Cycle pool (lib/renderer/lyrics/synth.ts) ─
  serif: {
    name: 'Instrument Serif',
    weights: ['400'],
  },
  narrow: {
    name: 'Archivo Narrow',
    weights: ['500'],
  },
  statement: {
    name: 'Staatliches',
    weights: ['400'],
  },
  pixel: {
    name: 'Pixelify Sans',
    weights: ['500'],
  },
  thick: {
    name: 'Anton',
    weights: ['400'],
  },
  script: {
    name: 'Italianno',
    weights: ['400'],
  },
  public: {
    name: 'Public Sans',
    weights: ['800'],
  },
} as const;

export type ThemeFontKey = keyof typeof THEME_FONTS;

/** Human-readable label shown in the custom theme font picker */
export const FONT_LABELS: Record<ThemeFontKey, string> = {
  minimalist: 'Inter',
  energetic: 'Poppins',
  cinematic: 'Playfair Display',
  retro: 'Orbitron',
  corporate: 'Roboto',
  organic: 'Nunito',
  glitch: 'Rajdhani',
  sketchy: 'Patrick Hand',
  data: 'IBM Plex Mono',
  lofi: 'Quicksand',
  bold: 'Poppins',
  impact: 'Bebas Neue',
  condensed: 'Oswald',
  elegant: 'Raleway',
  romantic: 'Dancing Script',
  modern: 'Space Grotesk',
  serif: 'Instrument Serif',
  narrow: 'Archivo Narrow',
  statement: 'Staatliches',
  pixel: 'Pixelify Sans',
  thick: 'Anton',
  script: 'Italianno',
  public: 'Public Sans',
};

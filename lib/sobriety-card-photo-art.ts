/**
 * lib/sobriety-card-photo-art.ts — photographic card fronts: a full-bleed
 * Unsplash/Pexels photo, a soft scrim where the text sits, and three lines
 * of lettering (kicker / headline / footer) in one of several type styles.
 *
 * Pure (no DOM) so one layout feeds the DOM card, the Canvas2D export and
 * the next/og images. Text widths come from real glyph advances
 * (json/sobriety-card-font-metrics.json, extracted from the TTFs), so the
 * three renderers break and size lines identically.
 */
import fontMetrics from '@/json/sobriety-card-font-metrics.json';
import photosData from '@/json/sobriety-card-photos.json';

// ─── Photos ─────────────────────────────────────────────────────────────────

export type PhotoMood =
  // The Grateful Today set: foggy, monochrome, quiet.
  | 'figure'
  | 'snow'
  | 'together'
  | 'bench'
  | 'path'
  | 'water'
  | 'tree'
  | 'window'
  | 'still'
  | 'hands'
  | 'birds'
  // Retired set (kept so cards already sent still render).
  | 'calm'
  | 'growth'
  | 'light'
  | 'journey'
  | 'dawn'
  | 'celebrate'
  | 'cosy'
  | 'hope'
  | 'strength'
  | 'floral'
  | 'gift';

export interface CardPhoto {
  id: string;
  source: 'unsplash' | 'pexels';
  src: string;
  page: string;
  photographer: string;
  alt: string;
  mood: PhotoMood;
  /** Calmest band of the 5:7 crop (measured), where the text goes. */
  textPlacement: 'top' | 'center' | 'bottom';
  /** Text colour that reads on that band: light text or dark text. */
  textTone: 'light' | 'dark';
  /** Off-tone photo from the earlier set: still resolves for cards already sent, never offered. */
  retired?: boolean;
}

export const CARD_PHOTOS = photosData as CardPhoto[];

/** The photos the picker offers (the retired set is hidden). */
export const ACTIVE_CARD_PHOTOS = CARD_PHOTOS.filter((photo) => !photo.retired);

export function getCardPhoto(id: string | undefined): CardPhoto {
  return CARD_PHOTOS.find((photo) => photo.id === id) ?? CARD_PHOTOS[0];
}

/** Sized, cropped CDN URL for a photo. */
export function cardPhotoUrl(photo: CardPhoto, width: number, height: number): string {
  const w = Math.round(width);
  const h = Math.round(height);
  return photo.source === 'unsplash'
    ? `${photo.src}?auto=format&fit=crop&w=${w}&h=${h}&q=80`
    : `${photo.src}?auto=compress&cs=tinysrgb&fit=crop&w=${w}&h=${h}`;
}

export function cardPhotoCredit(photo: CardPhoto): string {
  return `Photo by ${photo.photographer} on ${photo.source === 'unsplash' ? 'Unsplash' : 'Pexels'}`;
}

// ─── Fonts + type styles ────────────────────────────────────────────────────

export type PhotoFontKey = keyof typeof fontMetrics;

export const PHOTO_FONTS: Record<PhotoFontKey, { family: string; weight: string; woff2: string; ttf: string }> = {
  'dancing-script-700': { family: 'GT Card Dancing Script', weight: '700', woff2: '/fonts/dancing-script-700.woff2', ttf: 'public/fonts/ttf/dancing-script-700.ttf' },
  'playfair-display-700': { family: 'GT Card Playfair', weight: '700', woff2: '/fonts/playfair-display-700.woff2', ttf: 'public/fonts/ttf/playfair-display-700.ttf' },
  'bebas-neue-400': { family: 'GT Card Bebas', weight: '400', woff2: '/fonts/bebas-neue-400.woff2', ttf: 'public/fonts/ttf/bebas-neue-400.ttf' },
  'ibm-plex-mono-700': { family: 'GT Card Plex Mono', weight: '700', woff2: '/fonts/ibm-plex-mono-700.woff2', ttf: 'public/fonts/ttf/ibm-plex-mono-700.ttf' },
  'quicksand-700': { family: 'GT Card Quicksand', weight: '700', woff2: '/fonts/quicksand-700.woff2', ttf: 'public/fonts/ttf/quicksand-700.ttf' },
  'oswald-700': { family: 'GT Card Oswald', weight: '700', woff2: '/fonts/oswald-700.woff2', ttf: 'public/fonts/ttf/oswald-700.ttf' },
  'patrick-hand-400': { family: 'GT Card Patrick Hand', weight: '400', woff2: '/fonts/patrick-hand-400.woff2', ttf: 'public/fonts/ttf/patrick-hand-400.ttf' },
  'montserrat-700': { family: 'GT Card Montserrat', weight: '700', woff2: '/fonts/montserrat-700.woff2', ttf: 'public/fonts/ttf/montserrat-700.ttf' },
  'raleway-700': { family: 'GT Card Raleway', weight: '700', woff2: '/fonts/raleway-700.woff2', ttf: 'public/fonts/ttf/raleway-700.ttf' },
};

interface TextRole {
  font: PhotoFontKey;
  /** Max font size as a fraction of the card width. */
  size: number;
  textCase: 'upper' | 'lower' | 'none';
  /** Letter spacing in em. */
  tracking: number;
  lineHeight: number;
}

export type TypeStyleId =
  | 'script'
  | 'serif'
  | 'poster'
  | 'typewriter'
  | 'rounded'
  | 'condensed'
  | 'handwritten'
  | 'modern';

export interface TypeStyle {
  id: TypeStyleId;
  label: string;
  kicker: TextRole;
  headline: TextRole;
  footer: TextRole;
  /** 'paper' = white label behind the text; 'frame' = thin outline box. */
  box: 'none' | 'paper' | 'frame';
  maxHeadlineLines: number;
}

const role = (font: PhotoFontKey, size: number, textCase: TextRole['textCase'], tracking: number, lineHeight: number): TextRole => ({
  font,
  size,
  textCase,
  tracking,
  lineHeight,
});

export const TYPE_STYLES: Record<TypeStyleId, TypeStyle> = {
  script: {
    id: 'script',
    label: 'Script',
    kicker: role('raleway-700', 0.043, 'upper', 0.28, 1.3),
    headline: role('dancing-script-700', 0.16, 'none', 0, 1.02),
    footer: role('raleway-700', 0.04, 'upper', 0.2, 1.3),
    box: 'none',
    maxHeadlineLines: 3,
  },
  serif: {
    id: 'serif',
    label: 'Classic serif',
    kicker: role('raleway-700', 0.04, 'upper', 0.32, 1.3),
    headline: role('playfair-display-700', 0.12, 'none', 0, 1.06),
    footer: role('raleway-700', 0.043, 'none', 0.02, 1.3),
    box: 'none',
    maxHeadlineLines: 3,
  },
  poster: {
    id: 'poster',
    label: 'Poster',
    kicker: role('oswald-700', 0.062, 'upper', 0.14, 1.15),
    headline: role('bebas-neue-400', 0.24, 'upper', 0.01, 0.92),
    footer: role('oswald-700', 0.043, 'upper', 0.16, 1.3),
    box: 'none',
    maxHeadlineLines: 3,
  },
  typewriter: {
    id: 'typewriter',
    label: 'Typewriter',
    kicker: role('ibm-plex-mono-700', 0.04, 'upper', 0.12, 1.4),
    headline: role('ibm-plex-mono-700', 0.078, 'none', 0, 1.25),
    footer: role('ibm-plex-mono-700', 0.04, 'none', 0, 1.4),
    box: 'paper',
    maxHeadlineLines: 4,
  },
  rounded: {
    id: 'rounded',
    label: 'Friendly',
    kicker: role('quicksand-700', 0.048, 'upper', 0.22, 1.3),
    headline: role('quicksand-700', 0.12, 'lower', -0.01, 1.02),
    footer: role('quicksand-700', 0.05, 'lower', 0, 1.3),
    box: 'none',
    maxHeadlineLines: 3,
  },
  condensed: {
    id: 'condensed',
    label: 'Bold condensed',
    kicker: role('oswald-700', 0.045, 'upper', 0.3, 1.3),
    headline: role('oswald-700', 0.14, 'upper', 0.01, 1.02),
    footer: role('raleway-700', 0.043, 'none', 0.02, 1.3),
    box: 'none',
    maxHeadlineLines: 3,
  },
  handwritten: {
    id: 'handwritten',
    label: 'Handwritten',
    kicker: role('patrick-hand-400', 0.062, 'none', 0.02, 1.2),
    headline: role('patrick-hand-400', 0.15, 'none', 0, 1.0),
    footer: role('patrick-hand-400', 0.065, 'none', 0.01, 1.2),
    box: 'none',
    maxHeadlineLines: 3,
  },
  modern: {
    id: 'modern',
    label: 'Modern frame',
    kicker: role('montserrat-700', 0.037, 'upper', 0.32, 1.4),
    headline: role('montserrat-700', 0.088, 'upper', 0.04, 1.12),
    footer: role('raleway-700', 0.037, 'upper', 0.24, 1.4),
    box: 'frame',
    maxHeadlineLines: 4,
  },
};

export const TYPE_STYLE_IDS = Object.keys(TYPE_STYLES) as TypeStyleId[];

// ─── Measuring + layout ─────────────────────────────────────────────────────

function applyCase(text: string, textCase: TextRole['textCase']): string {
  if (textCase === 'upper') return text.toUpperCase();
  if (textCase === 'lower') return text.toLowerCase();
  return text;
}

/** Width of `text` in em for a font (glyph advances + tracking). */
export function measureEm(text: string, font: PhotoFontKey, tracking: number): number {
  const metrics = fontMetrics[font];
  const adv = metrics.adv as Record<string, number>;
  const fallback = adv.n ?? 0.55;
  let width = 0;
  for (const char of text) width += adv[char] ?? fallback;
  return width + tracking * Math.max(0, Array.from(text).length - 1);
}

export interface PhotoTextLine {
  text: string;
  role: 'kicker' | 'headline' | 'footer';
  font: PhotoFontKey;
  fontSize: number;
  /** Letter spacing in px. */
  tracking: number;
  /** Line box height in px (fontSize × lineHeight). */
  lineBox: number;
  /** Centre x and top of the line box, px. */
  cx: number;
  top: number;
  /** Baseline y for canvas (CSS-equivalent half-leading placement). */
  baseline: number;
}

export interface PhotoTextLayout {
  lines: PhotoTextLine[];
  /** Bounding box of the text block (for the paper / frame), px. */
  block: { x: number; y: number; width: number; height: number };
  /** Vertical centre the scrim should favour, 0–1. */
  focusY: number;
}

export interface PhotoTextInput {
  kicker: string;
  headline: string;
  footer: string;
}

/** Every way to break words into 1..maxLines lines. */
function lineSplits(words: string[], maxLines: number): string[][] {
  const gaps = words.length - 1;
  const results: string[][] = [];
  for (let mask = 0; mask < 1 << Math.max(0, gaps); mask++) {
    const lines: string[] = [];
    let current = words[0] ?? '';
    for (let i = 1; i < words.length; i++) {
      if (mask & (1 << (i - 1))) {
        lines.push(current);
        current = words[i];
      } else {
        current = `${current} ${words[i]}`;
      }
    }
    lines.push(current);
    if (lines.length <= maxLines) results.push(lines);
  }
  return results;
}

/**
 * Lay out kicker / headline / footer for a card of (width, height).
 * placement 'center' is used for landscape OG frames.
 */
export function layoutPhotoText(
  input: PhotoTextInput,
  style: TypeStyle,
  width: number,
  height: number,
  placement: CardPhoto['textPlacement'],
): PhotoTextLayout {
  const unit = Math.min(width, height * 1.2);
  const boxed = style.box !== 'none';
  const maxWidth = unit * (boxed ? 0.7 : 0.84);

  // Headline: choose the break that gives the biggest type, mildly
  // preferring fewer lines.
  const headlineText = applyCase(input.headline.trim(), style.headline.textCase);
  const words = headlineText.split(/\s+/).filter(Boolean);
  const maxHeadlineSize = style.headline.size * unit;
  let headlineLines: string[] = [headlineText];
  let headlineSize = 0;
  let bestScore = -Infinity;
  for (const lines of words.length ? lineSplits(words, style.maxHeadlineLines) : [[]]) {
    const widest = Math.max(0.01, ...lines.map((line) => measureEm(line, style.headline.font, style.headline.tracking)));
    const size = Math.min(maxHeadlineSize, maxWidth / widest);
    const lengths = lines.map((line) => line.length);
    const ragged = lengths.length > 1 ? (Math.max(...lengths) - Math.min(...lengths)) / Math.max(...lengths) : 0;
    const score = size * (1 - 0.1 * (lines.length - 1)) * (1 - 0.15 * ragged);
    if (score > bestScore) {
      bestScore = score;
      headlineLines = lines;
      headlineSize = size;
    }
  }

  const single = (text: string, r: TextRole) => {
    const value = applyCase(text.trim(), r.textCase);
    const size = Math.min(r.size * unit, maxWidth / Math.max(0.01, measureEm(value, r.font, r.tracking)));
    return { value, size };
  };
  const kicker = input.kicker.trim() ? single(input.kicker, style.kicker) : null;
  const footer = input.footer.trim() ? single(input.footer, style.footer) : null;

  type Pending = { text: string; role: PhotoTextLine['role']; r: TextRole; size: number; gapBefore: number };
  const pending: Pending[] = [];
  if (kicker) pending.push({ text: kicker.value, role: 'kicker', r: style.kicker, size: kicker.size, gapBefore: 0 });
  headlineLines.forEach((line, i) =>
    pending.push({
      text: line,
      role: 'headline',
      r: style.headline,
      size: headlineSize,
      gapBefore: i === 0 && kicker ? kicker.size * 0.5 : 0,
    }),
  );
  if (footer) pending.push({ text: footer.value, role: 'footer', r: style.footer, size: footer.size, gapBefore: headlineSize * 0.28 });

  const totalHeight = pending.reduce((sum, p) => sum + p.gapBefore + p.size * p.r.lineHeight, 0);
  const padY = boxed ? unit * 0.07 : 0;
  const margin = height * 0.075;
  const anchor = placement === 'top' ? 0.27 : placement === 'bottom' ? 0.73 : 0.5;
  let top = height * anchor - totalHeight / 2;
  top = Math.max(margin + padY, Math.min(height - margin - padY - totalHeight, top));

  const cx = width / 2;
  const lines: PhotoTextLine[] = [];
  let cursor = top;
  let blockWidth = 0;
  for (const p of pending) {
    cursor += p.gapBefore;
    const lineBox = p.size * p.r.lineHeight;
    const metrics = fontMetrics[p.r.font];
    const contentHeight = (metrics.ascent - metrics.descent) * p.size;
    lines.push({
      text: p.text,
      role: p.role,
      font: p.r.font,
      fontSize: p.size,
      tracking: p.r.tracking * p.size,
      lineBox,
      cx,
      top: cursor,
      baseline: cursor + (lineBox - contentHeight) / 2 + metrics.ascent * p.size,
    });
    blockWidth = Math.max(blockWidth, measureEm(p.text, p.r.font, p.r.tracking) * p.size);
    cursor += lineBox;
  }

  const padX = boxed ? unit * 0.075 : 0;
  const block = {
    x: cx - blockWidth / 2 - padX,
    y: top - padY,
    width: blockWidth + padX * 2,
    height: totalHeight + padY * 2,
  };
  return { lines, block, focusY: (top + totalHeight / 2) / height };
}

// ─── Colours + scrim ────────────────────────────────────────────────────────

export interface PhotoInk {
  text: string;
  /** Soft shadow for legibility (CSS colour). */
  shadow: string;
}

export function photoInk(style: TypeStyle, photo: CardPhoto): PhotoInk {
  if (style.box === 'paper') return { text: '#1C1917', shadow: 'transparent' };
  return photo.textTone === 'light'
    ? { text: '#FFFFFF', shadow: 'rgba(0,0,0,0.35)' }
    : { text: '#1C1917', shadow: 'rgba(255,255,255,0.45)' };
}

/** Gradient stops (offset 0–1 down the card, CSS colour) behind the text. */
export function photoScrimStops(photo: CardPhoto, focusY: number): Array<[number, string]> {
  const rgb = photo.textTone === 'light' ? '0,0,0' : '255,255,255';
  const strength = photo.textTone === 'light' ? 0.5 : 0.55;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const c = (alpha: number) => `rgba(${rgb},${alpha.toFixed(3)})`;
  if (focusY < 0.4) {
    // Text near the top: darken from the top edge down past the text.
    return [[0, c(strength)], [clamp(focusY), c(strength * 0.85)], [clamp(focusY + 0.3), c(0)], [1, c(0)]];
  }
  if (focusY > 0.6) {
    return [[0, c(0)], [clamp(focusY - 0.3), c(0)], [clamp(focusY), c(strength * 0.85)], [1, c(strength)]];
  }
  return [[0, c(0)], [clamp(focusY - 0.3), c(0)], [focusY, c(strength)], [clamp(focusY + 0.3), c(0)], [1, c(0)]];
}

export function photoScrimCss(photo: CardPhoto, focusY: number): string {
  return `linear-gradient(180deg, ${photoScrimStops(photo, focusY)
    .map(([offset, color]) => `${color} ${(offset * 100).toFixed(1)}%`)
    .join(', ')})`;
}

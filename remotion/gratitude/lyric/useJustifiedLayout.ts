/**
 * Computes a simple 1-or-2 line layout for short lyric phrases.
 *
 * Words (≤2) → single line. More words → split at midpoint.
 * Font size is either supplied directly via `opts.fontSize`, or computed so
 * the longest line fills LINE_MAX_W_FRAC of the given width.
 */

interface LayoutOptions {
  fontFamily: string;
  fontWeight: number;
  letterSpacingEm: number;
  lineHeightRatio: number;
  /** Override computed font size. */
  fontSize?: number;
}

export interface JustifiedLayout {
  subLines: string[][];
  lineFontSizes: number[];
  containerW: number;
  blockH: number;
  lineHeightRatio: number;
}

const LINE_MAX_W_FRAC = 0.78;
/** Average uppercase character width ≈ this fraction of fontSize. */
const CHAR_W_RATIO = 0.62;
/** Width of a word-gap in em. */
const WORD_GAP_EM = 0.3;
const MIN_FONT = 36;
const MAX_FONT = 260;

export function useJustifiedLayout(
  text: string,
  width: number,
  _height: number,
  opts: LayoutOptions,
): JustifiedLayout {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const { lineHeightRatio } = opts;
  const containerW = Math.round(width * LINE_MAX_W_FRAC);

  // Single line for ≤2 words; split at midpoint otherwise.
  const mid = Math.ceil(words.length / 2);
  const subLines: string[][] =
    words.length <= 2 ? [words] : [words.slice(0, mid), words.slice(mid)];

  let fontSize: number;
  if (opts.fontSize != null) {
    fontSize = opts.fontSize;
  } else {
    // Scale so the longest line fills containerW.
    const longestLine = subLines.reduce<string[]>(
      (a, b) => (a.join('').length >= b.join('').length ? a : b),
      [],
    );
    const charCount = longestLine.reduce(
      (sum, w) => sum + Array.from(w.toUpperCase()).length,
      0,
    );
    const spaceCount = longestLine.length - 1;
    const divisor = charCount * CHAR_W_RATIO + spaceCount * WORD_GAP_EM;
    fontSize =
      divisor > 0
        ? Math.min(Math.max(Math.floor(containerW / divisor), MIN_FONT), MAX_FONT)
        : MIN_FONT;
  }

  const lineFontSizes = subLines.map(() => fontSize);
  const blockH = Math.ceil(subLines.length * fontSize * lineHeightRatio);

  return { subLines, lineFontSizes, containerW, blockH, lineHeightRatio };
}

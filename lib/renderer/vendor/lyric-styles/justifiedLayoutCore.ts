export const JUSTIFIED_DEFAULT_FONT_FAMILY = 'Inter';

const CHAR_WIDTH: Record<string, number> = {
  A: 0.72, B: 0.66, C: 0.68, D: 0.74, E: 0.60, F: 0.56, G: 0.72, H: 0.74,
  I: 0.30, J: 0.42, K: 0.68, L: 0.56, M: 0.86, N: 0.74, O: 0.76, P: 0.62,
  Q: 0.76, R: 0.66, S: 0.60, T: 0.60, U: 0.72, V: 0.70, W: 0.92, X: 0.68,
  Y: 0.64, Z: 0.66,
  a: 0.58, b: 0.60, c: 0.54, d: 0.60, e: 0.56, f: 0.36, g: 0.60, h: 0.60,
  i: 0.26, j: 0.28, k: 0.56, l: 0.28, m: 0.88, n: 0.60, o: 0.60, p: 0.60,
  q: 0.60, r: 0.38, s: 0.50, t: 0.42, u: 0.60, v: 0.56, w: 0.80, x: 0.56,
  y: 0.56, z: 0.52,
  '0': 0.62, '1': 0.44, '2': 0.60, '3': 0.60, '4': 0.64,
  '5': 0.60, '6': 0.62, '7': 0.58, '8': 0.62, '9': 0.62,
  "'": 0.28, '\u2019': 0.28, '"': 0.44, '!': 0.34, '?': 0.58,
  ',': 0.30, '.': 0.30, '-': 0.42, ' ': 0.28,
};
const FALLBACK_WIDTH = 0.62;

export function estimateTextWidth(text: string, trackingEm = 0.04): number {
  const chars = Array.from(text);
  let total = 0;
  for (let i = 0; i < chars.length; i++) {
    total += CHAR_WIDTH[chars[i]] ?? FALLBACK_WIDTH;
    if (i < chars.length - 1) total += trackingEm;
  }
  return total;
}

let fillCanvas: HTMLCanvasElement | null = null;
function getCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!fillCanvas) {
    fillCanvas = document.createElement('canvas');
    fillCanvas.width = 1;
    fillCanvas.height = 1;
  }
  return fillCanvas.getContext('2d');
}

export function canvasFillFontSize(
  text: string,
  fontWeight: number,
  fontFamily: string,
  targetPx: number,
  letterSpacing = 0.04,
  minSize = 18,
  maxSize = 600,
): number {
  const PROBE = 200;
  const upper = text.toUpperCase();
  const ctx = getCtx();

  let totalAtProbe: number;
  if (ctx) {
    ctx.font = `${fontWeight} ${PROBE}px ${fontFamily}`;
    const measured = ctx.measureText(upper).width;
    const n = Array.from(upper).length;
    totalAtProbe = measured + letterSpacing * PROBE * Math.max(0, n - 1);
  } else {
    totalAtProbe = estimateTextWidth(upper, letterSpacing) * PROBE;
  }

  if (totalAtProbe <= 0) return minSize;
  return Math.min(maxSize, Math.max(minSize, Math.round(targetPx * PROBE / totalAtProbe)));
}

export interface JustifiedCoreOptions {
  containerW: number;
  maxBlockH: number;
  fontWeight?: number | ((wordCount: number) => number);
  letterSpacingEm?: number;
  fontFamily?: string;
  lineHeightRatio?: number;
  minFontSize?: number;
  maxFontSize?: number;
}

export interface JustifiedCoreLayout {
  lines: string[];
  lineFontSizes: number[];
  containerW: number;
  blockH: number;
  scaleFactor: number;
  fontFamily: string;
  letterSpacingEm: number;
  lineHeightRatio: number;
}

export function defaultJustifiedFontWeight(wordCount: number): number {
  return wordCount === 1 ? 900 : wordCount === 2 ? 800 : 700;
}

export function splitIntoWordGroups(words: string[], maxPerLine: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < words.length; i += maxPerLine) {
    out.push(words.slice(i, i + maxPerLine).join(' '));
  }
  return out;
}

export function buildJustifiedLayoutFromLines(
  lines: string[],
  options: JustifiedCoreOptions,
): JustifiedCoreLayout {
  const {
    containerW,
    maxBlockH,
    fontWeight = defaultJustifiedFontWeight,
    letterSpacingEm = 0.05,
    fontFamily = JUSTIFIED_DEFAULT_FONT_FAMILY,
    lineHeightRatio = 1.06,
    minFontSize = 18,
    maxFontSize = 1200,
  } = options;

  const safeLines = lines.filter(Boolean);
  const fwFn = typeof fontWeight === 'function' ? fontWeight : () => fontWeight as number;

  const rawLineFontSizes = safeLines.map((line) =>
    canvasFillFontSize(
      line,
      fwFn(line.trim().split(/\s+/).filter(Boolean).length),
      fontFamily,
      containerW,
      letterSpacingEm,
      minFontSize,
      maxFontSize,
    ),
  );

  const rawBlockH = rawLineFontSizes.reduce((sum, size) => sum + size * lineHeightRatio, 0);
  const scaleFactor = rawBlockH > maxBlockH ? maxBlockH / rawBlockH : 1;
  const lineFontSizes = rawLineFontSizes.map((size) => Math.round(size * scaleFactor));
  const blockH = lineFontSizes.reduce((sum, size) => sum + size * lineHeightRatio, 0);

  return {
    lines: safeLines,
    lineFontSizes,
    containerW,
    blockH,
    scaleFactor,
    fontFamily,
    letterSpacingEm,
    lineHeightRatio,
  };
}
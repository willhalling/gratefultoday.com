/**
 * lib/renderer/overlays/text.ts — CSS→Canvas2D text helpers shared by the
 * layout ports. The model that matched the DOM pixel-for-pixel in probes:
 *
 *   font string   — `<weight> <size>px <familyStack>` (CSS weight names map
 *                   to numbers: bold→700, 500→500, 600→600, normal→400).
 *   letterSpacing — `em` values convert to px (× fontSize), applied via
 *                   ctx.letterSpacing (Chrome ≥ 99).
 *   line box      — a div with fontSize F and line-height LH (or 'normal')
 *                   has its glyphs centred in an F·LH box; canvas
 *                   textBaseline='middle' at the box centre matches Chrome's
 *                   half-leading split. Unset line-height uses NORMAL_LINE_HEIGHT
 *                   (Chrome's computed ~1.2 for the theme font stacks).
 *   ellipsis      — CSS text-overflow:ellipsis truncates CHAR-wise with '…'
 *                   via binary search (same as the 1.3 lockup fitText).
 *   textShadow    — CSS `x y blur color` → ctx.shadow* (same Skia gaussian).
 */

export type FontWeight = number | 'normal' | 'bold' | 'bolder' | 'lighter';

export function weightNumber(weight: FontWeight | string | undefined): number {
  if (weight === undefined || weight === 'normal') return 400;
  if (weight === 'bold') return 700;
  if (weight === 'bolder') return 800;
  if (weight === 'lighter') return 300;
  if (typeof weight === 'number') return weight;
  const n = parseInt(weight, 10);
  return Number.isFinite(n) ? n : 400;
}

/** Chrome's computed line-height for `normal` on the theme font stacks. */
export const NORMAL_LINE_HEIGHT = 1.2;

export function fontString(weight: FontWeight | string, sizePx: number, family: string): string {
  return `${weightNumber(weight)} ${sizePx}px ${family}`;
}

/** Apply ctx.letterSpacing (Chrome ≥ 99) from an em or px CSS value. */
export function setLetterSpacingEm(
  ctx: CanvasRenderingContext2D,
  em: number | null,
  fontSize: number,
): void {
  const c = ctx as CanvasRenderingContext2D & { letterSpacing: string };
  c.letterSpacing = em === null || em === 0 ? '0px' : `${em * fontSize}px`;
}

export interface TextStyle {
  fontSize: number;
  weight?: FontWeight | string;
  family: string;
  color: string;
  opacity?: number;
  letterSpacingEm?: number;
  lineHeight?: number;
  textShadow?: string;
  textTransform?: 'uppercase' | 'none';
}

/** Parse a CSS text-shadow like `0 1px 8px rgba(0,0,0,0.8)` or
 * `0 2px 16px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,0.8)` (first shadow wins —
 * layered shadows are approximated). */
export function applyTextShadow(ctx: CanvasRenderingContext2D, shadow: string | undefined): void {
  if (!shadow) {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    return;
  }
  const first = shadow.split(/,(?![^()]*\))/)[0].trim();
  const m = /^(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px\s+(.+)$/.exec(first);
  if (m) {
    ctx.shadowOffsetX = parseFloat(m[1]);
    ctx.shadowOffsetY = parseFloat(m[2]);
    ctx.shadowBlur = parseFloat(m[3]);
    ctx.shadowColor = m[4].trim();
  }
}

/** CSS text-overflow:ellipsis — truncate char-wise with '…' to fit maxWidth. */
export function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = '…';
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(text.slice(0, mid) + ellipsis).width <= maxWidth) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return text.slice(0, Math.max(0, lo)) + ellipsis;
}

export interface DrawTextOpts {
  /** Left edge (align left), centre x (align center) or right edge (align right). */
  x?: number;
  /** Top of the line box (fontSize × lineHeight). Ignored when y is 'middle'. */
  top?: number;
  /** Pre-computed vertical centre of the line box (overrides top). */
  middle?: number;
  align?: CanvasTextAlign;
  maxWidth?: number;
}

/**
 * Draw one line of text exactly where the CSS equivalent sits: the glyphs are
 * centred in a line box of fontSize × lineHeight (default NORMAL_LINE_HEIGHT).
 */
export function drawTextLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  style: TextStyle,
  opts: DrawTextOpts = {},
): void {
  const {
    fontSize,
    weight = 400,
    family,
    color,
    opacity = 1,
    letterSpacingEm = 0,
    lineHeight = NORMAL_LINE_HEIGHT,
    textShadow,
    textTransform,
  } = style;
  const { x, top, middle, align = 'left', maxWidth } = opts;

  const content = textTransform === 'uppercase' ? text.toUpperCase() : text;

  ctx.save();
  ctx.font = fontString(weight, fontSize, family);
  setLetterSpacingEm(ctx, letterSpacingEm, fontSize);
  const finalText = maxWidth !== undefined ? ellipsize(ctx, content, maxWidth) : content;

  applyTextShadow(ctx, textShadow);
  ctx.fillStyle = color;
  ctx.globalAlpha *= opacity;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const y = middle ?? (top ?? 0) + (fontSize * lineHeight) / 2;
  ctx.fillText(finalText, x ?? 0, y);
  ctx.restore();
}

/** Measured width of a string in a style (for layout math). */
export function measureLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  style: Pick<TextStyle, 'fontSize' | 'weight' | 'family' | 'letterSpacingEm' | 'textTransform'>,
): number {
  ctx.save();
  ctx.font = fontString(style.weight ?? 400, style.fontSize, style.family);
  setLetterSpacingEm(ctx, style.letterSpacingEm ?? 0, style.fontSize);
  const w = ctx.measureText(
    style.textTransform === 'uppercase' ? text.toUpperCase() : text,
  ).width;
  ctx.restore();
  return w;
}

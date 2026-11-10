/**
 * lib/renderer/overlays/text-wrap.ts — designer-aware word wrapping, copied
 * verbatim from roughclip lib/renderer/overlays/text-wrap.ts (itself copied
 * from a Remotion hook texture rasteriser) so the Canvas2D ports wrap text
 * exactly the way the DOM/shader rasterisers did.
 */

/** Split on whitespace EXCEPT non-breaking space — nbsp-joined runs (the
 * caller's widow protection) must survive as single tokens. `\s` alone would
 * match `\u00A0` and silently destroy the joins. */
export const splitWrapWords = (text: string): string[] =>
  text.split(/[^\S\u00A0]+/).filter(Boolean);

/**
 * preventWidows — never let a single word strand on the final line. When the
 * greedy wrap orphans one, pull the previous line's last word down so the
 * closing line reads as a pair and the two lines feel balanced.
 */
export function preventWidows(lines: string[]): string[] {
  if (lines.length < 2) return lines;
  const last = lines[lines.length - 1];
  if (splitWrapWords(last).length > 1) return lines;
  const prevWords = splitWrapWords(lines[lines.length - 2]);
  if (prevWords.length < 2) return lines;
  const moved = prevWords[prevWords.length - 1];
  lines[lines.length - 2] = prevWords.slice(0, -1).join(' ');
  lines[lines.length - 1] = `${moved}\u00A0${last}`;
  return lines;
}

/**
 * balanceWrap — designer-aware word wrap. Instead of a greedy line-by-line
 * fill that often leaves the final line much shorter, this DP minimises the
 * variance in line widths so each line feels intentional. Short text that
 * fits on one line stays on one line; medium text splits into roughly equal
 * halves.
 */
export function balanceWrap(
  words: string[],
  maxWidth: number,
  measure: (s: string) => number,
): string[] {
  if (words.length === 0) return [];
  if (words.length === 1) return words;

  const n = words.length;
  // Width of a single space in this font/letter-spacing.
  const spaceWidth = measure(' ');

  // Width of words[i..j-1] joined with single spaces.
  const widthBetween = (i: number, j: number): number => {
    let w = 0;
    for (let k = i; k < j; k++) {
      w += measure(words[k]);
      if (k < j - 1) w += spaceWidth;
    }
    return w;
  };

  // Cost of a line = squared slack (maxWidth - lineWidth)^2. This naturally
  // prefers balanced line lengths because equal slacks cost less than one
  // tight line + one very short line. A tiny per-line overhead prevents
  // splitting into more lines than necessary.
  const lineCost = (i: number, j: number): number => {
    const w = widthBetween(i, j);
    if (w > maxWidth) return Infinity;
    const slack = maxWidth - w;
    return slack * slack + 1;
  };

  // dp[i] = minimum cost to wrap words[i..n-1].
  const dp: number[] = new Array(n + 1).fill(Infinity);
  const splitAt: number[] = new Array(n + 1).fill(-1);
  dp[n] = 0;

  for (let i = n - 1; i >= 0; i--) {
    for (let j = i + 1; j <= n; j++) {
      const cost = lineCost(i, j) + dp[j];
      if (cost < dp[i]) {
        dp[i] = cost;
        splitAt[i] = j;
      }
    }
  }

  const lines: string[] = [];
  let i = 0;
  while (i < n && splitAt[i] !== -1) {
    const j = splitAt[i];
    lines.push(words.slice(i, j).join(' '));
    i = j;
  }

  // Fallback: if DP somehow failed (shouldn't happen), return a single line.
  if (lines.length === 0) return [words.join(' ')];

  return lines;
}

/** Apply ctx.letterSpacing when supported (Chrome ≥ 99). */
export function setLetterSpacing(
  ctx: CanvasRenderingContext2D,
  cssValue: string,
): void {
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
    cssValue;
}

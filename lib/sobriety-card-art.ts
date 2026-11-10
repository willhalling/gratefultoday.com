/**
 * lib/sobriety-card-art.ts — the one source of truth for a Sobriety Card's
 * front artwork geometry: crayon stripes + the white blob label.
 *
 * Pure (no DOM, no WebGL) so the same seeded layout feeds every surface:
 *   - the WebGL stripes world (lib/renderer/stripes.ts) via stripeUniforms()
 *   - the static SVG used for thumbnails and the no-WebGL fallback
 *   - the Canvas2D fallback export (Path2D accepts these path strings)
 *   - the next/og OG images (satori renders inline SVG paths)
 *
 * Coordinates are pixels in whatever (width, height) the caller asks for;
 * the card itself is designed at CARD_WIDTH × CARD_HEIGHT (5:7).
 */

export const CARD_WIDTH = 1000;
export const CARD_HEIGHT = 1400;
export const PAPER_COLOR = "#FBF8F1";
export const INK_COLOR = "#141414";
export const CARD_FONT_FAMILY = "Grandstander";
export const CARD_FONT_URL = "/fonts/grandstander-800.woff2";

const TAU = Math.PI * 2;

/** Colour names for alt text — every palette colour in json/sobriety-cards.json. */
export const PALETTE_COLOR_NAMES: Record<string, string> = {
  "#F27C66": "coral",
  "#F8D368": "butter yellow",
  "#F6B3C5": "soft pink",
  "#3FB8AF": "teal",
  "#7EC8E8": "sky blue",
  "#F59A3E": "orange",
  "#8CC56B": "green",
  "#F9B38A": "peach",
  "#B9A3E3": "lilac",
  "#A8DCC0": "mint",
  "#EE6352": "red",
  // Muted set (the agreed Grateful Today tone).
  "#2B2B2B": "charcoal",
  "#4A4A4A": "graphite",
  "#6E6E6E": "slate grey",
  "#9A9A9A": "ash grey",
  "#C4C4C4": "fog grey",
  "#E3E1DC": "bone",
};

/** mulberry32 — same generator lib/renderer/deterministic.ts wraps. */
export function cardRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.replace("#", ""), 16);
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
}

// ─── Stripes ────────────────────────────────────────────────────────────────

export interface CardStripe {
  color: string;
  /** Left / right edge before wobble (px). */
  x0: number;
  x1: number;
  /** Top / bottom of the rounded ends (px). */
  top: number;
  bottom: number;
  /** Edge wobble: amplitude (px), cycles along the stripe, phase, lean (px). */
  amp: number;
  freq: number;
  phase: number;
  lean: number;
}

/**
 * Seeded stripe arrangement. The seed shuffles the palette order and sets
 * the uneven widths, overlaps, end heights and wobble — so a new seed is a
 * new arrangement of the same colours ("shuffle").
 */
export function buildStripes(
  seed: number,
  palette: string[],
  width = CARD_WIDTH,
  height = CARD_HEIGHT,
): CardStripe[] {
  const rand = cardRng(seed);
  const colors = [...palette];
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [colors[i], colors[j]] = [colors[j], colors[i]];
  }

  const unit = Math.min(width, height);
  const marginX = width * 0.065;
  const span = width - marginX * 2;
  const weights = colors.map(() => 0.72 + rand() * 0.62);
  const total = weights.reduce((sum, w) => sum + w, 0);

  let cursor = marginX;
  return colors.map((color, i) => {
    const stripeWidth = (span * weights[i]) / total;
    const overlapLeft = i > 0 ? stripeWidth * (0.03 + rand() * 0.1) : 0;
    const overlapRight =
      i < colors.length - 1 ? stripeWidth * (0.02 + rand() * 0.06) : 0;
    const stripe: CardStripe = {
      color,
      x0: cursor - overlapLeft,
      x1: cursor + stripeWidth + overlapRight,
      top: height * (0.045 + rand() * 0.05),
      bottom: height * (1 - 0.045 - rand() * 0.05),
      amp: unit * (0.004 + rand() * 0.006),
      freq: 1.4 + rand() * 1.8,
      phase: rand() * TAU,
      lean: (rand() - 0.5) * unit * 0.03,
    };
    cursor += stripeWidth;
    return stripe;
  });
}

/**
 * Horizontal edge offset at t ∈ [0, 1] down the stripe. side 0 = left,
 * 1 = right. MUST stay identical to edgeOffset() in
 * lib/renderer/vendor/three/shaders/stripes.ts.
 */
export function stripeEdgeOffset(
  stripe: CardStripe,
  t: number,
  side: 0 | 1,
): number {
  return (
    stripe.amp *
      (0.7 * Math.sin(t * stripe.freq * TAU + stripe.phase + side * 1.7) +
        0.3 *
          Math.sin(t * stripe.freq * 2.3 * TAU + stripe.phase * 1.3 + side)) +
    stripe.lean * (t - 0.5)
  );
}

/** Cap height for a stripe's rounded ends (shared with the shader). */
export function stripeCapHeight(stripe: CardStripe): number {
  return Math.min(
    (stripe.x1 - stripe.x0) * 0.42,
    (stripe.bottom - stripe.top) * 0.2,
  );
}

/** Smooth closed path through points (quadratic curves via midpoints). */
function smoothClosedPath(points: Array<[number, number]>): string {
  const n = points.length;
  const mid = (a: [number, number], b: [number, number]) => [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
  ];
  const start = mid(points[n - 1], points[0]);
  let d = `M${start[0].toFixed(1)} ${start[1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const m = mid(p, points[(i + 1) % n]);
    d += `Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
  }
  return `${d}Z`;
}

/** SVG path for one stripe: wobbly sides, rounded (half-ellipse) ends. */
export function stripePath(stripe: CardStripe, seed = 0): string {
  const jitter = cardRng(seed + Math.round(stripe.x0 * 13));
  const cap = stripeCapHeight(stripe);
  const yTop = stripe.top + cap;
  const yBottom = stripe.bottom - cap;
  const length = stripe.bottom - stripe.top;
  const tAt = (y: number) => (y - stripe.top) / length;
  const edge = (y: number, side: 0 | 1) =>
    (side === 0 ? stripe.x0 : stripe.x1) +
    stripeEdgeOffset(stripe, tAt(y), side);
  const rough = () => (jitter() - 0.5) * stripe.amp * 0.5;

  const points: Array<[number, number]> = [];
  const sideSteps = 26;
  const capSteps = 9;
  // Left side, top → bottom.
  for (let i = 0; i <= sideSteps; i++) {
    const y = yTop + ((yBottom - yTop) * i) / sideSteps;
    points.push([edge(y, 0) + rough(), y]);
  }
  // Bottom cap, left → right.
  {
    const l = edge(yBottom, 0);
    const r = edge(yBottom, 1);
    const cx = (l + r) / 2;
    const rx = (r - l) / 2;
    for (let i = 1; i < capSteps; i++) {
      const a = Math.PI - (Math.PI * i) / capSteps;
      points.push([
        cx + Math.cos(a) * rx + rough(),
        yBottom + Math.sin(a) * cap,
      ]);
    }
  }
  // Right side, bottom → top.
  for (let i = sideSteps; i >= 0; i--) {
    const y = yTop + ((yBottom - yTop) * i) / sideSteps;
    points.push([edge(y, 1) + rough(), y]);
  }
  // Top cap, right → left.
  {
    const l = edge(yTop, 0);
    const r = edge(yTop, 1);
    const cx = (l + r) / 2;
    const rx = (r - l) / 2;
    for (let i = 1; i < capSteps; i++) {
      const a = (Math.PI * i) / capSteps;
      points.push([cx + Math.cos(a) * rx + rough(), yTop - Math.sin(a) * cap]);
    }
  }
  return smoothClosedPath(points);
}

export type CardArtwork = "stripes" | "confetti" | "sunburst";

export interface CardArtworkPath {
  d: string;
  color: string;
  opacity: number;
}

function confettiPiece(
  x: number,
  y: number,
  width: number,
  height: number,
  angle: number,
): string {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const points: Array<[number, number]> = [
    [-width / 2, -height / 2],
    [width / 2, -height / 2],
    [width / 2, height / 2],
    [-width / 2, height / 2],
  ];
  const transformed = points.map(([px, py]) => [
    x + px * cosine - py * sine,
    y + px * sine + py * cosine,
  ]);
  return `${transformed.map(([px, py], index) => `${index === 0 ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`).join(" ")}Z`;
}

export function buildArtworkPaths(
  artwork: CardArtwork,
  seed: number,
  palette: string[],
  width = CARD_WIDTH,
  height = CARD_HEIGHT,
): CardArtworkPath[] {
  if (artwork === "stripes") {
    return buildStripes(seed, palette, width, height).map((stripe) => ({
      d: stripePath(stripe, seed),
      color: stripe.color,
      opacity: 0.94,
    }));
  }

  const rand = cardRng(seed);
  if (artwork === "sunburst") {
    const paths: CardArtworkPath[] = [];
    const cx = width / 2;
    const cy = height * 0.54;
    const radius = Math.max(width, height) * 1.6;
    const rays = 20;
    for (let index = 0; index < rays; index += 1) {
      const start = (index / rays) * TAU - Math.PI / 2;
      const end = ((index + 1) / rays) * TAU - Math.PI / 2;
      paths.push({
        d: `M${cx} ${cy}L${(cx + Math.cos(start) * radius).toFixed(1)} ${(cy + Math.sin(start) * radius).toFixed(1)}L${(cx + Math.cos(end) * radius).toFixed(1)} ${(cy + Math.sin(end) * radius).toFixed(1)}Z`,
        color: palette[index % palette.length],
        opacity: 0.9,
      });
    }
    return paths;
  }

  return Array.from({ length: 90 }, (_, index) => {
    const color = palette[Math.floor(rand() * palette.length)];
    const x = rand() * width;
    const y = rand() * height;
    if (index % 3 === 0) {
      const radius = Math.min(width, height) * (0.008 + rand() * 0.014);
      return {
        d: `M${(x - radius).toFixed(1)} ${y.toFixed(1)}a${radius.toFixed(1)} ${radius.toFixed(1)} 0 1 0 ${(radius * 2).toFixed(1)} 0a${radius.toFixed(1)} ${radius.toFixed(1)} 0 1 0 ${(-radius * 2).toFixed(1)} 0Z`,
        color,
        opacity: 0.88,
      };
    }
    const pieceWidth = Math.min(width, height) * (0.018 + rand() * 0.025);
    const pieceHeight = pieceWidth * (0.3 + rand() * 0.45);
    return {
      d: confettiPiece(x, y, pieceWidth, pieceHeight, rand() * TAU),
      color,
      opacity: 0.88,
    };
  });
}

// ─── Headline + label ───────────────────────────────────────────────────────

/** Approximate advance of one Grandstander 800 uppercase glyph, in em. */
const GLYPH_EM = 0.66;
export const HEADLINE_TRACKING_EM = 0.06;
export const HEADLINE_LINE_HEIGHT = 1.12;

/**
 * Split a headline into 3–5 short balanced lines (fewer for very short
 * headlines). Deterministic, so the DOM, canvas and OG images agree.
 */
export function splitHeadline(headline: string): string[] {
  if (headline.includes("\n")) {
    return headline
      .trim()
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  const words = headline.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return words;
  const minLines = Math.min(3, words.length);
  const gaps = words.length - 1;
  let best: string[] = words;
  let bestScore = Infinity;
  // Every way to break the words into lines (headlines are short: ≤ 2^9).
  for (let mask = 0; mask < 1 << gaps; mask++) {
    const lines: string[] = [];
    let current = words[0];
    for (let i = 1; i < words.length; i++) {
      if (mask & (1 << (i - 1))) {
        lines.push(current);
        current = words[i];
      } else {
        current = `${current} ${words[i]}`;
      }
    }
    lines.push(current);
    if (lines.length < minLines || lines.length > 5) continue;
    const lengths = lines.map((line) => line.length);
    const longest = Math.max(...lengths);
    const raggedness = lengths.reduce(
      (sum, len) => sum + (longest - len) ** 2,
      0,
    );
    // 3–4 lines read best; tiny lines ("OF", "UP") look stranded; wide
    // lines shrink the type.
    const countPenalty = (lines.length - 3.5) ** 2 * 10;
    const orphans = lengths.filter((len) => len <= 2).length * 30;
    const width = Math.max(0, longest - 10) ** 2 * 6;
    const score = raggedness + countPenalty + orphans + width;
    if (score < bestScore) {
      best = lines;
      bestScore = score;
    }
  }
  return best;
}

export interface LabelLayout {
  cx: number;
  cy: number;
  width: number;
  height: number;
  fontSize: number;
  lineHeight: number;
  /** Letter spacing in px. */
  tracking: number;
}

/** Label box + type size for the given lines, in (width, height) pixels. */
export function layoutLabel(
  lines: string[],
  width = CARD_WIDTH,
  height = CARD_HEIGHT,
): LabelLayout {
  // Portrait cards size off the width; landscape (OG) frames off the height.
  const unit = Math.min(width, height * 1.2);
  const longest = Math.max(1, ...lines.map((line) => line.length));
  const maxTextWidth = unit * 0.56;
  const fontSize = Math.min(
    unit * 0.088,
    maxTextWidth / (longest * (GLYPH_EM + HEADLINE_TRACKING_EM)),
  );
  const lineHeight = fontSize * HEADLINE_LINE_HEIGHT;
  const textWidth = longest * fontSize * (GLYPH_EM + HEADLINE_TRACKING_EM);
  const padX = unit * 0.075;
  const padY = unit * 0.07;
  return {
    cx: width / 2,
    cy: height / 2,
    width: Math.max(unit * 0.56, textWidth + padX * 2),
    height: lines.length * lineHeight + padY * 2,
    fontSize,
    lineHeight,
    tracking: fontSize * HEADLINE_TRACKING_EM,
  };
}

/** Irregular "blob" outline around the label box (soft, hand-cut edge). */
export function labelBlobPath(label: LabelLayout, seed: number): string {
  const rand = cardRng(seed ^ 0x5bd1e995);
  const p1 = rand() * TAU;
  const p2 = rand() * TAU;
  const p3 = rand() * TAU;
  const amp = Math.min(label.width, label.height) * 0.035;
  const hw = label.width / 2;
  const hh = label.height / 2;
  const radius = Math.min(hw, hh) * 0.55;
  const steps = 72;
  const points: Array<[number, number]> = [];
  for (let i = 0; i < steps; i++) {
    const theta = (i / steps) * TAU;
    const dx = Math.cos(theta);
    const dy = Math.sin(theta);
    // Point on a rounded rectangle along direction theta (superellipse-ish).
    const n = 4.5;
    const r =
      1 /
      Math.pow(
        Math.pow(Math.abs(dx) / hw, n) + Math.pow(Math.abs(dy) / hh, n),
        1 / n,
      );
    const wobble =
      amp *
      (0.5 * Math.sin(3 * theta + p1) +
        0.3 * Math.sin(5 * theta + p2) +
        0.2 * Math.sin(9 * theta + p3));
    const rr = r + wobble - radius * 0.04;
    points.push([label.cx + dx * rr, label.cy + dy * rr]);
  }
  return smoothClosedPath(points);
}

/** Alt text describing a card front. */
export function describeCardFront(
  palette: string[],
  headline: string,
  artwork: CardArtwork = "stripes",
): string {
  const names = Array.from(
    new Set(
      palette.map((hex) => PALETTE_COLOR_NAMES[hex.toUpperCase()] ?? "bright"),
    ),
  );
  const list =
    names.length > 1
      ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
      : names[0];
  const style =
    artwork === "stripes"
      ? "hand-drawn crayon stripes"
      : artwork === "confetti"
        ? "colourful confetti"
        : "a colourful sunburst";
  return `Card front: ${style} in ${list} on white paper, with a white label that reads “${headline}”`;
}

/**
 * lib/renderer/lyrics/synth.ts — the "synth" lyric family: one phrase at a
 * time, shaped by an ADSR-style envelope (ported from the Lyric Synth
 * prototype). Each preset is its own subtitle mode (constants/lyric-modes.ts):
 *
 *   attack  — how the phrase arrives   (fade / upscale / downscale / blur)
 *   delay   — extra ramp time before the sustain fx reaches full strength
 *   sustain — fx while the phrase is on screen (flicker / ripple / distort /
 *             fontcycle), strength 0..1; distort rides the bass so it
 *             hits on the beat
 *   release — how the phrase leaves    (fade / upscale / downscale / blur)
 *
 * Fully frame-deterministic: time is frame / fps and every random choice is
 * seededRandom(frame-bucket, phrase, char), so preview and export match.
 */
import type { ThemeConfig } from '@/constants/themes';
import type { LyricPhrase } from '@/lib/renderer/vendor/slots/lyricPhrase';
import type { LyricModeId } from '@/constants/lyric-modes';
import { THEME_FONTS, type ThemeFontKey } from '@/constants/fonts';
import { seededRandom } from '../deterministic';
import { applyTextShadow, setLetterSpacingEm } from '../overlays/text';
import { hasNonLatinScript, kineticBeatIntensity, withScriptFallbackFonts } from './shared';

// ─── Presets ────────────────────────────────────────────────────────────────

type EdgeFx = 'fade' | 'upscale' | 'downscale' | 'blur';
type SustainFx = 'none' | 'flicker' | 'ripple' | 'distort' | 'fontcycle';

interface SynthParams {
  /** ms */ attack: number;
  attackFx: EdgeFx;
  /** ms */ delay: number;
  /** 0–100 */ sustain: number;
  sustainFx: SustainFx;
  /** ms */ release: number;
  releaseFx: EdgeFx;
  /** Every phrase at one size — the smallest any phrase needs to fit —
   *  instead of each line shrinking independently (steady, caption-like). */
  uniformSize?: boolean;
}

export type SynthModeId = Extract<
  LyricModeId,
  'clean-fade' | 'impact' | 'calm-waves' | 'emphatic' | 'hyperflicker' | 'font-cycle'
>;

const SYNTH_PRESETS: Record<SynthModeId, SynthParams> = {
  'clean-fade':   { attack: 300, attackFx: 'fade',      delay: 0,   sustain: 0,  sustainFx: 'none',      release: 300, releaseFx: 'fade',    uniformSize: true },
  impact:         { attack: 180, attackFx: 'downscale', delay: 0,   sustain: 15, sustainFx: 'distort',   release: 150, releaseFx: 'upscale', uniformSize: true },
  'calm-waves':   { attack: 700, attackFx: 'blur',      delay: 200, sustain: 15, sustainFx: 'ripple',   release: 700, releaseFx: 'blur' },
  emphatic:       { attack: 120, attackFx: 'upscale',   delay: 250, sustain: 55, sustainFx: 'distort',   release: 200, releaseFx: 'blur' },
  hyperflicker:   { attack: 0,   attackFx: 'fade',      delay: 0,   sustain: 70, sustainFx: 'flicker',   release: 0,   releaseFx: 'fade' },
  'font-cycle':   { attack: 0,   attackFx: 'fade',      delay: 0,   sustain: 30, sustainFx: 'fontcycle', release: 0,   releaseFx: 'fade' },
};

export function isSynthModeId(mode: string): mode is SynthModeId {
  return mode in SYNTH_PRESETS;
}

/** Font Cycle pool — the prototype's eight faces (all in THEME_FONTS, so
 * loadSynthFonts / the custom-theme font picker share one registry). */
const CYCLE_FONTS: { key: ThemeFontKey; weight: number }[] = [
  { key: 'minimalist', weight: 700 },
  { key: 'serif', weight: 400 },
  { key: 'narrow', weight: 500 },
  { key: 'statement', weight: 400 },
  { key: 'pixel', weight: 500 },
  { key: 'thick', weight: 400 },
  { key: 'script', weight: 400 },
  { key: 'public', weight: 800 },
];

/** THEME_FONTS keys a synth mode needs loaded before its first frame. */
export function synthFontKeys(mode: string): ThemeFontKey[] {
  return mode === 'font-cycle' ? CYCLE_FONTS.map((f) => f.key) : [];
}

// ─── Flicker ───────────────────────────────────────────────────────────────
// Prototype-exact strobe: 6 + 18·intensity steps/s (≈ 18.6 at Hyperflicker's
// 70%), dimmed frames drop to 12% opacity. Deliberately NOT beat-modulated.
// ⚠️ Well above the ~3 flashes/s photosensitivity guideline — kept at the
// original rate by product decision.
const FLICKER_DIM_ALPHA = 0.12;

// ─── Prepare ────────────────────────────────────────────────────────────────

interface SynthPhrase {
  text: string;
  /** seconds */ start: number;
  /** seconds — display end (lingers a touch past the sung end). */
  end: number;
}

export interface SynthPrepared {
  params: SynthParams;
  phrases: SynthPhrase[];
  /** Line breaks + size per phrase × band (shared by every font). */
  splits: Map<string, { size: number; lines: string[] }>;
  /** Glyph positions per phrase × band × font. */
  layouts: Map<string, SynthLayout>;
  /** uniformSize presets: the shared size per band (smallest fitted size). */
  uniformSizes: Map<string, number>;
}

const LINGER_SEC = 0.35;

export function prepareSynth(mode: SynthModeId, phrases: LyricPhrase[]): SynthPrepared {
  const sorted = phrases
    .filter((p) => p.text.trim().length > 0 && p.end > p.start)
    .sort((a, b) => a.start - b.start);
  const resolved = sorted.map((p, i) => {
    const next = sorted[i + 1];
    const end = next ? Math.min(next.start, p.end + LINGER_SEC) : p.end + LINGER_SEC;
    return { text: p.text.trim(), start: p.start, end: Math.max(end, p.start + 0.1) };
  });
  return {
    params: SYNTH_PRESETS[mode],
    phrases: resolved,
    splits: new Map(),
    layouts: new Map(),
    uniformSizes: new Map(),
  };
}

// ─── Layout (wrap ≤ 3 lines, shrink to fit) ────────────────────────────────

interface SynthLine {
  text: string;
  width: number;
  /** Per-char left offsets (prefix widths keep kerning). */
  charX: number[];
}

interface SynthLayout {
  size: number;
  lineHeight: number;
  lines: SynthLine[];
}

const MAX_LINES = 3;

type FontFn = (size: number) => string;

/** Widest rendering of `text` across every font in `fonts`. */
function measureMax(ctx: CanvasRenderingContext2D, fonts: FontFn[], size: number, text: string): number {
  let max = 0;
  for (const f of fonts) {
    ctx.font = f(size);
    max = Math.max(max, ctx.measureText(text).width);
  }
  return max;
}

function wrapWords(measure: (text: string) => number, words: string[], maxW: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (cur && measure(test) > maxW) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * Line breaks + size for a phrase. Measured against EVERY font in `fonts`
 * (worst case wins), so Font Cycle keeps identical line breaks and size
 * whichever face is showing.
 */
function splitPhrase(
  ctx: CanvasRenderingContext2D,
  text: string,
  fonts: FontFn[],
  baseSize: number,
  maxW: number,
  maxH: number,
): { size: number; lines: string[] } {
  const words = text.split(/\s+/).filter(Boolean);
  let size = baseSize;
  let lines: string[] = [];
  const measureAt = (sz: number) => (t: string) => measureMax(ctx, fonts, sz, t);
  for (let i = 0; i < 12; i++) {
    const measure = measureAt(size);
    lines = wrapWords(measure, words, maxW);
    const widest = Math.max(...lines.map(measure));
    const tall = lines.length * size * 1.1;
    if (lines.length <= MAX_LINES && widest <= maxW && tall <= maxH) break;
    size *= widest > maxW ? Math.max(0.5, maxW / widest) : 0.88;
  }
  // Balance: narrowest width that keeps the same line count (no lone
  // last-line orphan like "neon on the kitchen / floor").
  if (lines.length > 1) {
    const measure = measureAt(size);
    let lo = 0;
    let hi = maxW;
    for (let i = 0; i < 10; i++) {
      const mid = (lo + hi) / 2;
      if (wrapWords(measure, words, mid).length <= lines.length) hi = mid;
      else lo = mid;
    }
    lines = wrapWords(measure, words, hi);
  }
  return { size, lines };
}

/** Per-font glyph positions for an already-split phrase. Glyphs are drawn one
 * at a time, so positions are summed per-char advances — prefix widths would
 * include ligatures ("fl" in Pixelify) and overlap the separate glyphs. */
function positionLines(ctx: CanvasRenderingContext2D, font: FontFn, size: number, lines: string[]): SynthLayout {
  ctx.font = font(size);
  return {
    size,
    lineHeight: size * 1.1,
    lines: lines.map((l) => {
      const charX: number[] = [];
      let x = 0;
      for (const ch of [...l]) {
        charX.push(x);
        x += ctx.measureText(ch).width;
      }
      return { text: l, width: x, charX };
    }),
  };
}

// ─── Colour helpers ─────────────────────────────────────────────────────────

function parseHex(color: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/** RGB-split pair from the theme accent (accent + its complement); falls back
 * to the prototype's red/cyan when the accent isn't a hex colour. */
function splitColours(accent: string | undefined): [string, string] {
  const rgb = accent ? parseHex(accent) : null;
  if (!rgb) return ['rgb(255,0,70)', 'rgb(0,220,255)'];
  const [r, g, b] = rgb;
  return [`rgb(${r},${g},${b})`, `rgb(${255 - r},${255 - g},${255 - b})`];
}

// ─── Draw ───────────────────────────────────────────────────────────────────

export interface SynthDrawArgs {
  width: number;
  height: number;
  theme: ThemeConfig;
  fontFamily?: string;
  fontSizeScale: number;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface EnvState {
  alpha: number;
  scale: number;
  /** blur as a fraction of font size */
  blur: number;
}

function applyEdge(s: EnvState, dir: 'in' | 'out', fx: EdgeFx, k: number): void {
  if (k >= 1) return;
  s.alpha *= k;
  const small = 0.3 + 0.7 * k; // grows from / shrinks to 30%
  const big = 1 + 1.4 * (1 - k); // shrinks from / grows to 240%
  if (fx === 'upscale') s.scale *= dir === 'in' ? small : big;
  if (fx === 'downscale') s.scale *= dir === 'in' ? big : small;
  if (fx === 'blur') s.blur += (1 - k) * 0.2;
}

/** Binary search — last phrase whose start <= t. */
function findPhrase(phrases: SynthPhrase[], t: number): number {
  let lo = 0;
  let hi = phrases.length - 1;
  let idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (phrases[mid].start <= t) {
      idx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return idx >= 0 && t < phrases[idx].end ? idx : -1;
}

export function drawSynth(
  ctx: CanvasRenderingContext2D,
  prepared: SynthPrepared,
  args: SynthDrawArgs,
  frame: number,
  fps: number,
  frequencyData: ArrayLike<number>,
): void {
  const { params: p, phrases, layouts, splits, uniformSizes } = prepared;
  const { width, height, theme, fontFamily, fontSizeScale } = args;
  const t = frame / fps;
  const idx = findPhrase(phrases, t);
  if (idx < 0) return;
  const phrase = phrases[idx];

  // Envelope (all in ms, like the prototype's controls).
  const lt = (t - phrase.start) * 1000;
  const D = (phrase.end - phrase.start) * 1000;
  const A = Math.min(p.attack, D / 2);
  const R = Math.min(p.release, D / 2);
  const s: EnvState = { alpha: 1, scale: 1, blur: 0 };
  applyEdge(s, 'in', p.attackFx, A ? easeOut(clamp01(lt / A)) : 1);
  applyEdge(s, 'out', p.releaseFx, R ? easeOut(clamp01((D - lt) / R)) : 1);
  if (s.alpha <= 0.001) return;

  // Sustain — runs from the phrase's first frame and eases up to full
  // strength by attack + delay (the prototype hard-switched it on after
  // `delay`, so lines sat static and then snapped into motion). Distort
  // rides the bass.
  const st = lt;
  const baseI = p.sustain / 100;
  const fx = p.sustainFx !== 'none' && baseI > 0 ? p.sustainFx : null;
  const rampMs = A + p.delay;
  const ramp = rampMs > 0 ? easeInOut(clamp01(lt / rampMs)) : 1;
  const beat = kineticBeatIntensity(frequencyData);
  const I = ramp * (fx === 'distort' ? clamp01(baseI * (0.6 + 0.8 * beat)) : baseI);
  const rnd = (n: number) => seededRandom(`synth:${idx}:${n}`);

  if (fx === 'flicker') {
    const hz = 6 + I * 18;
    if (rnd(Math.floor((st / 1000) * hz)) < I * 0.8) s.alpha *= FLICKER_DIM_ALPHA;
  }

  let fontIdx = -1; // -1 → theme font
  if (fx === 'fontcycle') {
    const every = 400 - I * 350;
    fontIdx = Math.floor(rnd(100000 + Math.floor(st / every)) * CYCLE_FONTS.length);
  }
  const makeFont = (fi: number): FontFn => {
    const family =
      fi < 0 ? withScriptFallbackFonts(fontFamily) : withScriptFallbackFonts(`'${THEME_FONTS[CYCLE_FONTS[fi].key].name}'`);
    const weight = fi < 0 ? 700 : CYCLE_FONTS[fi].weight;
    return (size) => `${weight} ${size}px ${family}`;
  };
  const font = makeFont(fontIdx);

  // Layout: line breaks are shared by every font the phrase can show (Font
  // Cycle measures the whole pool), then glyph positions are per font.
  const isPortrait = height > width;
  const baseSize = Math.round(
    Math.min(height * (isPortrait ? 0.085 : 0.13), width * 0.14) * fontSizeScale,
  );
  const maxW = width * 0.84;
  const maxH = height * 0.9;
  const band = `${Math.round(maxW)}|${Math.round(maxH)}|${baseSize}`;
  const bandKey = `${idx}|${band}`;
  let split = splits.get(bandKey);
  if (!split) {
    const pool = p.sustainFx === 'fontcycle' ? [-1, ...CYCLE_FONTS.map((_, i) => i)] : [-1];
    const fonts = pool.map(makeFont);
    ctx.save();
    setLetterSpacingEm(ctx, 0, baseSize);
    let startSize = baseSize;
    if (p.uniformSize) {
      // One size for the whole track: fit every phrase once and keep the
      // smallest, so lines don't jump in size as their length changes. At
      // that size every phrase fits, so each re-split below keeps it.
      let shared = uniformSizes.get(band);
      if (shared === undefined) {
        shared = baseSize;
        for (const ph of phrases) {
          shared = Math.min(shared, splitPhrase(ctx, ph.text, fonts, baseSize, maxW, maxH).size);
        }
        uniformSizes.set(band, shared);
      }
      startSize = shared;
    }
    split = splitPhrase(ctx, phrase.text, fonts, startSize, maxW, maxH);
    ctx.restore();
    splits.set(bandKey, split);
  }
  const key = `${bandKey}|${fontIdx}`;
  let layout = layouts.get(key);
  if (!layout) {
    ctx.save();
    setLetterSpacingEm(ctx, 0, split.size);
    layout = positionLines(ctx, font, split.size, split.lines);
    ctx.restore();
    layouts.set(key, layout);
  }
  const { size, lineHeight, lines } = layout;

  // Complex scripts must be shaped as a whole line — no per-glyph motion.
  const perChar = !hasNonLatinScript(phrase.text);
  const textColor = theme.textColor || '#ffffff';
  const [splitA, splitB] = splitColours(theme.accentColor);
  const shadow = theme.textShadow || (theme.lightBackground ? 'none' : '0 2px 24px rgba(0,0,0,0.85)');

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(s.scale, s.scale);
  ctx.globalAlpha *= s.alpha;
  if (s.blur * size > 0.1) ctx.filter = `blur(${(s.blur * size).toFixed(2)}px)`;
  ctx.font = font(size);
  setLetterSpacingEm(ctx, 0, size);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const blockTop = -((lines.length - 1) * lineHeight) / 2;
  let ci = 0; // running char index across lines (ripple phase continuity)
  lines.forEach((line, li) => {
    const y = blockTop + li * lineHeight;
    const left = -line.width / 2;

    if (!perChar) {
      applyTextShadow(ctx, shadow);
      ctx.fillStyle = textColor;
      ctx.fillText(line.text, -ctx.measureText(line.text).width / 2, y);
      return;
    }

    const chars = [...line.text];
    chars.forEach((ch, i) => {
      const gi = ci++;
      if (ch === ' ') return;
      const cw = ctx.measureText(ch).width;
      let dx = 0;
      let dy = 0;
      let rot = 0;
      let split = 0;

      if (fx === 'ripple') {
        // travelling sine wave across the letters
        const ph = (st / 1000) * Math.PI * 2 * 1.1 - gi * 0.45;
        dy = Math.sin(ph) * I * 0.35 * size;
        rot = Math.cos(ph) * I * 0.15;
      }
      if (fx === 'distort') {
        // jitter at 20 steps/s + RGB split
        const b = Math.floor(st / 50) * 131 + gi * 7;
        dx = (rnd(b) - 0.5) * I * 0.25 * size;
        dy = (rnd(b + 1) - 0.5) * I * 0.25 * size;
        rot = (rnd(b + 2) - 0.5) * I * 0.5;
        split = I * 0.09 * size;
      }

      ctx.save();
      ctx.translate(left + line.charX[i] + cw / 2 + dx, y + dy);
      if (rot) ctx.rotate(rot);
      if (split) {
        applyTextShadow(ctx, undefined);
        const a = ctx.globalAlpha;
        ctx.globalAlpha = a * 0.85;
        ctx.fillStyle = splitA;
        ctx.fillText(ch, -cw / 2 - split, 0);
        ctx.fillStyle = splitB;
        ctx.fillText(ch, -cw / 2 + split, 0);
        ctx.globalAlpha = a;
      }
      applyTextShadow(ctx, shadow);
      ctx.fillStyle = textColor;
      ctx.fillText(ch, -cw / 2, 0);
      ctx.restore();
    });
  });
  ctx.restore();
}

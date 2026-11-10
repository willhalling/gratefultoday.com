/**
 * lib/tiktok-maker/signature/scene.ts — the willhalling.com signature typewriter
 * (lib/intro/scene.ts) adapted to a 1080×1920 TikTok overlay.
 *
 * Kept identical to the original: the prompt glyph and weights (500 typed,
 * 600 title, 700 terminal title), cursor geometry (block 0.62em / bar 0.08em,
 * 0.12em / 0.05em gap, 0.82em above the baseline, 0.98em tall), the resolve
 * easing (inOut of the 0.215,0.61,0.355,1 cubic), the centred-prompt rule, and
 * all timing (timeline.ts is a verbatim port).
 *
 * Added for TikTok: the text is drawn transparent over the WebGL background,
 * long lines wrap (hanging indent under the prompt) instead of only shrinking,
 * and a 'stack' mode where each line types on its own row and stays.
 */
import { Easing } from '@/lib/renderer/timing';
import { signatureCues, type AudioCue } from './audio';
import {
  buildTimeline,
  MAX_FIT_CPS,
  stateAtFrame,
  type IntroTimeline,
} from './timeline';
import type { IntroFontKey, IntroSound, IntroSpec, IntroTransition } from './types';

export const DESIGN_WIDTH = 1080;
export const DESIGN_HEIGHT = 1920;

/** Text safe area: TikTok's like/comment/share rail sits down the right edge. */
const SAFE_LEFT = Math.round(DESIGN_WIDTH * 0.09);
const SAFE_RIGHT = Math.round(DESIGN_WIDTH * 0.18);
/** TikTok's "Following / For You" bar covers the top ~10%: text never starts above this. */
const SAFE_TOP = Math.round(DESIGN_HEIGHT * 0.1);
/** Bottom limit for the block (TikTok's caption and controls sit below this). */
const SAFE_BOTTOM = Math.round(DESIGN_HEIGHT * 0.94);
/** Horizontal centre of the safe area (not of the frame). */
const SAFE_CENTRE = Math.round((SAFE_LEFT + (DESIGN_WIDTH - SAFE_RIGHT)) / 2);

const PROMPT = '>';
/** willhalling.com lib/render/timing.ts Easing.cubic (CSS ease-out-cubic bezier). */
const signatureCubic = Easing.bezier(0.215, 0.61, 0.355, 1.0);
const easeInOut = Easing.inOut(signatureCubic);

/** Shortest hold left on the finished text when typing is sped up to fit the clip. */
const MIN_HOLD_SEC = 0.6;

export type LineMode = 'retype' | 'stack';

/** Most lines a video can type (the willhalling.com signature allowed 3). */
export const MAX_LINES = 6;

export interface TypewriterSettings {
  /** 1–MAX_LINES lines. */
  lines: string[];
  /** 'retype': the signature — earlier lines type then backspace, the last stays.
   *  'stack': every line types on its own row and stays. */
  mode: LineMode;
  /** Optional resolve title (retype mode only). */
  title: string;
  transition: IntroTransition;
  typingCps: number;
  leadInMs: number;
  pauseMs: number;
  seed: number;
  font: IntroFontKey;
  /** Design-space (1080-wide) font size. */
  fontPx: number;
  /** Vertical centre of the text block, 0 (top) – 1 (bottom). */
  centerY: number;
  align: 'left' | 'center';
  cursorStyle: 'block' | 'bar';
  showPrompt: boolean;
  colors: { text: string; prompt: string; cursor: string };
  /** Soft drop shadow behind glyphs for legibility over photos. */
  shadow: boolean;
  /** 0–1 black dim over the whole background. */
  scrim: number;
  sound: IntroSound;
}

export const DEFAULT_TYPEWRITER: TypewriterSettings = {
  lines: ['', '', ''],
  mode: 'retype',
  title: '',
  transition: 'terminal',
  typingCps: 11,
  leadInMs: 250,
  pauseMs: 300,
  seed: 1,
  font: 'jetbrains-mono',
  fontPx: 64,
  // Top third: clear of TikTok's caption and buttons lower down (the block is
  // also kept below TikTok's top bar — see SAFE_TOP).
  centerY: 0.2,
  align: 'center',
  cursorStyle: 'bar',
  showPrompt: true,
  colors: { text: '#fafafa', prompt: '#facc15', cursor: '#facc15' },
  shadow: true,
  scrim: 0.35,
  sound: { enabled: true, keyVolume: 0.5, toneVolume: 0.5, keyStyle: 'soft', enterKey: true },
};

const FONT_FAMILIES: Record<IntroFontKey, string> = {
  'jetbrains-mono': 'JetBrains Mono',
  'ibm-plex-mono': 'IBM Plex Mono',
  'space-mono': 'Space Mono',
};

export function typewriterFontFamily(key: IntroFontKey): string {
  return FONT_FAMILIES[key] ?? FONT_FAMILIES['jetbrains-mono'];
}

export function typewriterFontWeights(key: IntroFontKey): string[] {
  return key === 'space-mono' ? ['400', '700'] : ['400', '500', '600', '700'];
}

function fontStack(key: IntroFontKey): string {
  return `'${typewriterFontFamily(key)}', 'SFMono-Regular', Menlo, Consolas, monospace`;
}

export function cleanLines(lines: string[]): string[] {
  const out = lines.map((l) => l.trim()).filter(Boolean).slice(0, MAX_LINES);
  return out.length ? out : [''];
}

// ─── Timing plan ─────────────────────────────────────────────────────────────

interface RetypePlan {
  mode: 'retype';
  spec: IntroSpec;
  timeline: IntroTimeline;
}

interface StackPlan {
  mode: 'stack';
  specs: IntroSpec[];
  timelines: IntroTimeline[];
  /** Absolute start of each line's local clock. */
  offsets: number[];
}

export type TypewriterPlan = (RetypePlan | StackPlan) & {
  lines: string[];
  totalSec: number;
  /** Typing speed actually used (raised when the text had to fit a short clip). */
  typingCps: number;
  /** True when the typing speed was raised to fit the clip. */
  sped: boolean;
  /** True when even the fastest believable speed (30 cps) overruns the clip. */
  overruns: boolean;
  cues: AudioCue[];
};

function baseSpec(s: TypewriterSettings, line: string, cps: number): IntroSpec {
  return {
    line,
    title: '',
    typingCps: cps,
    fitDurationMs: 0,
    leadInMs: s.leadInMs,
    jitterSeed: s.seed,
    pauseMs: s.pauseMs,
    holdMs: 0,
    format: '1080x1920',
    fps: 30,
    colors: { background: '#000000', ...s.colors },
    font: s.font,
    transition: s.transition,
    sound: s.sound,
    align: s.align,
    cursorStyle: s.cursorStyle,
  };
}

function retypeAt(s: TypewriterSettings, lines: string[], cps: number, holdSec: number): RetypePlan {
  const spec: IntroSpec = {
    ...baseSpec(s, lines[lines.length - 1], cps),
    previousLines: lines.slice(0, -1),
    title: s.title,
    holdMs: Math.max(0, holdSec * 1000),
  };
  return { mode: 'retype', spec, timeline: buildTimeline(spec) };
}

function stackAt(s: TypewriterSettings, lines: string[], cps: number, holdSec: number): StackPlan {
  const specs: IntroSpec[] = [];
  const timelines: IntroTimeline[] = [];
  const offsets: number[] = [];
  let t = 0;
  lines.forEach((line, i) => {
    const last = i === lines.length - 1;
    const spec: IntroSpec = {
      ...baseSpec(s, line, cps),
      leadInMs: i === 0 ? s.leadInMs : 0,
      jitterSeed: s.seed + i * 7919,
      holdMs: last ? Math.max(0, holdSec * 1000) : 0,
    };
    const timeline = buildTimeline(spec);
    specs.push(spec);
    timelines.push(timeline);
    offsets.push(t);
    // The next line starts once this one has typed and paused.
    t += timeline.resolveStartSec;
  });
  return { mode: 'stack', specs, timelines, offsets };
}

function planLength(p: RetypePlan | StackPlan): number {
  if (p.mode === 'retype') return p.timeline.totalSec;
  const i = p.timelines.length - 1;
  return p.offsets[i] + p.timelines[i].totalSec;
}

/** Seconds the text needs at its chosen speed (lead-in through the last keystroke and pause), with no hold. */
export function naturalTypingSec(s: TypewriterSettings): number {
  const lines = cleanLines(s.lines);
  const cps = Math.max(1, s.typingCps);
  return planLength(s.mode === 'stack' ? stackAt(s, lines, cps, 0) : retypeAt(s, lines, cps, 0));
}

/**
 * Build the typing plan for a clip of `totalSec`. The finished text holds for
 * the rest of the clip; if the text can't finish in time at the chosen speed,
 * typing is sped up (up to the signature's 30 chars/s ceiling) so it lands
 * MIN_HOLD_SEC before the end.
 */
export function buildTypewriterPlan(s: TypewriterSettings, totalSec: number): TypewriterPlan {
  const lines = cleanLines(s.lines);
  const build = (cps: number, hold: number) =>
    s.mode === 'stack' ? stackAt(s, lines, cps, hold) : retypeAt(s, lines, cps, hold);

  let cps = Math.max(1, s.typingCps);
  let sped = false;
  let overruns = false;
  const fits = (c: number) => planLength(build(c, 0)) + MIN_HOLD_SEC <= totalSec;
  if (!fits(cps)) {
    sped = true;
    if (!fits(MAX_FIT_CPS)) {
      cps = Math.max(cps, MAX_FIT_CPS);
      overruns = true;
    } else {
      let lo = cps;
      let hi = MAX_FIT_CPS;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        if (fits(mid)) hi = mid;
        else lo = mid;
      }
      cps = hi;
    }
  }
  const hold = Math.max(0, totalSec - planLength(build(cps, 0)));
  const plan = build(cps, hold);

  let cues: AudioCue[];
  if (plan.mode === 'retype') {
    cues = signatureCues(plan.spec, plan.timeline);
  } else {
    cues = plan.specs.flatMap((spec, i) =>
      signatureCues(spec, plan.timelines[i]).map((c) => ({ ...c, atSec: c.atSec + plan.offsets[i] })),
    );
  }
  cues = cues.filter((c) => c.atSec < totalSec).sort((a, b) => a.atSec - b.atSec);

  return { ...plan, lines, totalSec, typingCps: cps, sped, overruns, cues };
}

// ─── Layout ──────────────────────────────────────────────────────────────────

interface WrappedLine {
  text: string;
  /** Char index each row starts at; rows[i] = text.slice(starts[i], starts[i+1]). */
  starts: number[];
}

export interface TypewriterLayout {
  fontPx: number;
  fontFamily: string;
  marginX: number;
  promptX: number;
  textX: number;
  rowH: number;
  /** Baseline of the block's centre (signature: centre + 0.35em). */
  centreBaseline: number;
  lines: WrappedLine[];
  title: WrappedLine | null;
  /** First-row baseline of each line (stack: per line; retype: shared anchor). */
  firstBaselines: number[];
}

function fontString(family: string, px: number, weight: number): string {
  return `${weight} ${px}px ${family}`;
}

/** Greedy word wrap that keeps each row's trailing space, so char indices map 1:1. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): WrappedLine {
  const starts = [0];
  const tokens = text.match(/\S+\s*/g) ?? [];
  let rowStart = 0;
  let pos = 0;
  for (const token of tokens) {
    const candidate = text.slice(rowStart, pos + token.length).trimEnd();
    if (pos > rowStart && ctx.measureText(candidate).width > maxWidth) {
      starts.push(pos);
      rowStart = pos;
    }
    pos += token.length;
  }
  return { text, starts };
}

function rowsOf(line: WrappedLine): string[] {
  return line.starts.map((s, i) => line.text.slice(s, line.starts[i + 1] ?? line.text.length));
}

export function computeTypewriterLayout(
  ctx: CanvasRenderingContext2D,
  s: TypewriterSettings,
  plan: TypewriterPlan,
): TypewriterLayout {
  const fontFamily = fontStack(s.font);
  const W = DESIGN_WIDTH;
  const H = DESIGN_HEIGHT;
  const marginX = SAFE_LEFT;
  const maxWidth = W - SAFE_LEFT - SAFE_RIGHT;
  const title = plan.mode === 'retype' && plan.timeline.hasResolve ? plan.spec.title.trim() : '';

  // Signature rule: shrink until the longest unbreakable run fits the frame.
  const words = [...plan.lines, title].join(' ').split(/\s+/).filter(Boolean);
  let fontPx = s.fontPx;
  const longest = (px: number) => {
    ctx.font = fontString(fontFamily, px, 700);
    const promptW = s.showPrompt ? ctx.measureText(`${PROMPT} `).width : 0;
    return Math.max(0, ...words.map((w) => ctx.measureText(w).width)) + promptW;
  };
  while (fontPx > 12 && longest(fontPx) > maxWidth) fontPx -= 2;

  // Stack mode with up to six wrapped lines can outgrow the frame: shrink until
  // the whole block fits in 80% of its height (retype shows one line at a time).
  if (plan.mode === 'stack') {
    const blockHeight = (px: number) => {
      ctx.font = fontString(fontFamily, px, 500);
      const p = s.showPrompt ? ctx.measureText(`${PROMPT} `).width : 0;
      const rows = plan.lines.reduce((n, l) => n + wrap(ctx, l, maxWidth - p).starts.length, 0);
      return (rows - 1) * Math.round(px * 1.3) + (plan.lines.length - 1) * Math.round(px * 0.5) + px;
    };
    while (fontPx > 24 && blockHeight(fontPx) > H * 0.8) fontPx -= 2;
  }

  ctx.font = fontString(fontFamily, fontPx, 500);
  const prompt = s.showPrompt ? ctx.measureText(`${PROMPT} `).width : 0;
  const lines = plan.lines.map((l) => wrap(ctx, l, maxWidth - prompt));
  // Centred: the prompt stays put for every line, so centre the widest finished row.
  const widest = Math.max(
    1,
    ...lines.flatMap((l) => rowsOf(l).map((r) => prompt + ctx.measureText(r.trimEnd()).width)),
  );
  const promptX = s.align === 'center' ? Math.round(SAFE_CENTRE - widest / 2) : marginX;

  ctx.font = fontString(fontFamily, fontPx, s.transition === 'terminal' ? 700 : 600);
  const titleWrap = title ? wrap(ctx, title, maxWidth) : null;

  const rowH = Math.round(fontPx * 1.3);
  let centreBaseline = Math.round(H * s.centerY + fontPx * 0.35);
  // The block's height: retype shows the tallest line at a time; stack shows them all.
  const lineGap = Math.round(fontPx * 0.5);
  const maxRows = Math.max(...lines.map((l) => l.starts.length));
  const span =
    plan.mode === 'retype'
      ? (maxRows - 1) * rowH
      : lines.reduce((n, l) => n + l.starts.length, 0) * rowH - rowH + (lines.length - 1) * lineGap;
  // Keep the whole block inside the TikTok-safe area, wherever it's placed.
  const top = centreBaseline - span / 2 - fontPx;
  const bottom = centreBaseline + span / 2 + fontPx * 0.3;
  if (top < SAFE_TOP) centreBaseline += SAFE_TOP - top;
  else if (bottom > SAFE_BOTTOM) centreBaseline -= bottom - SAFE_BOTTOM;

  let firstBaselines: number[];
  if (plan.mode === 'retype') {
    // Every line starts on the same row: anchor the tallest one around the centre.
    const b0 = centreBaseline - span / 2;
    firstBaselines = lines.map(() => b0);
  } else {
    let b = centreBaseline - span / 2;
    firstBaselines = lines.map((l) => {
      const at = b;
      b += l.starts.length * rowH + lineGap;
      return at;
    });
  }

  return {
    fontPx,
    fontFamily,
    marginX,
    promptX,
    textX: promptX + prompt,
    rowH,
    centreBaseline,
    lines,
    title: titleWrap,
    firstBaselines,
  };
}

// ─── Drawing ─────────────────────────────────────────────────────────────────

function applyShadow(ctx: CanvasRenderingContext2D, s: TypewriterSettings, fontPx: number): void {
  if (!s.shadow) return;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = Math.round(fontPx * 0.35);
  ctx.shadowOffsetY = Math.round(fontPx * 0.06);
}

/** Prompt + typed rows + (optional) cursor — the signature's drawCommandLine, wrapped. */
function drawCommand(
  ctx: CanvasRenderingContext2D,
  s: TypewriterSettings,
  layout: TypewriterLayout,
  line: WrappedLine,
  visible: string,
  baseline: number,
  showCursor: boolean,
): void {
  const { fontPx, promptX, textX, rowH } = layout;
  ctx.font = fontString(layout.fontFamily, fontPx, 500);
  if (s.showPrompt) {
    ctx.fillStyle = s.colors.prompt;
    ctx.fillText(PROMPT, promptX, baseline);
  }
  ctx.fillStyle = s.colors.text;
  const k = visible.length;
  line.starts.forEach((start, r) => {
    const end = line.starts[r + 1] ?? line.text.length;
    if (k <= start) return;
    ctx.fillText(visible.slice(start, Math.min(k, end)), textX, baseline + r * rowH);
  });

  if (showCursor) {
    // The cursor sits after the last typed character, on that character's row.
    let r = 0;
    if (k > 0) {
      while (r + 1 < line.starts.length && line.starts[r + 1] <= k - 1) r++;
    }
    const rowTyped = visible.slice(line.starts[r], k);
    const typedWidth = ctx.measureText(rowTyped).width;
    const bar = s.cursorStyle === 'bar';
    const cursorW = bar ? Math.max(2, Math.round(fontPx * 0.08)) : Math.round(fontPx * 0.62);
    const y = baseline + r * rowH;
    ctx.fillStyle = s.colors.cursor;
    ctx.fillRect(
      textX + typedWidth + Math.round(fontPx * (bar ? 0.05 : 0.12)),
      y - fontPx * 0.82,
      cursorW,
      Math.round(fontPx * 0.98),
    );
  }
}

function drawTitleRows(
  ctx: CanvasRenderingContext2D,
  s: TypewriterSettings,
  layout: TypewriterLayout,
  title: WrappedLine,
  firstBaseline: number,
): void {
  rowsOf(title).forEach((row, r) => {
    const y = firstBaseline + r * layout.rowH;
    if (s.align === 'center') {
      ctx.textAlign = 'center';
      ctx.fillText(row.trimEnd(), SAFE_CENTRE, y);
      ctx.textAlign = 'left';
    } else {
      ctx.fillText(row.trimEnd(), layout.marginX, y);
    }
  });
}

/**
 * Draw the typewriter at `tSec` into a 1080×1920 design-space context
 * (callers scale the context to the render size). Transparent: the WebGL
 * world underneath is the background.
 */
export function drawTypewriter(
  ctx: CanvasRenderingContext2D,
  tSec: number,
  s: TypewriterSettings,
  plan: TypewriterPlan,
  layout: TypewriterLayout,
): void {
  ctx.save();
  if (s.scrim > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, s.scrim)})`;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  }
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  applyShadow(ctx, s, layout.fontPx);

  if (plan.mode === 'stack') {
    plan.timelines.forEach((timeline, i) => {
      const local = tSec - plan.offsets[i];
      if (local < 0) return;
      const last = i === plan.timelines.length - 1;
      const line = layout.lines[i];
      if (!last && local >= timeline.resolveStartSec) {
        // Finished earlier line: stays on screen, no cursor.
        drawCommand(ctx, s, layout, line, line.text, layout.firstBaselines[i], false);
        return;
      }
      const state = stateAtFrame(local, 1, timeline);
      drawCommand(ctx, s, layout, line, line.text.slice(0, state.typedCount), layout.firstBaselines[i], state.cursorVisible);
    });
    ctx.restore();
    return;
  }

  const { spec, timeline } = plan;
  const state = stateAtFrame(tSec, 1, timeline);
  // Which line is on screen: a preroll segment, or the final line.
  let lineIdx = plan.lines.length - 1;
  let visible = spec.line.slice(0, state.typedCount);
  if (state.text !== undefined) {
    const seg = timeline.preroll.findIndex((p) => tSec < p.endSec);
    lineIdx = seg === -1 ? timeline.preroll.length - 1 : seg;
    visible = state.text;
  }
  const line = layout.lines[lineIdx];
  const b0 = layout.firstBaselines[lineIdx];
  const { fontPx } = layout;

  if (s.transition === 'terminal' && timeline.hasResolve && layout.title) {
    // Terminal resolve: the command rises and dims to 35% like shell history,
    // the title appears beneath it in 700; the pair stays centred.
    const t = state.phase === 'resolve' || state.phase === 'hold' ? easeInOut(state.resolveT) : 0;
    const m = line.starts.length;
    const n = layout.title.starts.length;
    const span = (m - 1) * layout.rowH + fontPx * 1.6 + (n - 1) * layout.rowH;
    const finalB0 = layout.centreBaseline - span / 2;
    const cmdB0 = b0 + (finalB0 - b0) * t;
    ctx.globalAlpha = 1 - 0.65 * t;
    drawCommand(ctx, s, layout, line, visible, cmdB0, t === 0 && state.cursorVisible);
    ctx.globalAlpha = 1;
    if (t > 0) {
      ctx.globalAlpha = t;
      ctx.font = fontString(layout.fontFamily, fontPx, 700);
      ctx.fillStyle = s.colors.text;
      const titleB0 = finalB0 + (m - 1) * layout.rowH + fontPx * 1.6 + Math.round(fontPx * 0.35 * (1 - t));
      drawTitleRows(ctx, s, layout, layout.title, titleB0);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    return;
  }

  // Fade / slide: the typed line goes out as the title comes in.
  const lineOut =
    timeline.hasResolve && state.phase !== 'lead' && state.phase !== 'type' && state.phase !== 'pause'
      ? easeInOut(state.resolveT)
      : 0;
  if (lineOut < 1) {
    const dy = s.transition === 'slide' ? -Math.round(fontPx * 0.6 * lineOut) : 0;
    ctx.globalAlpha = 1 - lineOut;
    drawCommand(ctx, s, layout, line, visible, b0 + dy, state.cursorVisible);
    ctx.globalAlpha = 1;
  }
  if (timeline.hasResolve && layout.title && state.resolveT > 0) {
    const t = easeInOut(state.resolveT);
    const dy = s.transition === 'slide' ? Math.round(fontPx * 0.6 * (1 - t)) : 0;
    ctx.globalAlpha = t;
    ctx.font = fontString(layout.fontFamily, fontPx, 600);
    ctx.fillStyle = s.colors.text;
    const n = layout.title.starts.length;
    drawTitleRows(ctx, s, layout, layout.title, layout.centreBaseline - ((n - 1) * layout.rowH) / 2 + dy);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// Ported verbatim from willhalling.com lib/intro/timeline.ts (the signature typewriter).
// Keep in sync with that file rather than tuning it here.
/**
 * lib/intro/timeline.ts — pure timing model for the intro. No clocks, no
 * Math.random at render time: every per-frame fact derives from the spec and
 * a mulberry32 PRNG seeded by spec.jitterSeed, so identical specs produce
 * identical frames and audio.
 */
import { clamp01 } from '@/lib/renderer/timing';
import type { IntroSpec } from './types';

/** mulberry32 — tiny deterministic PRNG. */
export function createPrng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Duration of the resolve transition, seconds. */
export const RESOLVE_SEC = 0.32;
/** Cursor blink period, seconds (classic ~530 ms half-period feel). */
const CURSOR_HALF_PERIOD_SEC = 0.53;

/** Believable typing-speed range when fitting a line to a target length. */
export const MIN_FIT_CPS = 6;
export const MAX_FIT_CPS = 30;

export interface IntroTimeline {
  /** Blinking-cursor lead-in before the first keystroke. */
  leadInSec: number;
  /** Time (seconds) at which character i appears, length = line.length. */
  charTimesSec: number[];
  /** When the last character is fully typed. */
  typeEndSec: number;
  /** Resolve transition starts (typeEnd + pause). */
  resolveStartSec: number;
  /** Resolve transition ends. */
  resolveEndSec: number;
  /** Total clip duration. */
  totalSec: number;
  /** Whether a visible resolve transition happens (title differs from line). */
  hasResolve: boolean;
  /** Average characters per second actually used (after fit-to-length). */
  effectiveCps: number;
  /** Fit-to-length was requested but the line could not hit it within 6–30 chars/s. */
  fitClamped: boolean;
  /** Lines typed then deleted before the final line (spec.previousLines). The
   *  final line's times above are absolute, i.e. already after these. */
  preroll: PrerollSegment[];
}

export interface PrerollSegment {
  line: string;
  /** Time each character appears. */
  charTimesSec: number[];
  /** Time each Backspace removes a character (last character first). */
  deleteTimesSec: number[];
  /** When the line is fully typed (cursor blinks until the first Backspace). */
  typeEndSec: number;
  /** When the line is gone. */
  endSec: number;
}

/** Hold on a finished line before deleting it, seconds. */
const PREROLL_HOLD_SEC = 0.55;
/** Beat between a line being cleared and the next one starting. */
const PREROLL_GAP_SEC = 0.22;

/** Backspace held down: a tap, the key-repeat delay, then accelerating repeats. */
function deleteSchedule(start: number, n: number): number[] {
  const out: number[] = [];
  let t = start;
  for (let i = 0; i < n; i++) {
    out.push(t);
    t += i === 0 ? 0.16 : Math.max(0.032, 0.085 - i * 0.008);
  }
  return out;
}

export type IntroPhase = 'lead' | 'type' | 'pause' | 'resolve' | 'hold';

export interface IntroFrameState {
  phase: IntroPhase;
  /** Number of characters of the line currently visible. */
  typedCount: number;
  /** 0→1 progress through the resolve transition (1 outside the resolve). */
  resolveT: number;
  /** Block cursor on/off this frame (always solid while typing). */
  cursorVisible: boolean;
  /** During a preroll line: the visible text and the full line being typed. */
  text?: string;
  lineText?: string;
}

// Common English letter pairs a practised typist rolls through quickly.
const FAST_BIGRAMS = new Set(
  'th he in er an re on at en nd ti es or te of ed is it al ar st to nt ng se ha as ou io le ve co me de hi ri ro ic ne ea ra ce li ch ll be ma si om ur ow ly wh'.split(
    ' ',
  ),
);

/**
 * Relative delay *before* character i (1 = the baseline gap). Models how people
 * actually type: bursts through common pairs, a beat before each new word,
 * slower on punctuation and capitals (Shift), and a per-word speed drift.
 */
function relativeGaps(line: string, rand: () => number): number[] {
  const gaps: number[] = [];
  let wordSpeed = 0.9 + rand() * 0.2;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const prev = i > 0 ? line[i - 1] : '';
    if (prev === ' ') wordSpeed = 0.9 + rand() * 0.2; // each word has its own pace
    let f = 0.82 + rand() * 0.36; // small human jitter
    const pair = (prev + ch).toLowerCase();
    if (FAST_BIGRAMS.has(pair)) f *= 0.72;
    else if (prev && prev.toLowerCase() === ch.toLowerCase()) f *= 0.85; // double letter
    if (prev === ' ') f *= 1.3; // a beat before each new word
    if (ch === ' ') f *= 1.1;
    if (/[.,!?;:]/.test(ch)) f *= 1.6;
    if (/[A-Z]/.test(ch)) f *= 1.3; // reaching for Shift
    gaps.push(f * wordSpeed);
  }
  return gaps;
}

export function buildTimeline(spec: IntroSpec): IntroTimeline {
  const rand = createPrng(spec.jitterSeed);
  const n = spec.line.length;
  const leadInSec = Math.max(0, spec.leadInMs ?? 0) / 1000;
  const resolvedTitle = spec.title.trim();
  const hasResolve = resolvedTitle.length > 0 && resolvedTitle !== spec.line;

  // gaps[0] is the beat before the first key (part of the lead-in feel, kept short);
  // a trailing gap after the last key keeps the final keystroke from feeling clipped.
  const gaps = relativeGaps(spec.line, rand);
  const trailing = 0.82 + rand() * 0.36;
  const relTotal = gaps.slice(1).reduce((a, b) => a + b, 0) + trailing;

  const fixedSec = leadInSec + spec.pauseMs / 1000 + RESOLVE_SEC + spec.holdMs / 1000;
  let baseGap = 1 / Math.max(1, spec.typingCps);
  let fitClamped = false;
  if (spec.fitDurationMs > 0 && n > 0) {
    const budget = spec.fitDurationMs / 1000 - fixedSec;
    const wanted = budget > 0 ? budget / relTotal : Infinity;
    const minGap = 1 / MAX_FIT_CPS;
    const maxGap = 1 / MIN_FIT_CPS;
    baseGap = Math.min(maxGap, Math.max(minGap, wanted));
    fitClamped = baseGap !== wanted;
  }

  // Earlier lines: typed at the same pace, held, then backspaced away.
  const preroll: PrerollSegment[] = [];
  let t = leadInSec;
  // gratefultoday.com change: up to 5 earlier lines (6 in all); the original allows 2.
  for (const prev of (spec.previousLines ?? []).filter((l) => l.length > 0).slice(0, 5)) {
    const pg = relativeGaps(prev, rand);
    const times: number[] = [];
    for (let i = 0; i < prev.length; i++) {
      if (i > 0) t += baseGap * pg[i];
      times.push(t);
    }
    const typeEnd = t + baseGap * (0.82 + rand() * 0.36);
    const deletes = deleteSchedule(typeEnd + PREROLL_HOLD_SEC, prev.length);
    const end = deletes[deletes.length - 1] + 0.05;
    preroll.push({ line: prev, charTimesSec: times, deleteTimesSec: deletes, typeEndSec: typeEnd, endSec: end });
    t = end + PREROLL_GAP_SEC;
  }

  const charTimesSec: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i > 0) t += baseGap * gaps[i];
    charTimesSec.push(t);
  }
  const finalStart = charTimesSec[0] ?? t;
  const typeEndSec = n > 0 ? t + baseGap * trailing : t;
  const typingSec = typeEndSec - finalStart;

  const resolveStartSec = typeEndSec + spec.pauseMs / 1000;
  const resolveEndSec = resolveStartSec + RESOLVE_SEC;

  return {
    leadInSec,
    charTimesSec,
    typeEndSec,
    resolveStartSec,
    resolveEndSec,
    totalSec: resolveEndSec + spec.holdMs / 1000,
    hasResolve,
    effectiveCps: n > 0 && typingSec > 0 ? n / typingSec : spec.typingCps,
    fitClamped,
    preroll,
  };
}

/**
 * The one typing schedule. Visuals (stateAtFrame / the scene renderer) and
 * audio (signatureCues → keystroke cues) both read the timeline it returns, so
 * keystroke sounds and on-screen characters can never drift apart.
 */
export const typingSchedule = buildTimeline;

export function totalFrames(timeline: IntroTimeline, fps: number): number {
  return Math.max(1, Math.round(timeline.totalSec * fps));
}

export function stateAtFrame(frame: number, fps: number, timeline: IntroTimeline): IntroFrameState {
  const t = frame / fps;
  const blinkFrom = (from: number) => Math.floor((t - from) / CURSOR_HALF_PERIOD_SEC) % 2 === 0;

  // Earlier lines (typed, held, backspaced) play before the final line.
  const pre = timeline.preroll;
  if (pre.length > 0 && t >= timeline.leadInSec && t < (timeline.charTimesSec[0] ?? Infinity)) {
    const seg = pre.find((s) => t < s.endSec);
    if (!seg) {
      // The gap after the last deletion: empty prompt, solid cursor.
      return { phase: 'type', typedCount: 0, resolveT: 0, cursorVisible: true, text: '', lineText: pre[pre.length - 1].line };
    }
    const typed = seg.charTimesSec.filter((c) => c <= t).length;
    const deleted = seg.deleteTimesSec.filter((c) => c <= t).length;
    const holding = t >= seg.typeEndSec && t < seg.deleteTimesSec[0];
    return {
      phase: 'type',
      typedCount: 0,
      resolveT: 0,
      cursorVisible: holding ? blinkFrom(seg.typeEndSec) : true,
      text: seg.line.slice(0, Math.max(0, typed - deleted)),
      lineText: seg.line,
    };
  }

  let typedCount = 0;
  while (typedCount < timeline.charTimesSec.length && timeline.charTimesSec[typedCount] <= t) {
    typedCount++;
  }

  const phase: IntroPhase =
    t < timeline.leadInSec
      ? 'lead'
      : t < timeline.typeEndSec
        ? 'type'
        : t < timeline.resolveStartSec
          ? 'pause'
          : t < timeline.resolveEndSec
            ? 'resolve'
            : 'hold';

  const resolveT =
    phase === 'resolve' ? clamp01((t - timeline.resolveStartSec) / RESOLVE_SEC) : phase === 'hold' ? 1 : 0;

  // Blink while idle (lead-in and pause), solid while typing and resolving.
  const blink = (from: number) => Math.floor((t - from) / CURSOR_HALF_PERIOD_SEC) % 2 === 0;
  const cursorVisible =
    phase === 'type' || phase === 'resolve'
      ? true
      : phase === 'lead'
        ? blink(0)
        : phase === 'pause'
          ? blink(timeline.typeEndSec)
          : false;

  return { phase, typedCount, resolveT, cursorVisible };
}

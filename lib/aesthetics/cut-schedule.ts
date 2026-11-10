/**
 * lib/aesthetics/cut-schedule.ts — the cut-world's deterministic editing
 * plan. Ported from roughclip's `lib/composition/resolve-media-pool.ts`
 * (editing grammar → cut points) + `remotion/three/utils/imageCutSchedule.ts`
 * (shot lookup), EXTENDED for full-length songs: roughclip caps pools at
 * 9 items per 10–15 s clip (`MAX_CUT_WORLD_IMAGES`) and shows each item at
 * most once; wavecanvas songs run for minutes, so the pool CYCLES —
 *
 *   - the pool is re-shuffled per cycle with a seeded RNG (mulberry32;
 *     deterministic per render — same pool + grammar ⇒ identical schedule),
 *   - an item never repeats within NO_REPEAT_WINDOW (=3) shots of its last
 *     appearance when the pool is larger than the window,
 *   - every pool item is surfaced exactly once per cycle before the next
 *     cycle begins (each cycle is a full permutation; a final short cycle
 *     just takes the shuffle's prefix),
 *   - shot lengths come from the aesthetic editing grammar
 *     (`shotDurationBeats`, e.g. [2,4]) shortened in high-energy windows by
 *     `cutIntensity × meanIntensity(intensityCurve)`, with an even-spacing
 *     fallback when no beats exist and a 0.55 s minimum shot length,
 *   - shot lengths respond to the song's OWN energy range (quiet verses hold,
 *     choruses cut faster) and a cut always lands on each strong
 *     MusicTimeline impact — "cut on the drop",
 *   - each cut carries a transition from the grammar's palette, used
 *     sparingly: hard cuts by default, crossfades only between long shots,
 *     a rare flash, drops always hard (deterministic per-cut hash, no RNG
 *     draw, so transitions never change shot order); no palette = hard cuts,
 *   - videos interleave into the pool at ~1 in 4 items (seeded offset),
 *   - same crop/treatment per item on every appearance — the schedule only
 *     decides WHICH item shows when, never re-treats it.
 *
 * Also home to the cut-world's flash choreography: glitch/breakout event
 * envelopes fired at MusicTimeline impacts (a long-form simplification of
 * roughclip's `remotion/choreography/sceneChoreography.ts`, which plans one
 * payoff per 10–15 s clip; here the strongest few impacts get the breakout
 * envelope, scaled by impact strength).
 *
 * Pure module — no DOM, no three.js, no wall clock. Safe to import from
 * frame-context (planning) and the GL renderer (sampling) alike.
 */

// ─── Seeded RNG (roughclip lib/composition/rng.ts — mulberry32) ─────────────

/** Deterministic stream RNG. All cut-world randomness flows through this. */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pool seed: stable string hash (java-style, same shape as
 * lib/renderer/deterministic.ts's hashCode) over the ordered pool URLs +
 * editing grammar, so a pool edit produces a fresh but deterministic order.
 * There is no render-level seed prop today — the pool IS the seed.
 */
export function hashPoolSeed(parts: string[]): number {
  let hash = 0;
  const str = parts.join('');
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CutWorldPoolItem {
  url: string;
  kind: 'image' | 'video';
}

export type CutTransition = 'cut' | 'flash' | 'crossfade';

export interface CutWorldSchedule {
  /** Unique pool items in load order (textures are built once, in this order). */
  items: CutWorldPoolItem[];
  /** Ascending composition-relative cut times (seconds). */
  cutPointsSec: number[];
  /** Transition INTO the shot that starts at cutPointsSec[i]. Same length as
   *  cutPointsSec. All 'cut' when the grammar has no transition palette. */
  transitions: CutTransition[];
  /** True where cutPointsSec[i] is a drop (strong impact) cut — the only
   *  cuts that get the zoom punch. */
  dropCuts: boolean[];
  /**
   * Pool-item index shown per shot — shot i covers
   * [cutPointsSec[i-1] ?? 0, cutPointsSec[i] ?? duration). Length =
   * cutPointsSec.length + 1. Values index into `items`.
   */
  shotItems: number[];
  /** The seed the schedule was built from (diagnostics / golden dumps). */
  seed: number;
}

export interface CutWorldEditingGrammar {
  /** Shot length range in beats, e.g. [2, 4]. Default [2, 4]. */
  shotDurationBeats?: number[];
  /** 0–1: how strongly high-energy windows shorten shots. Default 0.5. */
  cutIntensity?: number;
  /** Transition palette between shots. Absent / empty / ['cut'] = hard cuts
   *  (the original cut-world behaviour). */
  transitions?: CutTransition[];
}

/** Impacts at least this strong (0–1) always get a cut on them. */
export const DROP_CUT_MIN_STRENGTH = 0.55;
/** Existing cuts this close to a drop are moved onto it (seconds). */
const DROP_SNAP_RADIUS_SEC = 0.6;

/** Never repeat an item within this many shots of its last appearance
 *  (when the pool is larger than the window). */
export const NO_REPEAT_WINDOW = 3;

/** Minimum shot length in seconds — cuts that would create a shorter shot
 *  are dropped. */
export const MIN_SHOT_SEC = 0.55;

/** Bounds WebGL texture memory for very large custom pools. */
export const MAX_CUT_WORLD_ITEMS = 24;

/** Roughly every 4th pool slot is a video when videos are available. */
const VIDEO_INTERVAL = 4;

// ─── Pool assembly ───────────────────────────────────────────────────────────

/**
 * Images in upload order with videos interleaved at ~1-in-4 pool slots
 * (seeded jitter over evenly spread positions; at least one video whenever
 * both kinds exist and there are 2+ images). The video list cycles if
 * shorter than the slot count. Duplicate URLs collapse to their first
 * occurrence so an item's treatment is stable.
 */
export function buildCutWorldPool(
  images: string[],
  videos: string[],
  rng: () => number,
): CutWorldPoolItem[] {
  const seen = new Set<string>();
  const uniqueImages = images.filter((u) => (seen.has(u) ? false : (seen.add(u), true)));
  const uniqueVideos = videos.filter((u) => (seen.has(u) ? false : (seen.add(u), true)));

  if (uniqueImages.length === 0) {
    return uniqueVideos.map((url) => ({ url, kind: 'video' as const }));
  }
  if (uniqueVideos.length === 0 || uniqueImages.length < 2) {
    return uniqueImages.map((url) => ({ url, kind: 'image' as const }));
  }

  // ~1 video per VIDEO_INTERVAL images, always ≥ 1.
  const slotCount = Math.max(1, Math.round(uniqueImages.length / VIDEO_INTERVAL));
  // Evenly spread image indices with seeded jitter — a video is inserted
  // BEFORE the marked image.
  const positions = new Set<number>();
  for (let k = 0; k < slotCount; k++) {
    const base = ((k + 0.5) / slotCount) * uniqueImages.length;
    const jitter = (rng() - 0.5) * (uniqueImages.length / slotCount) * 0.5;
    positions.add(
      Math.min(uniqueImages.length - 1, Math.max(0, Math.round(base + jitter))),
    );
  }

  const out: CutWorldPoolItem[] = [];
  let videoIdx = 0;
  uniqueImages.forEach((url, i) => {
    if (positions.has(i)) {
      out.push({ url: uniqueVideos[videoIdx % uniqueVideos.length], kind: 'video' });
      videoIdx++;
    }
    out.push({ url, kind: 'image' });
  });
  return out.slice(0, MAX_CUT_WORLD_ITEMS);
}

// ─── Cut points (roughclip resolve-media-pool.ts:63–198, extended) ───────────

/** Mean intensity (0–1) of the curve between two composition-relative times.
 *  Index i maps to time (i / (len−1)) × windowSec. */
export function meanIntensity(
  curve: number[] | null | undefined,
  windowSec: number,
  from: number,
  to: number,
): number {
  if (!curve || curve.length < 2 || to <= from) return 0.5;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < curve.length; i++) {
    const t = (i / (curve.length - 1)) * windowSec;
    if (t >= from && t < to) {
      sum += curve[i];
      count++;
    }
  }
  return count > 0 ? sum / count : 0.5;
}

/**
 * Beat-driven cut points: walk the beat grid, emitting a cut when the
 * current shot reaches its target length. The target slides between
 * minBeats and maxBeats according to the local mean intensity scaled by
 * cutIntensity (high energy → shorter shots). Falls back to even spacing
 * when no beats exist.
 */
export function buildCutPoints(opts: {
  windowSec: number;
  beats: number[];
  bpm?: number | null;
  intensityCurve?: number[] | null;
  grammar?: CutWorldEditingGrammar;
}): number[] {
  const { windowSec, intensityCurve } = opts;
  if (!(windowSec > 0)) return [];
  const beats = opts.beats
    .filter((b) => Number.isFinite(b) && b > 0 && b < windowSec)
    .sort((a, b) => a - b);
  const shotBeats =
    opts.grammar?.shotDurationBeats && opts.grammar.shotDurationBeats.length > 0
      ? opts.grammar.shotDurationBeats
      : [2, 4];
  const [minBeats, maxBeats] =
    shotBeats.length > 1 ? [Math.min(...shotBeats), Math.max(...shotBeats)] : [shotBeats[0], shotBeats[0]];
  const bpm = opts.bpm ?? 120;
  const beatSec = 60 / bpm;
  const cutIntensity = opts.grammar?.cutIntensity ?? 0.5;

  // Energy relative to the song's own range (10th–90th percentile), so a
  // quiet master still gets long verse shots and fast chorus cuts.
  const [eLo, eHi] = (() => {
    if (!intensityCurve || intensityCurve.length < 4) return [0, 1];
    const sorted = [...intensityCurve].filter(Number.isFinite).sort((a, b) => a - b);
    const lo = sorted[Math.floor(sorted.length * 0.1)] ?? 0;
    const hi = sorted[Math.floor(sorted.length * 0.9)] ?? 1;
    return hi - lo > 0.05 ? [lo, hi] : [0, 1];
  })();
  const relative = (e: number) => Math.min(1, Math.max(0, (e - eLo) / (eHi - eLo)));

  const cutPoints: number[] = [];
  if (beats.length > 0) {
    let shotStart = 0;
    for (const beat of beats) {
      const energy = relative(meanIntensity(intensityCurve, windowSec, shotStart, beat));
      const span = maxBeats - (maxBeats - minBeats) * Math.min(1, energy * cutIntensity * 2);
      const target = Math.max(1, Math.round(span)) * beatSec;
      if (beat - shotStart >= target - 0.05) {
        cutPoints.push(beat);
        shotStart = beat;
      }
    }
  } else {
    const target = Math.max(1, Math.round((minBeats + maxBeats) / 2)) * beatSec;
    for (let t = target; t < windowSec - 0.05; t += target) {
      cutPoints.push(t);
    }
  }
  return cutPoints.filter((t) => t > 0 && t < windowSec - 0.05);
}

/**
 * Long-form gap-filling + floor enforcement:
 *   1. Drop cuts that would produce a shot shorter than MIN_SHOT_SEC.
 *   2. If fewer shots than pool items remain, fill the largest gaps first
 *      (beat rhythm preserved where it exists) until every pool item can
 *      surface once before the cycle repeats.
 */
export function finalizeCutPoints(
  cutPoints: number[],
  windowSec: number,
  poolSize: number,
): number[] {
  if (!(windowSec > 0)) return [];

  // 1. Min shot length — greedy walk, keep a cut only if it respects the
  // floor against the previous kept boundary.
  const sorted = [...cutPoints].sort((a, b) => a - b);
  const kept: number[] = [];
  let prev = 0;
  for (const cut of sorted) {
    if (cut - prev >= MIN_SHOT_SEC && windowSec - cut >= MIN_SHOT_SEC * 0.5) {
      kept.push(cut);
      prev = cut;
    }
  }

  // 2. Gap-fill so shots (cuts + 1) cover the pool once.
  if (poolSize > 0) {
    const maxCuts = Math.max(0, Math.floor(windowSec / MIN_SHOT_SEC) - 1);
    const cutsNeeded = Math.min(poolSize, maxCuts + 1) - 1; // shots = cuts + 1
    if (kept.length === 0 && cutsNeeded > 0 && windowSec > 0.2) {
      // No beat cuts at all — even spacing.
      for (let i = 1; i <= cutsNeeded; i++) {
        const t = (i * windowSec) / (cutsNeeded + 1);
        if (t > 0.05 && t < windowSec - 0.05) kept.push(t);
      }
      if (kept.length === 0 && windowSec > MIN_SHOT_SEC * 2) {
        kept.push(windowSec / 2);
      }
    } else {
      // Fill the largest gaps (including the song edges) until every pool
      // item can appear once.
      while (kept.length < cutsNeeded) {
        let bestGap = 0;
        let bestInsert = windowSec / 2;
        let gapStart = 0;
        for (const cut of kept) {
          const gap = cut - gapStart;
          if (gap > bestGap) {
            bestGap = gap;
            bestInsert = gapStart + gap / 2;
          }
          gapStart = cut;
        }
        const finalGap = windowSec - gapStart;
        if (finalGap > bestGap) {
          bestGap = finalGap;
          bestInsert = gapStart + finalGap / 2;
        }
        if (bestGap < MIN_SHOT_SEC * 2) break;
        kept.push(bestInsert);
        kept.sort((a, b) => a - b);
      }
    }
  }
  return kept;
}

/**
 * Cut on the drop: every strong impact gets a cut exactly on it. Cuts within
 * DROP_SNAP_RADIUS_SEC of a drop are removed first so the drop never creates
 * a sliver shot. Returns the merged cuts and the drop times that survived.
 */
export function addDropCuts(
  cutPoints: number[],
  impacts: { time: number; strength: number }[] | null | undefined,
  windowSec: number,
): { cuts: number[]; drops: number[] } {
  const drops = (impacts ?? [])
    .filter((im) => Number.isFinite(im.time) && im.strength >= DROP_CUT_MIN_STRENGTH)
    .map((im) => im.time)
    .filter((t) => t > MIN_SHOT_SEC && t < windowSec - MIN_SHOT_SEC)
    .sort((a, b) => a - b);
  if (drops.length === 0) return { cuts: cutPoints, drops: [] };
  const kept = cutPoints.filter((c) => !drops.some((d) => Math.abs(c - d) < DROP_SNAP_RADIUS_SEC));
  // Drops closer together than a minimum shot collapse to the first.
  const spaced: number[] = [];
  for (const d of drops) {
    if (spaced.length === 0 || d - spaced[spaced.length - 1] >= MIN_SHOT_SEC * 2) spaced.push(d);
  }
  return { cuts: [...kept, ...spaced].sort((a, b) => a - b), drops: spaced };
}

/** Crossfades only between unhurried shots (both sides at least this long). */
const CROSSFADE_MIN_SHOT_SEC = 2.5;
/** At most ~1 in 10 cuts flashes; never next to a drop. */
const FLASH_RATE = 0.1;

/**
 * Transition per cut. Restraint is the point — constant effects read as a
 * template, so hard cuts carry the edit and the palette is used sparingly:
 *   - drop cuts are hard cuts (the impact breakout already punctuates them),
 *   - crossfade only where BOTH neighbouring shots are long (slow aesthetics
 *     dissolve; fast-cutting ones never do),
 *   - flash on ~1 in 10 of the remaining cuts, chosen by a per-cut hash,
 *   - everything else is a hard cut.
 * Deterministic (hash of the schedule seed, no RNG draw).
 */
export function assignTransitions(
  cutPointsSec: number[],
  palette: CutTransition[] | undefined,
  seed: number,
  drops: number[],
  windowSec: number,
): CutTransition[] {
  const pal = (palette ?? []).filter((t) => t === 'cut' || t === 'flash' || t === 'crossfade');
  if (pal.length === 0 || pal.every((t) => t === 'cut')) return cutPointsSec.map(() => 'cut');
  const nearDrop = (t: number, r: number) => drops.some((d) => Math.abs(d - t) < r);
  return cutPointsSec.map((t, i) => {
    if (nearDrop(t, 0.01)) return 'cut';
    const prevLen = t - (cutPointsSec[i - 1] ?? 0);
    const nextLen = (cutPointsSec[i + 1] ?? windowSec) - t;
    if (pal.includes('crossfade') && prevLen >= CROSSFADE_MIN_SHOT_SEC && nextLen >= CROSSFADE_MIN_SHOT_SEC) {
      return 'crossfade';
    }
    if (pal.includes('flash') && !nearDrop(t, 4) && cutHash(seed * 0.37 + i * 13.1) < FLASH_RATE) {
      return 'flash';
    }
    return 'cut';
  });
}

// ─── Shot order (the long-form cycling — new vs roughclip) ───────────────────

/**
 * Pool-item index per shot. Each cycle is a full seeded permutation of the
 * pool (every item surfaces before any repeat); an item is never placed
 * within NO_REPEAT_WINDOW shots of its previous appearance when
 * poolSize > NO_REPEAT_WINDOW (smaller pools just avoid immediate repeats).
 * Generated greedily per shot from the cycle's remaining set, so a final
 * partial cycle simply surfaces that shuffle's prefix.
 */
export function buildShotOrder(
  shotCount: number,
  poolSize: number,
  rng: () => number,
): number[] {
  if (shotCount <= 0 || poolSize <= 0) return [];
  if (poolSize === 1) return new Array(shotCount).fill(0);

  const window = poolSize > NO_REPEAT_WINDOW ? NO_REPEAT_WINDOW : 1;
  const out: number[] = [];
  let remaining: number[] = [];

  for (let shot = 0; shot < shotCount; shot++) {
    if (remaining.length === 0) {
      // New cycle: seeded Fisher–Yates over the whole pool.
      remaining = Array.from({ length: poolSize }, (_, i) => i);
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
    }
    const recent = new Set(out.slice(Math.max(0, out.length - window)));
    let candidates = remaining.filter((item) => !recent.has(item));
    if (candidates.length === 0) candidates = remaining; // pool too small — relax
    const picked = candidates[Math.floor(rng() * candidates.length)];
    remaining.splice(remaining.indexOf(picked), 1);
    out.push(picked);
  }
  return out;
}

// ─── Top-level schedule ──────────────────────────────────────────────────────

export function buildCutWorldSchedule(opts: {
  images: string[];
  videos?: string[];
  /** Composition-length seconds the schedule spans (full-song timeline). */
  durationSec: number;
  /** Composition-relative beat timestamps (seconds). */
  beats?: number[];
  bpm?: number | null;
  intensityCurve?: number[] | null;
  grammar?: CutWorldEditingGrammar;
  /** MusicTimeline impacts (composition-relative) — strong ones get a cut. */
  impacts?: { time: number; strength: number }[] | null;
  /** Override the pool-hash seed (tests / future render-seed prop). */
  seed?: number;
}): CutWorldSchedule {
  const grammar = opts.grammar ?? {};
  const seed =
    opts.seed ??
    hashPoolSeed([
      ...opts.images,
      ...(opts.videos ?? []),
      (grammar.shotDurationBeats ?? [2, 4]).join(','),
      String(grammar.cutIntensity ?? 0.5),
    ]);
  const rng = createRng(seed);

  const items = buildCutWorldPool(opts.images, opts.videos ?? [], rng);
  const rawCuts = buildCutPoints({
    windowSec: opts.durationSec,
    beats: opts.beats ?? [],
    bpm: opts.bpm,
    intensityCurve: opts.intensityCurve,
    grammar,
  });
  const { cuts: withDrops, drops } = addDropCuts(rawCuts, opts.impacts, opts.durationSec);
  const cutPointsSec = finalizeCutPoints(withDrops, opts.durationSec, items.length);
  const shotItems = buildShotOrder(cutPointsSec.length + 1, items.length, rng);
  const transitions = assignTransitions(cutPointsSec, grammar.transitions, seed, drops, opts.durationSec);
  const dropCuts = cutPointsSec.map((t) => drops.some((d) => Math.abs(d - t) < 0.01));

  return { items, shotItems, cutPointsSec, transitions, dropCuts, seed };
}

// ─── Per-frame lookup (roughclip imageCutSchedule.ts, shot-based) ────────────

/** Which shot (0-based segment index) contains composition time `tSec`. */
export function shotIndexAtTime(tSec: number, cutPointsSec: number[]): number {
  let interval = 0;
  for (const c of cutPointsSec) {
    if (tSec >= c) interval++;
    else break;
  }
  return interval;
}

/** Pool-item index shown at composition time `tSec`. */
export function poolItemAtTime(schedule: CutWorldSchedule, tSec: number): number {
  if (schedule.items.length <= 1) return 0;
  const shot = shotIndexAtTime(tSec, schedule.cutPointsSec);
  return schedule.shotItems[shot] ?? 0;
}

/** Start time (seconds) of the shot containing `tSec`. */
export function shotStartAtTime(schedule: CutWorldSchedule, tSec: number): number {
  const shot = shotIndexAtTime(tSec, schedule.cutPointsSec);
  return shot === 0 ? 0 : (schedule.cutPointsSec[shot - 1] ?? 0);
}

// ─── Flash choreography (roughclip sceneChoreography.ts, long-form) ──────────

/**
 * One breakout event per MusicTimeline impact. Where roughclip plans a
 * single payoff per 10–15 s clip (personality system + moment selection),
 * the long-form cut world punctuates EVERY impact, scaled by its strength.
 */
export interface CutWorldChoreoEvent {
  startTime: number;
  /** Event strength 0–1 (impact strength, floored so weak hits still read). */
  strength: number;
}

export interface CutWorldChoreoFrame {
  /** 0–1 event envelope for the shader's uGlitchEvent. */
  glitch: number;
  /** 0–1 breakout envelope — the focal zone tears open to full frame. */
  breakout: number;
  breakoutTop: number;
  breakoutBottom: number;
  /** Motion-blur spike while the zone boundary travels. */
  motionBlur: number;
  /** Overshoot zoom punch on arrival (1 at rest). */
  breakoutZoom: number;
  /** Additive grade-gain flash on arrival. */
  gradeGainDelta: number;
}

/** roughclip BREAKOUT_EVENT (sceneChoreography.ts:123–130) — verbatim. */
const BREAKOUT_DURATION = 0.55;
const BREAKOUT_ATTACK = 0.13;
const BREAKOUT_DECAY = 0.1;
/** How far ahead the top edge leads the bottom (directional tear). */
const BREAKOUT_TOP_LEAD_SEC = 0.045;
/** Events closer than this are merged (keep the stronger). */
const MIN_EVENT_GAP_SEC = 0.6;
/** Breakouts per song — reserved for the biggest moments. */
const MAX_BREAKOUTS = 3;
const BREAKOUT_MIN_SPACING_SEC = 30;

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** Breakout envelope — attack ease-out cubic, hold, decay ease-in quad
 *  (roughclip breakoutShape, sceneChoreography.ts:165–175). */
function breakoutShape(x: number): number {
  if (x < 0 || x > BREAKOUT_DURATION) return 0;
  const holdEnd = BREAKOUT_DURATION - BREAKOUT_DECAY;
  if (x < BREAKOUT_ATTACK) {
    const k = x / BREAKOUT_ATTACK;
    return 1 - Math.pow(1 - k, 3);
  }
  if (x <= holdEnd) return 1;
  const k = clamp01((x - holdEnd) / BREAKOUT_DECAY);
  return 1 - k * k;
}

/**
 * Build the event list from MusicTimeline impacts: sorted, merged when
 * overlapping, strength floored at 0.4 so quiet hits still punctuate.
 * `impacts` are composition-relative seconds (scene-director.ts treats them
 * the same way).
 */
export function buildCutWorldChoreo(
  impacts: { time: number; strength: number }[] | null | undefined,
  durationSec: number,
): CutWorldChoreoEvent[] {
  if (!impacts || impacts.length === 0 || !(durationSec > 0)) return [];
  const sorted = impacts
    .filter((im) => Number.isFinite(im.time) && im.time >= 0 && im.time < durationSec)
    .map((im) => ({ time: im.time, strength: clamp01(im.strength) }))
    .sort((a, b) => a.time - b.time);
  const events: CutWorldChoreoEvent[] = [];
  for (const im of sorted) {
    const startTime = im.time + 0.06; // roughclip: breakout lands just after the moment
    const last = events[events.length - 1];
    if (last && startTime - last.startTime < MIN_EVENT_GAP_SEC) {
      last.strength = Math.max(last.strength, im.strength);
      continue;
    }
    events.push({ startTime, strength: Math.max(0.4, im.strength) });
  }
  // Only the song's biggest moments get the breakout — on every impact it
  // read as a gimmick. Strongest first, at least BREAKOUT_MIN_SPACING_SEC
  // apart, at most MAX_BREAKOUTS, back in time order.
  const picked: CutWorldChoreoEvent[] = [];
  for (const ev of [...events].sort((a, b) => b.strength - a.strength)) {
    if (picked.length >= MAX_BREAKOUTS) break;
    if (picked.some((p) => Math.abs(p.startTime - ev.startTime) < BREAKOUT_MIN_SPACING_SEC)) continue;
    picked.push(ev);
  }
  return picked.sort((a, b) => a.startTime - b.startTime);
}

/** Pure per-frame sample of the flash choreography. */
export function sampleCutWorldChoreo(
  events: CutWorldChoreoEvent[] | null,
  tSec: number,
): CutWorldChoreoFrame {  const frame: CutWorldChoreoFrame = {
    glitch: 0,
    breakout: 0,
    breakoutTop: 0,
    breakoutBottom: 0,
    motionBlur: 0,
    breakoutZoom: 1,
    gradeGainDelta: 0,
  };
  if (!events || events.length === 0) return frame;

  let breakoutX = -1;
  for (const ev of events) {
    const x = tSec - ev.startTime;
    const b = breakoutShape(x) * ev.strength;
    if (b <= 0) continue;
    if (b > frame.breakout) breakoutX = x;
    frame.breakout = Math.max(frame.breakout, b);
    frame.breakoutTop = Math.max(
      frame.breakoutTop,
      breakoutShape(x + BREAKOUT_TOP_LEAD_SEC) * ev.strength,
    );
    frame.breakoutBottom = Math.max(frame.breakoutBottom, b);
  }

  // RGB glitch rides the breakout only (roughclip: never a standalone event).
  frame.glitch = Math.min(1, frame.breakout * 1.25);

  // Edge motion: 0 settled, 1 mid-flight → motion-blur spike + edge wobble.
  const edgeMotion = 4 * frame.breakout * (1 - frame.breakout);
  frame.motionBlur = edgeMotion * 0.22;

  // Overshoot zoom punch + grade flash just after the explosive arrival.
  if (breakoutX >= 0) {
    const sinceArrival = breakoutX - BREAKOUT_ATTACK;
    if (sinceArrival >= 0) {
      frame.breakoutZoom = 1 + 0.075 * Math.exp(-5 * sinceArrival);
      frame.gradeGainDelta = 0.05 * Math.exp(-4 * sinceArrival);
    }
  }
  return frame;
}

// ─── Per-cut punch (the long-form "jump") ────────────────────────────────────
//
// Roughclip's zoom punch (uBreakoutZoom) only fires on choreography
// breakouts — the opening yo-yo and the (guaranteed) payoff — never per
// cut; over a 10–15 s clip that's dense enough to read as constant rhythm.
// A punch on every shot start read as cheesy over a full-length song, so
// the punch fires only on DROP cuts (schedule.dropCuts): a small fast-attack
// / exponential-decay zoom on the focal zone, seeded per cut, scaled by the
// aesthetic's cutIntensity and the shot's local energy. Ordinary cuts stay
// still — the hard cut itself is the rhythm.

/** Attack/decay of the per-cut punch (seconds). Peak lands ~76 ms in. */
const CUT_PUNCH_ATTACK_SEC = 0.045;
const CUT_PUNCH_DECAY_SEC = 0.2;
/** Peak value of the unnormalised shape (so the normalised peak is 1). */
const CUT_PUNCH_SHAPE_PEAK = 0.557;
/** Envelope is dead beyond this many seconds after a cut. */
const CUT_PUNCH_DEAD_SEC = 1.2;

/** Deterministic per-cut jitter in [0, 1) — same hash as the shaders. */
function cutHash(n: number): number {
  const s = Math.sin(n) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Zoom factor (≥ 1) for the focal zone at composition time `tSec` from the
 * per-cut punch alone. Shot starts include t=0, so the video opens with a
 * punch-in. Combine with the breakout zoom as max(...) — the renderer does.
 */
export function cutPunchZoomAt(
  tSec: number,
  cutPointsSec: number[],
  opts: {
    /** aestheticEditing.cutIntensity (0–1) — scales punch strength. */
    cutIntensity: number;
    intensityCurve?: number[] | null;
    /** Composition-length seconds (for intensity-curve sampling). */
    windowSec: number;
    /** Schedule seed — per-cut strength jitter derives from it. */
    seed: number;
    /** schedule.dropCuts — when given, ONLY drop cuts punch (no punch at
     *  t=0 or on ordinary cuts; a punch on every cut reads as cheesy). */
    dropCuts?: boolean[];
  },
): number {
  // Most recent shot start (t=0 is shot 0's start — the opening punch).
  let shotStart = 0;
  let cutIndex = 0;
  for (let i = 0; i < cutPointsSec.length; i++) {
    if (tSec >= cutPointsSec[i]) {
      shotStart = cutPointsSec[i];
      cutIndex = i + 1;
    } else break;
  }
  const x = tSec - shotStart;
  if (x < 0 || x > CUT_PUNCH_DEAD_SEC) return 1;
  if (opts.dropCuts && (cutIndex === 0 || !opts.dropCuts[cutIndex - 1])) return 1;

  const shape =
    ((1 - Math.exp(-x / CUT_PUNCH_ATTACK_SEC)) * Math.exp(-x / CUT_PUNCH_DECAY_SEC)) /
    CUT_PUNCH_SHAPE_PEAK;
  // Seeded ±25% per-cut strength jitter — punches vary, never vanish.
  const jitter = 0.75 + 0.5 * cutHash(opts.seed * 0.13 + cutIndex * 91.7);
  // Louder shots punch harder (0.7–1.3×); cutIntensity sets the base reach
  // (≈1.5% zoom at 0, ≈5% at 1 before jitter/energy).
  const energy = meanIntensity(
    opts.intensityCurve,
    opts.windowSec,
    shotStart,
    Math.min(opts.windowSec, shotStart + CUT_PUNCH_DEAD_SEC),
  );
  const peak =
    (0.01 + 0.02 * Math.min(1, Math.max(0, opts.cutIntensity))) *
    jitter *
    (0.7 + 0.6 * energy);
  return 1 + peak * shape;
}

// ─── Transitions (per-frame sample) ──────────────────────────────────────────

/** Crossfade length cap (seconds); also capped to 40% of the incoming shot. */
const CROSSFADE_SEC = 0.45;
/** Flash attack-free decay time constant (seconds). */
const FLASH_DECAY_SEC = 0.07;
const FLASH_DEAD_SEC = 0.35;

export interface CutTransitionFrame {
  /** 0–1 weight of the PREVIOUS shot (crossfade); 0 = only the current shot. */
  crossfade: number;
  /** Pool-item index of the previous shot (valid when crossfade > 0). */
  prevItem: number;
  /** Additive grade-gain flash (0 = none). */
  flashGain: number;
}

/** Pure per-frame sample of the transition into the current shot. */
export function sampleCutTransition(schedule: CutWorldSchedule, tSec: number): CutTransitionFrame {
  const out: CutTransitionFrame = { crossfade: 0, prevItem: 0, flashGain: 0 };
  const shot = shotIndexAtTime(tSec, schedule.cutPointsSec);
  if (shot === 0) return out;
  const kind = schedule.transitions?.[shot - 1] ?? 'cut';
  if (kind === 'cut') return out;
  const start = schedule.cutPointsSec[shot - 1];
  const x = tSec - start;
  if (kind === 'flash') {
    if (x >= 0 && x < FLASH_DEAD_SEC) out.flashGain = 0.18 * Math.exp(-x / FLASH_DECAY_SEC);
    return out;
  }
  const end = schedule.cutPointsSec[shot] ?? start + CROSSFADE_SEC * 3;
  const dur = Math.min(CROSSFADE_SEC, (end - start) * 0.4);
  if (dur > 0 && x >= 0 && x < dur) {
    const k = x / dur;
    out.crossfade = 1 - k * k * (3 - 2 * k); // smoothstep out
    out.prevItem = schedule.shotItems[shot - 1] ?? 0;
  }
  return out;
}

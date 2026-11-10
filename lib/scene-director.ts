/**
 * scene-director
 *
 * Music-aware choreography for the depth-gallery background.
 *
 * Given a `MusicTimeline` (sections, beats, impacts, emotional curve) and the
 * target render duration, this module produces a per-frame "DirectorTrack"
 * that the renderer can sample cheaply at runtime.
 *
 * Phase 1 scope: ONLY velocity warping.
 *   The depth gallery normally drives its camera through depth via a constant
 *   cosine sweep — `phase = rawProgress * passes * π`.  We replace
 *   `rawProgress` (linear time) with `warpedProgress` — a cumulative integral
 *   of music-driven velocity — so the camera lingers in calm sections and
 *   accelerates through high-energy ones, while still completing exactly the
 *   same total number of front→back→front passes over the video duration.
 *
 * Future phases will add cut scheduling, breath/blob mood, beat nudges,
 * transition variety, and vocal-density focus.  All consumed via the same
 * DirectorTrack handed back from `buildDirectorTrack`.
 */

import type { MusicTimeline, SectionSegment, EmotionPoint, VocalDensityPoint } from './audio-analysis';

// ─── Public types ──────────────────────────────────────────────────────────

export interface DirectorTrack {
  /** Per-frame camera-velocity multiplier (≈0.3 calm … ≈1.6 high-energy). */
  velocity: Float32Array;
  /**
   * Per-frame normalised progress through the song, **warped by velocity**.
   * Always 0 at frame 0 and exactly 1 at the final frame.  Replaces the
   * usual `frame / lastFrame` in the depth-gallery's `sampleCameraZ`.
   */
  warpedProgress: Float32Array;
  /**
   * Per-frame ADDITIVE phase offset (radians) layered on the cosine sweep.
   * Gaussian bumps peaking at +2π at qualifying section boundaries: the
   * camera blinks through one full extra front→back→front pass, then lands
   * back on its natural position. Gated by overall track intensity, so it
   * only fires on energetic tracks.
   */
  ghostPhase: Float32Array;
}

// ─── Tunables ──────────────────────────────────────────────────────────────

/** Calm sections drift this slowly relative to nominal speed. */
const MIN_VELOCITY = 0.15;
/** Peak euphoric/chorus sections sweep this fast relative to nominal. */
const MAX_VELOCITY = 2.4;
/** Section energy weight vs. emotional-arousal weight in the velocity blend. */
const SECTION_ENERGY_WEIGHT = 0.6;
const AROUSAL_WEIGHT = 0.4;
/** Velocity is low-pass filtered over this window so section boundaries don't jolt. */
const VELOCITY_SMOOTH_SECONDS = 1.0;

// ─── Phase 2: beat-sync impulses (impacts) ─────────────────────────────────
// Sharp transient bumps on velocity at drop/hit/lift moments, brief dip on
// breakdowns.  Bumps are Gaussian-shaped so the camera "kicks" cleanly.
// All amplitudes are added on top of the smoothed baseline; total passes
// across the song are still preserved by the warpedProgress normalisation.

interface ImpulseShape {
  /** Peak additive velocity at the impact frame (before strength scaling). */
  amp: number;
  /** Gaussian standard deviation in seconds. Smaller → sharper kick. */
  sigmaSeconds: number;
}

const IMPULSE_BY_TYPE: Record<'drop' | 'hit' | 'lift' | 'breakdown', ImpulseShape> = {
  drop: { amp: 4.0, sigmaSeconds: 0.10 },
  hit: { amp: 2.2, sigmaSeconds: 0.07 },
  lift: { amp: 1.4, sigmaSeconds: 0.18 },
  breakdown: { amp: -0.6, sigmaSeconds: 0.25 },
};

// Impulses scale by an overall "track intensity" gain so chill / ballad tracks
// don't get jolted by speed bursts. Computed once from mean section energy.
// 0 below LOW threshold, 1 above HIGH, smoothstep in between.
const IMPULSE_GAIN_LOW = 0.35;
const IMPULSE_GAIN_HIGH = 0.70;

function computeTrackIntensityGain(sections: SectionSegment[] | undefined): number {
  if (!sections || sections.length === 0) return 1;
  let sum = 0;
  let n = 0;
  for (const s of sections) {
    if (typeof s.energy === 'number') {
      sum += s.energy;
      n++;
    }
  }
  if (n === 0) return 1;
  const mean = sum / n;
  const span = IMPULSE_GAIN_HIGH - IMPULSE_GAIN_LOW;
  if (span <= 0) return mean >= IMPULSE_GAIN_HIGH ? 1 : 0;
  const x = (mean - IMPULSE_GAIN_LOW) / span;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x * x * (3 - 2 * x);
}

/** Velocity is clamped to this floor/ceiling AFTER impulses are layered in. */
const VELOCITY_FLOOR = 0.05;
const VELOCITY_CEILING = 4.0;

// ─── Phase 4: vocal-density hold ───────────────────────────────────────────
// Heavy vocal stretches → camera lingers (hero shot for the singer).
// Instrumental breaks → camera sweeps slightly faster.
// Applied multiplicatively to the baseline velocity BEFORE smoothing, so
// section ramps absorb the modulation cleanly.

/** Multiplier applied to baseline velocity when vocalDensity ≈ 1 (full vocals). */
const VOCAL_HOLD_FACTOR = 0.55;
/** Multiplier applied to baseline velocity when vocalDensity ≈ 0 (instrumental). */
const VOCAL_SWEEP_FACTOR = 1.15;

// ─── Phase 6: anticipation ramps ───────────────────────────────────────────
// When the upcoming section has significantly higher energy than the current
// one (verse → chorus, pre-chorus → drop), ramp the camera velocity up over
// the bars leading INTO the boundary. The camera "winds up" before the drop
// instead of jumping at it — classic cinematic move.

/** Minimum energy jump (next - current) required to trigger an anticipation ramp. */
const ANTICIPATION_MIN_DELTA = 0.18;
/** How many seconds before the boundary the ramp starts (covers ~4 bars at 133 bpm). */
const ANTICIPATION_WINDOW_SECONDS = 7.0;
/** Peak additive velocity at the boundary frame, scaled by energy delta (clamped). */
const ANTICIPATION_PEAK = 1.8;

// ─── Phase 7: ghost-pass blink on big section changes ───────────────────────
// At significant section transitions in energetic tracks, briefly add a
// Gaussian bump of +2π to the camera phase. Camera flies through one full
// extra pass of the tunnel and snaps back. Gated by track-intensity gain.// Disabled by default — flip GHOST_PASS_ENABLED to re-enable.
const GHOST_PASS_ENABLED = false;const GHOST_PEAK_PHASE = Math.PI * 2; // one full front→back→front round-trip
const GHOST_SIGMA_SECONDS = 0.18;
/** Minimum |energyDelta| between adjacent sections to fire a ghost pass. */
const GHOST_MIN_ENERGY_DELTA = 0.10;

// ─── Phase 3: bar-snapped cuts ─────────────────────────────────────────────
// The depth gallery's cosine sweep reaches a front/back endpoint every
// `passes` half-cycles — those endpoints are exactly when a new image becomes
// visible.  We post-process `warpedProgress` so each interior boundary time
// lands on a bar (downbeat).  Total passes are preserved; only boundary
// timing is snapped, so image swaps arrive on the beat.

/** Minimum seconds between adjacent snapped boundaries (collapse-guard). */
const MIN_BOUNDARY_GAP_SECONDS = 0.6;
/** Hard cap on how far we'll move a boundary from its natural position. */
const MAX_BOUNDARY_SNAP_SECONDS = 4.0;

// ─── Sampling helpers ──────────────────────────────────────────────────────

function findSectionAt(sections: SectionSegment[], t: number): SectionSegment | null {
  if (!sections || sections.length === 0) return null;
  // Sections are non-overlapping and ordered — linear scan is fine
  // (typical track has <20 sections).
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (t >= s.start && t < s.end) return s;
  }
  // Past the last section's end → fall back to last.
  return sections[sections.length - 1];
}

function findEmotionAt(emo: EmotionPoint[], t: number): EmotionPoint | null {
  if (!emo || emo.length === 0) return null;
  // Buckets are ~2 s, but spacing may vary at the tail — use the closest
  // bucket whose time ≤ t.
  let lo = 0;
  let hi = emo.length - 1;
  if (t <= emo[0].time) return emo[0];
  if (t >= emo[hi].time) return emo[hi];
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (emo[mid].time <= t) lo = mid;
    else hi = mid;
  }
  // Pick the nearer of lo/hi.
  return t - emo[lo].time <= emo[hi].time - t ? emo[lo] : emo[hi];
}

/** Linear interpolation between adjacent VocalDensityPoints (buckets ~0.5 s). */
function sampleVocalDensityAt(vd: VocalDensityPoint[], t: number): number {
  if (!vd || vd.length === 0) return 0;
  if (t <= vd[0].time) return vd[0].density;
  if (t >= vd[vd.length - 1].time) return vd[vd.length - 1].density;
  let lo = 0;
  let hi = vd.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (vd[mid].time <= t) lo = mid;
    else hi = mid;
  }
  const span = vd[hi].time - vd[lo].time;
  if (span <= 0) return vd[lo].density;
  const a = (t - vd[lo].time) / span;
  return vd[lo].density * (1 - a) + vd[hi].density * a;
}

/** Map blended 0–1 energy to a camera-velocity multiplier. */
function energyToVelocity(energy01: number): number {
  const clamped = Math.max(0, Math.min(1, energy01));
  return MIN_VELOCITY + clamped * (MAX_VELOCITY - MIN_VELOCITY);
}

/** Box-filter low-pass over a Float32Array; radius is half the window. */
function smoothInPlace(arr: Float32Array, radius: number): void {
  if (radius < 1 || arr.length === 0) return;
  const n = arr.length;
  // Running-sum sweep for O(n)
  const out = new Float32Array(n);
  let sum = 0;
  // Prime initial window
  const initEnd = Math.min(n - 1, radius);
  for (let i = 0; i <= initEnd; i++) sum += arr[i];
  let windowLo = 0;
  let windowHi = initEnd;
  for (let i = 0; i < n; i++) {
    const desiredLo = Math.max(0, i - radius);
    const desiredHi = Math.min(n - 1, i + radius);
    while (windowHi < desiredHi) {
      windowHi++;
      sum += arr[windowHi];
    }
    while (windowLo < desiredLo) {
      sum -= arr[windowLo];
      windowLo++;
    }
    out[i] = sum / (windowHi - windowLo + 1);
  }
  arr.set(out);
}

/**
 * Inverse-lookup: given a monotonic non-decreasing array `wp` of length n
 * mapping frame→progress, return the fractional frame at which wp == target.
 */
function inverseLookup(wp: Float32Array, target: number): number {
  const n = wp.length;
  if (n === 0) return 0;
  if (target <= wp[0]) return 0;
  if (target >= wp[n - 1]) return n - 1;
  let lo = 0;
  let hi = n - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (wp[mid] <= target) lo = mid;
    else hi = mid;
  }
  const span = wp[hi] - wp[lo];
  if (span <= 0) return lo;
  return lo + (target - wp[lo]) / span;
}

/** Nearest value in a sorted array; returns the value (not the index). */
function nearestInSorted(sorted: number[], target: number): number {
  if (sorted.length === 0) return target;
  if (target <= sorted[0]) return sorted[0];
  if (target >= sorted[sorted.length - 1]) return sorted[sorted.length - 1];
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= target) lo = mid;
    else hi = mid;
  }
  return target - sorted[lo] <= sorted[hi] - target ? sorted[lo] : sorted[hi];
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Build a per-frame DirectorTrack from a MusicTimeline.
 * Returns `null` when there isn't enough data to drive the camera (no
 * timeline, no frames, or no sections).  Callers should fall back to the
 * unwarped linear-progress behaviour in that case.
 */
export function buildDirectorTrack(
  timeline: MusicTimeline | null | undefined,
  durationInFrames: number,
  fps: number,
  passes?: number,
): DirectorTrack | null {
  if (!timeline || durationInFrames <= 1 || fps <= 0) return null;
  const { sections, emotionalTimeline } = timeline;
  if ((!sections || sections.length === 0) &&
      (!emotionalTimeline || emotionalTimeline.length === 0)) {
    return null;
  }

  const velocity = new Float32Array(durationInFrames);
  const vocalDensity = timeline.vocalDensity ?? null;

  // Sample velocity at each frame.  We deliberately re-find the section/emo
  // bucket per frame — both lookups are O(log n) or O(small-n), and
  // section count is ≤20, so this is comfortably under 1 ms for a 4-min
  // 60 fps render.
  for (let f = 0; f < durationInFrames; f++) {
    const t = f / fps;
    const section = sections ? findSectionAt(sections, t) : null;
    const emo = emotionalTimeline ? findEmotionAt(emotionalTimeline, t) : null;
    const sectionEnergy = section?.energy ?? 0.4;
    const arousal = emo?.arousal ?? 0.4;
    const blended = SECTION_ENERGY_WEIGHT * sectionEnergy + AROUSAL_WEIGHT * arousal;
    let v = energyToVelocity(blended);

    // Phase 4: vocal-density hold. Heavy vocals slow the camera; instrumental
    // moments let it sweep. density=1 → VOCAL_HOLD_FACTOR, density=0 →
    // VOCAL_SWEEP_FACTOR, linear in between.
    if (vocalDensity && vocalDensity.length > 0) {
      const d = Math.max(0, Math.min(1, sampleVocalDensityAt(vocalDensity, t)));
      const vocalMul = VOCAL_SWEEP_FACTOR + d * (VOCAL_HOLD_FACTOR - VOCAL_SWEEP_FACTOR);
      v *= vocalMul;
    }
    velocity[f] = v;
  }

  // Smooth across section boundaries so the camera ramps rather than steps.
  smoothInPlace(velocity, Math.max(1, Math.round(fps * VELOCITY_SMOOTH_SECONDS) >> 1));

  // ── Phase 2: layer Gaussian impulses on top for beat-sync kicks ──────────
  // Gain by overall track intensity so ballads stay smooth; bangers burst.
  const impulseGain = computeTrackIntensityGain(sections);
  if (timeline.impacts && timeline.impacts.length > 0 && impulseGain > 0) {
    for (const im of timeline.impacts) {
      const shape = IMPULSE_BY_TYPE[im.type] ?? IMPULSE_BY_TYPE.hit;
      const sigmaFrames = Math.max(1, shape.sigmaSeconds * fps);
      const peakAmp = shape.amp * Math.max(0, Math.min(1, im.strength)) * impulseGain;
      const centerF = im.time * fps;
      // Truncate Gaussian at ±3σ — beyond that contribution is negligible.
      const radius = Math.ceil(sigmaFrames * 3);
      const lo = Math.max(0, Math.floor(centerF - radius));
      const hi = Math.min(durationInFrames - 1, Math.ceil(centerF + radius));
      const twoSigmaSq = 2 * sigmaFrames * sigmaFrames;
      for (let f = lo; f <= hi; f++) {
        const d = f - centerF;
        velocity[f] += peakAmp * Math.exp(-(d * d) / twoSigmaSq);
      }
    }
    // Clamp so a cluster of overlapping impulses can't run away or invert.
    for (let f = 0; f < durationInFrames; f++) {
      const v = velocity[f];
      if (v < VELOCITY_FLOOR) velocity[f] = VELOCITY_FLOOR;
      else if (v > VELOCITY_CEILING) velocity[f] = VELOCITY_CEILING;
    }
  }

  // ── Phase 6: anticipation ramps before high-energy section boundaries ────
  if (sections && sections.length >= 2) {
    for (let i = 0; i < sections.length - 1; i++) {
      const here = sections[i];
      const next = sections[i + 1];
      const delta = (next.energy ?? 0) - (here.energy ?? 0);
      if (delta < ANTICIPATION_MIN_DELTA) continue;
      const boundarySec = next.start;
      const windowSec = Math.min(ANTICIPATION_WINDOW_SECONDS, boundarySec - here.start);
      if (windowSec <= 0.5) continue;
      // Quadratic ease-in over the window — most of the boost lands in the
      // last second so the wind-up feels properly accelerating, not linear.
      const peak = ANTICIPATION_PEAK * Math.min(1, delta / 0.6);
      const startF = Math.max(0, Math.floor((boundarySec - windowSec) * fps));
      const endF = Math.min(durationInFrames - 1, Math.ceil(boundarySec * fps));
      const span = Math.max(endF - startF, 1);
      for (let f = startF; f <= endF; f++) {
        const x = (f - startF) / span; // 0 → 1 across the ramp
        velocity[f] += peak * x * x;
      }
    }
    // Re-clamp after layering ramps.
    for (let f = 0; f < durationInFrames; f++) {
      const v = velocity[f];
      if (v < VELOCITY_FLOOR) velocity[f] = VELOCITY_FLOOR;
      else if (v > VELOCITY_CEILING) velocity[f] = VELOCITY_CEILING;
    }
  }

  // Cumulative integral, then normalise so warpedProgress[last] === 1.
  const warped = new Float32Array(durationInFrames);
  let acc = 0;
  for (let f = 0; f < durationInFrames; f++) {
    acc += velocity[f];
    warped[f] = acc;
  }
  const total = warped[durationInFrames - 1];
  if (total > 0) {
    const inv = 1 / total;
    for (let f = 0; f < durationInFrames; f++) warped[f] *= inv;
  } else {
    // Degenerate case — fall back to linear so cosine still sweeps.
    for (let f = 0; f < durationInFrames; f++) {
      warped[f] = f / (durationInFrames - 1);
    }
  }

  // ── Phase 3: snap pass boundaries to bars (downbeats) ────────────────────
  // The cosine sweep reaches a front/back endpoint at warpedProgress = k/passes
  // for k=0..passes. Those are the moments a new image appears. Pull each
  // interior boundary onto the nearest bar so cuts land on the beat.
  if (passes && passes >= 2 && timeline.bars && timeline.bars.length >= 2) {
    const bars = timeline.bars;
    const durationSec = durationInFrames / fps;
    // 1. Natural boundary times from current warpedProgress.
    const natural: number[] = new Array(passes + 1);
    natural[0] = 0;
    natural[passes] = durationSec;
    for (let k = 1; k < passes; k++) {
      natural[k] = inverseLookup(warped, k / passes) / fps;
    }
    // 2. Snap interior boundaries to nearest bar, with monotonicity guard.
    const snapped: number[] = new Array(passes + 1);
    snapped[0] = 0;
    snapped[passes] = durationSec;
    for (let k = 1; k < passes; k++) {
      const desired = natural[k];
      let candidate = nearestInSorted(bars, desired);
      // Hard cap on how far we drag a boundary so we don't crush a pass.
      if (Math.abs(candidate - desired) > MAX_BOUNDARY_SNAP_SECONDS) {
        candidate = desired;
      }
      // Enforce strictly increasing with a minimum gap from the previous.
      const prev = snapped[k - 1];
      const floor = prev + MIN_BOUNDARY_GAP_SECONDS;
      if (candidate < floor) candidate = Math.min(floor, durationSec);
      snapped[k] = candidate;
    }
    // Second pass back-to-front in case forward push collided with end.
    for (let k = passes - 1; k >= 1; k--) {
      const ceil = snapped[k + 1] - MIN_BOUNDARY_GAP_SECONDS;
      if (snapped[k] > ceil) snapped[k] = Math.max(snapped[k - 1] + MIN_BOUNDARY_GAP_SECONDS / 2, ceil);
    }
    // 3. Rebuild warpedProgress as a piecewise-linear curve through the
    //    snapped control points (t_k, k/passes). Also rebuild velocity as
    //    the per-segment derivative so Phase 1/2 diagnostics stay accurate.
    let segIdx = 0;
    for (let f = 0; f < durationInFrames; f++) {
      const t = f / fps;
      while (segIdx < passes - 1 && t > snapped[segIdx + 1]) segIdx++;
      const t0 = snapped[segIdx];
      const t1 = snapped[segIdx + 1];
      const p0 = segIdx / passes;
      const p1 = (segIdx + 1) / passes;
      const span = Math.max(t1 - t0, 1e-6);
      const local = (t - t0) / span;
      warped[f] = p0 + local * (p1 - p0);
      // Velocity = dProgress/dFrame, scaled to keep the diagnostic-friendly
      // ~unit range. We multiply by total-frames so a flat sweep across the
      // whole song reads ≈1.0 (matches Phase 1 baseline).
      velocity[f] = ((p1 - p0) / span) * durationSec;
    }
    // Clamp post-rebuild to keep dev log sane.
    for (let f = 0; f < durationInFrames; f++) {
      const v = velocity[f];
      if (v < VELOCITY_FLOOR) velocity[f] = VELOCITY_FLOOR;
      else if (v > VELOCITY_CEILING) velocity[f] = VELOCITY_CEILING;
    }
  }

  // ── Phase 7: ghost-pass phase bumps at big section boundaries ──────────
  const ghostPhase = new Float32Array(durationInFrames);
  if (GHOST_PASS_ENABLED && sections && sections.length >= 2 && impulseGain > 0) {
    const sigmaFrames = Math.max(1, GHOST_SIGMA_SECONDS * fps);
    const twoSigmaSq = 2 * sigmaFrames * sigmaFrames;
    const radius = Math.ceil(sigmaFrames * 3);
    const peak = GHOST_PEAK_PHASE * impulseGain;
    for (let i = 0; i < sections.length - 1; i++) {
      const here = sections[i];
      const next = sections[i + 1];
      const delta = Math.abs((next.energy ?? 0) - (here.energy ?? 0));
      if (delta < GHOST_MIN_ENERGY_DELTA) continue;
      const centerF = next.start * fps;
      const lo = Math.max(0, Math.floor(centerF - radius));
      const hi = Math.min(durationInFrames - 1, Math.ceil(centerF + radius));
      for (let f = lo; f <= hi; f++) {
        const d = f - centerF;
        ghostPhase[f] += peak * Math.exp(-(d * d) / twoSigmaSq);
      }
    }
  }

  return { velocity, warpedProgress: warped, ghostPhase };
}

/**
 * Sample `warpedProgress` at an arbitrary (possibly fractional) frame index.
 * Used by the depth-gallery's velocity-derivative sampling (`frame ± 1.5`).
 */
export function sampleWarpedProgress(track: DirectorTrack, f: number): number {
  const wp = track.warpedProgress;
  const last = wp.length - 1;
  if (last < 0) return 0;
  if (f <= 0) return wp[0];
  if (f >= last) return wp[last];
  const lo = Math.floor(f);
  const hi = lo + 1;
  const t = f - lo;
  return wp[lo] * (1 - t) + wp[hi] * t;
}

/** Sample additive ghost-phase (radians) at `frame`; 0 outside bump windows. */
export function sampleGhostPhase(track: DirectorTrack | null | undefined, frame: number): number {
  if (!track) return 0;
  const g = track.ghostPhase;
  const last = g.length - 1;
  if (last < 0) return 0;
  if (frame <= 0) return g[0];
  if (frame >= last) return g[last];
  const lo = Math.floor(frame);
  const hi = lo + 1;
  const t = frame - lo;
  return g[lo] * (1 - t) + g[hi] * t;
}

// ─── Phase 5: mood color grade ─────────────────────────────────────────────
// Sample valence/arousal at any second `t`, apply a subtle warm/cool +
// brightness modulation to caller-supplied colours. CPU-only — no shader
// changes. Defaults are intentionally gentle so user palettes still read.

export interface MoodSample {
  /** -1 (negative) … +1 (positive). */
  valence: number;
  /** 0 (calm) … 1 (intense). */
  arousal: number;
}

/** Sample valence + arousal at time `t` (seconds). Returns null if unavailable. */
export function sampleMoodAt(timeline: MusicTimeline | null | undefined, t: number): MoodSample | null {
  const emo = timeline?.emotionalTimeline;
  if (!emo || emo.length === 0) return null;
  // Linear interpolation between the ~2 s buckets (smoother than nearest).
  if (t <= emo[0].time) return { valence: emo[0].valence, arousal: emo[0].arousal };
  const lastP = emo[emo.length - 1];
  if (t >= lastP.time) return { valence: lastP.valence, arousal: lastP.arousal };
  let lo = 0;
  let hi = emo.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (emo[mid].time <= t) lo = mid;
    else hi = mid;
  }
  const span = emo[hi].time - emo[lo].time;
  const a = span > 0 ? (t - emo[lo].time) / span : 0;
  return {
    valence: emo[lo].valence * (1 - a) + emo[hi].valence * a,
    arousal: emo[lo].arousal * (1 - a) + emo[hi].arousal * a,
  };
}

/** Warm/cool R-vs-B channel push at full valence (±1). Subtle by design. */
const MOOD_TEMPERATURE_AMOUNT = 0.12;
/** Brightness scaling range driven by arousal (0 → multiplier=BRIGHTNESS_FLOOR). */
const MOOD_BRIGHTNESS_FLOOR = 0.88;
const MOOD_BRIGHTNESS_CEILING = 1.10;

/**
 * Apply a subtle mood grade to an `{r, g, b}` (0–1) colour in place.
 * Designed to be called on THREE.Color instances after the per-image
 * palette lerp, before they're pushed to shader uniforms.
 *
 * @param weight 0..1 strength multiplier (lets the caller fade the grade in).
 */
export function applyMoodGrade(
  rgb: { r: number; g: number; b: number },
  mood: MoodSample,
  weight: number = 1,
): void {
  if (weight <= 0) return;
  const w = Math.max(0, Math.min(1, weight));
  // Valence ∈ [-1, +1] → temperature push.
  const tempShift = mood.valence * MOOD_TEMPERATURE_AMOUNT * w;
  // Arousal ∈ [0, 1] → brightness lerp.
  const brightness =
    MOOD_BRIGHTNESS_FLOOR + mood.arousal * (MOOD_BRIGHTNESS_CEILING - MOOD_BRIGHTNESS_FLOOR);
  const bMul = 1 + (brightness - 1) * w;

  let r = rgb.r * (1 + tempShift) * bMul;
  let g = rgb.g * bMul;
  let b = rgb.b * (1 - tempShift) * bMul;
  if (r < 0) r = 0; else if (r > 1) r = 1;
  if (g < 0) g = 0; else if (g > 1) g = 1;
  if (b < 0) b = 0; else if (b > 1) b = 1;
  rgb.r = r;
  rgb.g = g;
  rgb.b = b;
}

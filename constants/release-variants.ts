/**
 * Release variants — short-form cuts of the same song, derived from Best
 * Moments data.
 *
 * Each variant is a different *format* of the track (a hook, an emotional
 * moment, a loop, …). Variants inherit theme, preset, cover, and text from the
 * base `visualizerSettings`; only the cut/format/timing differs per variant.
 * Orientation is forced to portrait for all variants (for now).
 *
 * Adding a variant = one entry here + a matching `ReleaseVariantId` in
 * `firebase/video-helpers.ts`.
 *
 * Instrumental-aware: every variant ships two pickers — one for vocal tracks
 * (`meta.path === 'lyric'`) and one for instrumental tracks
 * (`meta.path === 'instrumental'`) — so no variant ever dead-ends when there
 * are no vocals. Lyric-only chrome (subtitles, hook text) is suppressed at
 * runtime when `meta.hasVocals` is false.
 */

import type { ClipFinderClip, ClipFinderMeta } from '@/lib/best-moments/types';

/** Picks the best base clip for a variant from the ranked Best Moments. */
export type ClipPicker = (
  clips: ClipFinderClip[],
  meta: ClipFinderMeta,
) => ClipFinderClip | null;

/** Lambda bundle that hosts the variant's Remotion composition. */
type VariantLambdaSite = 'editor' | 'release-pack' | 'best-moments';

export interface ReleaseVariant {
  id: ReleaseVariantId;
  /** Short label shown on the variant chip. */
  label: string;
  /** One-line editorial description shown under the active variant. */
  description: string;
  /** Display order in the tab strip. */
  order: number;
  /** Target clip length range in seconds: [min, max]. */
  targetLenSec: [min: number, max: number];
  /**
   * Whether the variant leans on vocals. When true and the track is
   * instrumental, the UI surfaces a subtle "instrumental" note — but the
   * variant still produces a valid cut via its instrumental picker.
   */
  requiresVocals: boolean;
  /** Whether subtitles are on by default (further gated by `meta.hasVocals`). */
  showSubtitlesByDefault: boolean;
  /** Whether a hook-text card is shown (suppressed when `!meta.hasVocals`). */
  showHookText: boolean;
  /** Per-path clip pickers. */
  pick: {
    lyric: ClipPicker;
    instrumental: ClipPicker;
  };
  /** Render-time metadata: which Remotion composition and Lambda site to use. */
  render: {
    /** Registered Remotion composition id. */
    compositionId: string;
    /** Lambda site bundle that contains the composition. */
    lambdaSite: VariantLambdaSite;
    /** Hard duration floor for the rendered output. */
    minDurationSec: number;
    /** Hard duration ceiling for the rendered output. */
    maxDurationSec: number;
    /** Output width in pixels. */
    width: number;
    /** Output height in pixels. */
    height: number;
    /** Output frame rate. */
    fps: 30 | 60;
    /** When true, the composition is expected to loop seamlessly. */
    seamlessLoop?: boolean;
  };
}

/**
 * Stable identifiers for the short-form Release variants. Adding a variant
 * means adding its id here and a matching entry in `RELEASE_VARIANTS`.
 */
export type ReleaseVariantId =
  | 'teaser'
  | 'hook'
  | 'emotional'
  | 'release-day'
  | 'story'
  | 'canvas';

/**
 * The single short-form variant surfaced in the simplified editor UI.
 * Toggling "Short Clip" enables/disables this variant; the others remain
 * available in the data model but are no longer exposed as separate buttons.
 */
export const SHORT_CLIP_VARIANT_ID: ReleaseVariantId = 'hook';

// ── Picker helpers ──────────────────────────────────────────────────────────

const byScoreDesc: ClipPicker = (clips) =>
  [...clips].sort((a, b) => b.score - a.score)[0] ?? null;

const byEnergyDesc: ClipPicker = (clips) =>
  [...clips].sort((a, b) => b.features.energy - a.features.energy)[0] ?? null;

const byEmotionDesc: ClipPicker = (clips) =>
  [...clips].sort((a, b) => b.features.emotion - a.features.emotion)[0] ?? null;

/** Lowest-energy sustained window — the "breakdown" on an instrumental track. */
const byEnergyAsc: ClipPicker = (clips) =>
  [...clips].sort((a, b) => a.features.energy - b.features.energy)[0] ?? null;

/** Longest window (most coherent stretch). */
const byDurationDesc: ClipPicker = (clips) =>
  [...clips].sort((a, b) => (b.end - b.start) - (a.end - a.start))[0] ?? null;

/** Matches a clip by editorial title substring, falling back to a secondary picker. */
function byTitle(match: string, fallback: ClipPicker): ClipPicker {
  const needle = match.toLowerCase();
  return (clips, meta) => {
    const hit = clips.find((c) => c.title.toLowerCase().includes(needle));
    return hit ?? fallback(clips, meta);
  };
}

// ── Variant definitions ─────────────────────────────────────────────────────

export const RELEASE_VARIANTS: ReleaseVariant[] = [
  {
    id: 'teaser',
    label: 'Teaser',
    description: 'A punchy first-look snippet — the shortest, highest-impact moment.',
    order: 0,
    targetLenSec: [6, 10],
    requiresVocals: false,
    showSubtitlesByDefault: true,
    showHookText: true,
    pick: {
      lyric: byScoreDesc,
      instrumental: byEnergyDesc,
    },
    render: {
      compositionId: 'VariantTeaser',
      lambdaSite: 'release-pack',
      minDurationSec: 1,
      maxDurationSec: 60,
      width: 720,
      height: 1280,
      fps: 30,
    },
  },
  {
    id: 'hook',
    label: 'Hook',
    description: 'The chorus or strongest hook — built to stop the scroll.',
    order: 1,
    targetLenSec: [8, 15],
    requiresVocals: false,
    showSubtitlesByDefault: true,
    showHookText: true,
    pick: {
      lyric: byTitle('hook', byScoreDesc),
      instrumental: byEnergyDesc,
    },
    render: {
      compositionId: 'VariantHook',
      lambdaSite: 'release-pack',
      minDurationSec: 1,
      maxDurationSec: 60,
      width: 720,
      height: 1280,
      fps: 30,
    },
  },
  {
    id: 'emotional',
    label: 'Emotional',
    description: 'The most emotive passage — lyric-forward and slower paced.',
    order: 2,
    targetLenSec: [15, 20],
    requiresVocals: true,
    showSubtitlesByDefault: true,
    showHookText: false,
    pick: {
      // Most emotionally-weighted lyric window.
      lyric: byEmotionDesc,
      // No vocals → the calmest sustained section (the breakdown).
      instrumental: byEnergyAsc,
    },
    render: {
      compositionId: 'VariantEmotional',
      lambdaSite: 'release-pack',
      minDurationSec: 1,
      maxDurationSec: 60,
      width: 720,
      height: 1280,
      fps: 30,
    },
  },
  {
    id: 'release-day',
    label: 'Release Day',
    description: 'High-impact, shareable cut for launch day.',
    order: 3,
    targetLenSec: [12, 18],
    requiresVocals: false,
    showSubtitlesByDefault: true,
    showHookText: true,
    pick: {
      lyric: byEnergyDesc,
      instrumental: byEnergyDesc,
    },
    render: {
      compositionId: 'VariantReleaseDay',
      lambdaSite: 'release-pack',
      minDurationSec: 1,
      maxDurationSec: 60,
      width: 720,
      height: 1280,
      fps: 30,
    },
  },
  {
    id: 'story',
    label: 'Story',
    description: 'A longer, phrase-driven moment that tells a story.',
    order: 4,
    targetLenSec: [20, 30],
    requiresVocals: true,
    showSubtitlesByDefault: true,
    showHookText: false,
    pick: {
      // Longest coherent vocal window.
      lyric: byDurationDesc,
      // No vocals → longest sustained section; degrades to a plain cinematic cut.
      instrumental: byDurationDesc,
    },
    render: {
      compositionId: 'VariantStory',
      lambdaSite: 'release-pack',
      minDurationSec: 1,
      maxDurationSec: 60,
      width: 720,
      height: 1280,
      fps: 30,
    },
  },
  {
    id: 'canvas',
    label: 'Canvas',
    description: 'A short, seamless loop — portrait Canvas-style.',
    order: 5,
    targetLenSec: [3, 8],
    requiresVocals: false,
    showSubtitlesByDefault: false,
    showHookText: false,
    pick: {
      // Energy-stable window loops cleanly.
      lyric: byEnergyDesc,
      instrumental: byEnergyDesc,
    },
    render: {
      compositionId: 'VariantCanvas',
      lambdaSite: 'release-pack',
      minDurationSec: 3,
      maxDurationSec: 8,
      width: 720,
      height: 1280,
      fps: 30,
      seamlessLoop: true,
    },
  },
];

/** Variants in display order. */
export const RELEASE_VARIANTS_ORDERED = [...RELEASE_VARIANTS].sort(
  (a, b) => a.order - b.order,
);

export function getReleaseVariant(id: ReleaseVariantId): ReleaseVariant | undefined {
  return RELEASE_VARIANTS.find((v) => v.id === id);
}

/**
 * Auto-pick a crop window for a variant from the Best Moments clips, clamped to
 * the variant's target length. Returns null when there are no clips to pick
 * from (caller should keep the full song / show a loading state).
 *
 * The chosen base clip is trimmed to the target length anchored at its start;
 * if the clip is shorter than the minimum target it is extended forward,
 * staying within the track bounds (`meta.audioDuration`).
 */
export function deriveVariantTrim(
  variant: ReleaseVariant,
  clips: ClipFinderClip[],
  meta: ClipFinderMeta,
): { start: number; end: number } | null {
  if (!clips.length) return null;
  const picker = variant.pick[meta.path] ?? variant.pick.lyric;
  const base = picker(clips, meta);
  if (!base) return null;

  const [targetMin, targetMax] = variant.targetLenSec;
  const minLen = Math.max(targetMin, variant.render.minDurationSec);
  const maxLen = Math.min(targetMax, variant.render.maxDurationSec);
  const trackEnd = meta.audioDuration > 0 ? meta.audioDuration : base.end;
  const clipLen = base.end - base.start;

  let start = Math.max(0, base.start);
  let end: number;

  if (clipLen > maxLen) {
    // Too long → keep the front of the clip (where the hook usually lands).
    end = start + maxLen;
  } else if (clipLen < minLen) {
    // Too short → extend forward, then backward if we hit the track end.
    end = Math.min(trackEnd, start + minLen);
    if (end - start < minLen) {
      start = Math.max(0, end - minLen);
    }
  } else {
    end = base.end;
  }

  end = Math.min(end, trackEnd);
  if (end <= start) return null;
  return { start, end };
}

/**
 * Re-clamp an existing variant trim to the current render limits. Use this when
 * a stored `audioTrim` may have been created before the variant's duration
 * limits changed (e.g. Canvas moved from 6–10 s to 3–8 s).
 */
export function clampVariantTrim(
  trim: { start: number; end: number } | null,
  variant: ReleaseVariant,
  audioDuration: number,
): { start: number; end: number } | null {
  if (!trim) return null;
  const [targetMin, targetMax] = variant.targetLenSec;
  const minLen = Math.max(targetMin, variant.render.minDurationSec);
  const maxLen = Math.min(targetMax, variant.render.maxDurationSec);
  const trackEnd = audioDuration > 0 ? audioDuration : trim.end;
  const len = trim.end - trim.start;

  let start = Math.max(0, trim.start);
  let end: number;

  if (len > maxLen) {
    end = start + maxLen;
  } else if (len < minLen) {
    end = Math.min(trackEnd, start + minLen);
    if (end - start < minLen) {
      start = Math.max(0, end - minLen);
    }
  } else {
    end = trim.end;
  }

  end = Math.min(end, trackEnd);
  if (end <= start) return null;
  return { start, end };
}

/**
 * Lyric (subtitle) mode registry — the single source of truth for every
 * `SubtitleConfig.mode` value. Pickers and the renderer dispatcher
 * read from here; never hardcode mode id lists elsewhere.
 *
 * Families:
 *   classic — hand-built slots (Kinetic / Headline / Wave / TikTok Fan).
 *   synth   — envelope presets rendered by lib/renderer/lyrics/synth.ts
 *             (attack → delay → sustain fx → release, one phrase at a time).
 */

export const LYRIC_MODE_IDS = [
  'kinetic',
  'headline',
  'wave',
  'tiktok-fan',
  'clean-fade',
  'impact',
  'calm-waves',
  'emphatic',
  'hyperflicker',
  'font-cycle',
] as const;

export type LyricModeId = (typeof LYRIC_MODE_IDS)[number];

export type LyricModeFamily = 'classic' | 'synth';

/** Creative character — used by tag-based pickers instead of hardcoded ids. */
export type LyricModeCharacter = 'caption' | 'editorial' | 'soft' | 'punchy' | 'glitch' | 'playful';

export interface LyricModeMeta {
  id: LyricModeId;
  label: string;
  blurb: string;
  family: LyricModeFamily;
  character: LyricModeCharacter;
  energyTag: 'calm' | 'kinetic' | 'chaotic';
  /** Eligible for automatic lyric-mode pick. */
  autoPick: boolean;
  /** Hidden from every picker (still renders for videos already using it). */
  hidden?: boolean;
  /** Pro only at export — free users can preview it; free exports use freeFallback. */
  pro?: boolean;
  /** Free style a Pro style exports as for free users. */
  freeFallback?: LyricModeId;
}

export const LYRIC_MODE_REGISTRY: readonly LyricModeMeta[] = [
  { id: 'kinetic', label: 'Kinetic', blurb: 'Words appear one by one with the music.', family: 'classic', character: 'editorial', energyTag: 'kinetic', autoPick: true },
  { id: 'headline', label: 'Headline', blurb: 'Bold block that reads like a caption.', family: 'classic', character: 'caption', energyTag: 'kinetic', autoPick: true },
  { id: 'wave', label: 'Wave', blurb: 'A gentle ripple under the current line.', family: 'classic', character: 'soft', energyTag: 'calm', autoPick: false },
  { id: 'tiktok-fan', label: 'TikTok Fan', blurb: 'Editorial block printed into the artwork.', family: 'classic', character: 'editorial', energyTag: 'kinetic', autoPick: true },
  { id: 'clean-fade', label: 'Clean Fade', blurb: 'Each line softly fades in and out.', family: 'synth', character: 'soft', energyTag: 'calm', autoPick: false },
  { id: 'impact', label: 'Impact', blurb: 'Lines slam in and shudder on the beat.', family: 'synth', character: 'punchy', energyTag: 'kinetic', autoPick: false, pro: true, freeFallback: 'kinetic' },
  { id: 'calm-waves', label: 'Calm Waves', blurb: 'Blurs in, letters ripple, blurs away.', family: 'synth', character: 'soft', energyTag: 'calm', autoPick: false, pro: true, freeFallback: 'clean-fade' },
  { id: 'emphatic', label: 'Emphatic', blurb: 'Grows in, then distorts with colour split.', family: 'synth', character: 'glitch', energyTag: 'chaotic', autoPick: false, pro: true, freeFallback: 'kinetic' },
  // Temporarily hidden from pickers (existing videos keep rendering it).
  { id: 'hyperflicker', label: 'Hyperflicker', blurb: 'Lines strobe in time with the track.', family: 'synth', character: 'glitch', energyTag: 'chaotic', autoPick: false, hidden: true },
  { id: 'font-cycle', label: 'Font Cycle', blurb: 'Each line shuffles through typefaces.', family: 'synth', character: 'playful', energyTag: 'kinetic', autoPick: false, pro: true, freeFallback: 'kinetic' },
];

/** Modes offered in pickers — everything not marked hidden. */
export const PICKABLE_LYRIC_MODES: readonly LyricModeMeta[] = LYRIC_MODE_REGISTRY.filter((m) => !m.hidden);

export function getLyricModeMeta(id: string | undefined | null): LyricModeMeta | undefined {
  return LYRIC_MODE_REGISTRY.find((m) => m.id === id);
}

export function isSynthLyricMode(id: string | undefined | null): boolean {
  return getLyricModeMeta(id)?.family === 'synth';
}

export function isProLyricMode(id: string | undefined | null): boolean {
  return getLyricModeMeta(id)?.pro === true;
}

/** The style a lyric mode exports as for free users (itself when free). */
export function freeLyricMode<T extends string>(id: T): T | LyricModeId {
  const meta = getLyricModeMeta(id);
  return meta?.pro && meta.freeFallback ? meta.freeFallback : id;
}

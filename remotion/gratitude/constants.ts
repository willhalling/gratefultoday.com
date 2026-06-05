// Visual constants mirrored from gratitude_videos/app.py to ensure parity
// between the Python ffmpeg renderer and the Remotion renderer.

export const VIDEO_W = 1080;
export const VIDEO_H = 1920;
export const FPS = 30;
export const BEAT_LENGTH_S = 4.0;
export const FADE_S = 0.4;
export const MIN_DURATION_S = 4.0;

// Subtle Ken Burns zoom for still-image backgrounds (1.0 -> 1.30 over duration).
export const IMAGE_ZOOM_END = 1.3;

// Full-frame dark overlay so white text reads cleanly on bright backgrounds.
export const DARKEN_OVERLAY_ALPHA = 0.1;

// TikTok safe area + preferred top anchor for caption block.
export const SAFE_TOP_PX = 220;
export const SAFE_BOTTOM_PX = 620;
export const TOP_SECTION_CENTER_Y = 520;

// Beat caption tuning.
export const BEAT_FONTSIZE = 52;
export const BEAT_WRAP = 14;
export const BEAT_MAX_LINES = 3;
export const BEAT_HARD_MAX_LINES = 5;
export const LINE_MAX_W_FRAC = 0.78;

// Pill style tuning (TEXT_STYLE = "pill").
export const PILL_BG_OPACITY = 200; // 0-255
export const PILL_PAD_X = 28;
export const PILL_PAD_Y = 16;
export const PILL_RADIUS = 22;
export const PILL_LINE_GAP_PX = 12;
export const LETTER_SPACING_PX = 1.4;

// Film overlay cadence (a low fps gives it a flickery, filmic feel).
// Lowered from 4 -> 3 so dust flickers update less often (~0.33s per frame).
export const FILM_OVERLAY_FPS = 3;
export const FILM_OVERLAY_FRAMES = 24;
// Toned down from the aggressive pass — about 1/3 the dust count and less
// frequent streaks. Still visibly filmic, no longer noisy.
export const FILM_DUST_PER_FRAME = 26;
export const FILM_DUST_STDDEV = 7;
export const FILM_STREAK_MAX = 3;
export const FILM_STREAK_VISIBLE_S = 0.6;
export const FILM_STREAK_GAP_S = 2.4;
export const FILM_STREAK_WIDTH_CHOICES = [1, 1, 1, 2, 2, 3, 3, 4];
export const FILM_STREAK_ALPHA_RANGE: [number, number] = [0.08, 0.34];

// Default font key used by the Python pipeline.
export const DEFAULT_FONT_CHOICE = 'playfair';

export type FontChoice =
  | 'playfair'
  | 'cormorant'
  | 'dm_serif'
  | 'tenor'
  | 'cinzel'
  | 'bebas'
  | 'anton'
  | 'montserrat'
  | 'inter'
  | 'ibm_plex'
  | 'avenir'
  | 'helvetica';

export interface GratitudePostProps {
  beats: string[];
  /** Legacy single background — used when backgrounds[] is not provided. */
  background?: { url: string; kind: 'image' | 'video' };
  /**
   * Per-beat backgrounds. Index 0 = beat 1, 1 = beat 2, 2 = beat 3.
   * Each entry can be null/undefined to inherit from the previous beat.
   * Takes precedence over the legacy `background` field.
   */
  backgrounds?: Array<{ url: string; kind: 'image' | 'video' } | null>;
  music?: { url: string };
  fontChoice?: FontChoice;
  headlineWord?: string;
}

export function computeDurationInFrames(beats: string[], headlineWord?: string): number {
  const beatCount = beats.filter((b) => b.trim()).length;
  const headlineSlot = headlineWord?.trim() ? 1 : 0;
  const seconds = Math.max((beatCount + headlineSlot) * BEAT_LENGTH_S, MIN_DURATION_S);
  return Math.round(seconds * FPS);
}

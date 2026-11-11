import type { Occasion } from '@/lib/product';
import type { Script } from '@/lib/orders/types';

/**
 * How each video looks. A look is a set of WaveCanvas render `changes`
 * (GET https://wavecanvas.io/api/v1/changes) applied over the base video for
 * that render only, so the look lives here in code rather than in the editor.
 */

export type LookName = 'christmas' | 'evergreen' | 'first-light' | 'midnight' | 'candlelight';

const GOLD = '#F5C542';
const CREAM = '#FFF6E5';

/**
 * The picture doesn't jump to the beat: these are spoken messages, and
 * punching in or shaking on the music fights the voice. Beat reaction
 * (picture punch/shake and the lyric "pop") runs even under a signature
 * style, so it's off everywhere. A style's light pulse stays (PHOTO_STYLE).
 */
const STILL = {
  beatReaction: { amount: 0 },
  visualizer: { visualizer: 'none' },
  atmosphere: { atmosphere: 'none' },
};

/**
 * For looks with a signature style on a photo: its lights glow and pulse with
 * the music (that's the good part); only beat reaction's shake is off.
 * `pulse` 0 would freeze the lights too.
 */
export const PHOTO_STYLE = { tuneSignatureStyle: { pulse: 0.5, strength: 0.65, movement: 0.6 } };

/** Undo whatever the base video has that we never want. */
const RESET = {
  ...STILL,
  layout: { layout: 'minimal' },
  camera: { motion: 'static' },
  colourGrade: { grade: 'original' },
  backgroundTint: { off: true },
  socialLinks: { clear: true },
  lyricsVisibility: { show: true },
  // Whole lines, calm. (Kinetic runs some words together when it wraps.)
  lyricsStyle: { style: 'clean-fade', size: 'large' },
  font: { font: 'cinematic' },
  lyricEmphasis: { off: true },
  adjustLyrics: { uppercase: false, backdropOpacity: 0 },
  textOutline: { amount: 0 },
  textShadow: { on: true },
};

const LOOKS: Record<LookName, Record<string, unknown>> = {
  // Deep pine night, gold and cream type, snow drifting through warm light.
  christmas: {
    ...RESET,
    backgroundGradient: { start: '#154734', end: '#05140E' },
    colours: { accent: GOLD, text: CREAM },
    titleStyle: { color: GOLD, scale: 1.1 },
    overlays: { remove: ['grain', 'dust'], add: ['snow', 'sparkles', 'light-leak', 'vignette'], lightLeak: 0.35 },
  },
  evergreen: {
    ...RESET,
    backgroundGradient: { start: '#1F4D3D', end: '#0B1F18' },
    colours: { accent: GOLD, text: CREAM },
    titleStyle: { color: GOLD },
    overlays: { remove: ['grain', 'snow', 'sparkles'], add: ['dust', 'light-leak', 'vignette'], lightLeak: 0.3 },
  },
  // Night sky lifting towards dawn.
  'first-light': {
    ...RESET,
    backgroundGradient: { start: '#14213D', end: '#4A2E3A' },
    colours: { accent: '#F2B880', text: CREAM },
    titleStyle: { color: '#F2B880' },
    overlays: { remove: ['grain', 'snow', 'sparkles'], add: ['dust', 'light-leak', 'vignette'], lightLeak: 0.4 },
  },
  // Ink-blue to black, silver type, a few points of light.
  midnight: {
    ...RESET,
    backgroundGradient: { start: '#101A3A', end: '#020308' },
    colours: { accent: '#DCE3F0', text: '#F4F6FB' },
    titleStyle: { color: '#DCE3F0' },
    overlays: { remove: ['grain', 'snow', 'dust'], add: ['sparkles', 'light-leak', 'vignette'], lightLeak: 0.2 },
  },
  // Warm amber, like a room lit by candles.
  candlelight: {
    ...RESET,
    backgroundGradient: { start: '#4A2A12', end: '#0E0804' },
    colours: { accent: '#FFB765', text: '#FFF1DE' },
    titleStyle: { color: '#FFB765' },
    overlays: { remove: ['snow', 'sparkles'], add: ['dust', 'grain', 'light-leak', 'vignette'], lightLeak: 0.5 },
  },
};

/** What the buyer sees on the picker. */
export const LOOK_LABELS: Record<LookName, string> = {
  christmas: 'Christmas Eve',
  evergreen: 'Evergreen',
  'first-light': 'First Light',
  midnight: 'Midnight',
  candlelight: 'Candlelight',
};

export const isLook = (v: unknown): v is LookName => typeof v === 'string' && v in LOOKS;

/** The four looks a buyer chooses between, best guess first. */
export function lookChoices(occasion: Occasion, script: Pick<Script, 'season'>): LookName[] {
  if (occasion === 'recovery') return ['first-light', 'candlelight', 'midnight', 'evergreen'];
  if (script.season === 'christmas') return ['christmas', 'candlelight', 'midnight', 'evergreen'];
  return ['evergreen', 'candlelight', 'midnight', 'first-light'];
}

/** The look's changes, with the closing line set in a script font. */
export function lookChanges(look: LookName, lineCount: number): Record<string, unknown> {
  return {
    ...LOOKS[look],
    ...(lineCount > 1 ? { lyricEmphasis: { font: 'script', lines: [lineCount - 1] } } : {}),
  };
}

/**
 * The saved WaveCanvas video every render starts from (portrait). Its look is
 * replaced by the changes above; only its frame and layout plumbing are used.
 */
export function baseVideo(look: LookName): string {
  return (
    process.env[`WAVECANVAS_TEMPLATE_${look.toUpperCase().replace(/-/g, '_')}`] ||
    process.env.WAVECANVAS_TEMPLATE ||
    'back-to-the-strobe-mv8d39xkunmx'
  );
}

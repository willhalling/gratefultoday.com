// Ported verbatim from willhalling.com lib/intro/types.ts (the signature typewriter).
// Keep in sync with that file rather than tuning it here.
/**
 * lib/intro/types.ts — the IntroSpec: everything that defines one render of
 * the signature intro. Given the same spec (including jitterSeed), every
 * export is frame-identical.
 */

export type IntroFormat = '1920x1080' | '1080x1920';
export type IntroFps = 30 | 60;
/** 'terminal': the command moves up and dims like shell history while the title appears beneath it. */
export type IntroTransition = 'fade' | 'slide' | 'terminal';
/** 'soft': low-profile laptop keys. 'mechanical': muted mechanical — deeper thock, more body. */
export type IntroKeyStyle = 'soft' | 'mechanical';
export type IntroFontKey = 'jetbrains-mono' | 'ibm-plex-mono' | 'space-mono';

export interface IntroColors {
  background: string;
  text: string;
  prompt: string;
  cursor: string;
}

export interface IntroSound {
  enabled: boolean;
  /** 0–1 gain applied to each keystroke. */
  keyVolume: number;
  /** 0–1 gain applied to the resolve tone. */
  toneVolume: number;
  /** Keyboard character for the keystrokes. */
  keyStyle: IntroKeyStyle;
  /** A heavier Return keypress at the resolve, just before the tone. */
  enterKey: boolean;
}

export interface IntroSpec {
  /** The line that types out, e.g. "make a tool that slows down songs". */
  line: string;
  /** Resolved title. Empty string → the typed line stays on screen. */
  title: string;
  /** Baseline typing speed in characters per second (ignored while fitDurationMs is set). */
  typingCps: number;
  /**
   * Target total clip length. When > 0 the typing speed is derived so the whole
   * intro lands on this length (clamped to a believable 6–30 chars/s). 0 = off.
   */
  fitDurationMs: number;
  /** Blinking cursor on screen before the first keystroke. */
  leadInMs: number;
  /** Seed for the per-keystroke timing/sound jitter. Same seed = same take. */
  jitterSeed: number;
  /** Pause after the line finishes typing, before the resolve. */
  pauseMs: number;
  /** Hold on the resolved title before the clip ends. */
  holdMs: number;
  format: IntroFormat;
  fps: IntroFps;
  colors: IntroColors;
  font: IntroFontKey;
  transition: IntroTransition;
  sound: IntroSound;
  /** Horizontal placement: 'left' (default) or 'center' — centred on the
   *  finished line, so text never shifts while it types. */
  align?: 'left' | 'center';
  /** 'block' (default) terminal block, or a slim 'bar' caret. */
  cursorStyle?: 'block' | 'bar';
  /** Lines typed and then deleted (backspaced) before `line`, in order (max 2). */
  previousLines?: string[];
}

export const INTRO_FORMATS: Record<
  IntroFormat,
  { width: number; height: number; label: string }
> = {
  '1920x1080': { width: 1920, height: 1080, label: '1080p landscape' },
  '1080x1920': { width: 1080, height: 1920, label: '1080x1920 Shorts' },
};

export const INTRO_FONT_LABELS: Record<IntroFontKey, string> = {
  'jetbrains-mono': 'JetBrains Mono',
  'ibm-plex-mono': 'IBM Plex Mono',
  'space-mono': 'Space Mono',
};

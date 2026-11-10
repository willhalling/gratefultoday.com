export type VisualizerPreset =
  | 'none'
  | 'bars'
  | 'radial-bars'
  | 'hills'
  | 'wave'
  | 'waveform-progress'
  | 'emotion-tiktok-cut'
  // WebGL2 presets (lib/renderer/visualizers-gl.ts)
  | 'prism-bars'
  | 'dot-halo'
  | 'echo-rings'
  | 'aurora-ribbons'
  | 'silk-waveform';

/**
 * Geometric character of a visualizer. Used by tag-based pickers to select
 * visualizers by shape instead of hardcoded
 * ids.
 *   column — vertical bars     radial — circular bars
 *   line   — waveform traces   terrain — rolling filled hills
 */
export type VisualizerShape = 'column' | 'radial' | 'line' | 'terrain';

export interface VisualizerOption {
  id: VisualizerPreset;
  /** Shape tag — see VisualizerShape. */
  shape?: VisualizerShape;
  /**
   * WebGL presets only: the Canvas2D preset whose slot geometry layouts use
   * for this preset, and which is drawn instead when WebGL2 is unavailable.
   */
  classicBase?: VisualizerPreset;
}

/**
 * Registry of every visualizer preset with its tag metadata. Tag-based
 * consumers only match entries that carry the tag they filter on, so
 * intentionally-untagged entries (see below) never leak into generated pools.
 */
export const VISUALIZER_OPTIONS: readonly VisualizerOption[] = [
  { id: 'none' },
  { id: 'bars', shape: 'column' },
  { id: 'radial-bars', shape: 'radial' },
  { id: 'hills', shape: 'terrain' },
  { id: 'wave', shape: 'line' },
  { id: 'waveform-progress', shape: 'line' },
  // 'emotion-tiktok-cut' is a release-variant cut, not a generatable look —
  // deliberately untagged so shape-filtered pools never pick it.
  { id: 'emotion-tiktok-cut' },
  { id: 'prism-bars', shape: 'column', classicBase: 'bars' },
  { id: 'dot-halo', shape: 'radial', classicBase: 'radial-bars' },
  { id: 'echo-rings', shape: 'radial', classicBase: 'radial-bars' },
  { id: 'aurora-ribbons', shape: 'line', classicBase: 'wave' },
  { id: 'silk-waveform', shape: 'line', classicBase: 'waveform-progress' },
];

export const VISUALIZER_PRESET_IDS: readonly VisualizerPreset[] = VISUALIZER_OPTIONS.map((o) => o.id);

/** The Canvas2D preset a WebGL preset borrows slot geometry / fallback from;
 *  classic presets map to themselves. */
export function classicVisualizerPreset(preset: VisualizerPreset): VisualizerPreset {
  return VISUALIZER_OPTIONS.find((o) => o.id === preset)?.classicBase ?? preset;
}

export function isWebGLVisualizerPreset(preset: VisualizerPreset): boolean {
  return classicVisualizerPreset(preset) !== preset;
}

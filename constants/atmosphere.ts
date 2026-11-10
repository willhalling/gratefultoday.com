/**
 * Atmosphere registry — the shader/motion treatments offered in the Visuals
 * drawer's Atmosphere tab. Exactly one is active at a time (it maps onto the
 * video's existing `motionEffect` / `waveIntensity` fields, so no storage
 * migration); overlay effects (grain, dust, vignette, sparkles) and camera
 * motion stack on top independently.
 *
 * Adding a new shader atmosphere:
 *   1. Add the id to SHADER_ATMOSPHERE_IDS and an option below.
 *   2. Add the id to the motionEffect unions: firebase/video-helpers.ts
 *      (VisualizerSettings), constants/themes.ts (CustomThemeConfig),
 *      lib/theme-editor-values.ts (MotionEffectValue), lib/render-lambda.ts,
 *      remotion/VisualizerComposition.tsx (props + activeMotionEffect).
 *   3. Create the shader in remotion/three/shaders/ and a scene in
 *      remotion/three/scenes/, then render it in VisualizerComposition
 *      branch 5a next to RainScene.
 */

/** Atmospheres backed by the classic wave layer (waveIntensity) rather than a
 *  motionEffect shader. */
export const WAVE_ATMOSPHERE_ID = 'wave';

export type ShaderAtmosphereId = 'pulse' | 'rgb-glitch' | 'rain' | 'dream';

export type AtmosphereId = 'none' | 'wave' | ShaderAtmosphereId;

export const ATMOSPHERE_OPTIONS: {
  id: AtmosphereId;
  label: string;
  blurb: string;
  /**
   * Energy character of the effect. Used by tag-based pickers to select
   * atmospheres by mood instead of hardcoded ids.
   *   calm    — slow, ambient, meditative     kinetic — steady or music-driven motion
   *   chaotic — aggressive, beat-tearing
   */
  energyTag?: 'calm' | 'kinetic' | 'chaotic';
}[] = [
  {
    id: 'none',
    label: 'None',
    blurb: 'Clean image with your brand colour grade.',
    energyTag: 'calm',
  },
  {
    id: 'wave',
    label: 'Wave',
    blurb: 'The signature WaveCanvas ripple.',
    energyTag: 'kinetic',
  },
  {
    id: 'dream',
    label: 'Dream',
    blurb: 'Slow liquid drift — the photo remembers itself.',
    energyTag: 'calm',
  },
  {
    id: 'pulse',
    label: 'Pulse',
    blurb: 'Soft ripples that breathe with the music.',
    energyTag: 'kinetic',
  },
  {
    id: 'rgb-glitch',
    label: 'RGB Glitch',
    blurb: 'Channel-split tears that burst on beats.',
    energyTag: 'chaotic',
  },
  {
    id: 'rain',
    label: 'Rain',
    blurb: 'Steady rain on glass over your artwork.',
    energyTag: 'calm',
  },
];

export function isShaderAtmosphere(id: AtmosphereId): id is ShaderAtmosphereId {
  return id === 'pulse' || id === 'rgb-glitch' || id === 'rain' || id === 'dream';
}

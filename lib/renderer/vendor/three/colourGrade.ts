/**
 * Colour grade — shared configuration and GLSL for applying a cinematic grade
 * to any shader atmosphere. One module owns the uniforms and grading math so
 * every atmosphere applies the same visual world without duplicating code.
 *
 * The grade is defined by a preset or derived from cover art:
 *   - Shadows / midtones / highlights are tinted toward three brand colours
 *   - Lift, gamma, gain, saturation, and contrast shape the tonal response
 *   - Optional film grain adds texture
 *   - A soft ACES-ish tonemap keeps highlights photographic
 *
 * Uniforms:
 *   uGradeIntensity   — 0 = bypass, 1 = full grade
 *   uBrandBackground  — shadow tint target [r,g,b] 0–1
 *   uBrandAccent      — midtone tint target [r,g,b] 0–1
 *   uBrandText        — highlight tint target [r,g,b] 0–1
 *   uGradeLift        — shadow lift (−0.1 … 0.1)
 *   uGradeGamma       — midtone gamma (0.8 … 1.2)
 *   uGradeGain        — highlight gain (0.9 … 1.2)
 *   uGradeSaturation  — saturation multiplier (0.5 … 1.5)
 *   uGradeContrast    — contrast multiplier (0.8 … 1.3)
 *   uGradeGrain       — grain strength (0 … 0.15)
 *   uTime             — seconds (for grain animation)
 */

/** Uniform declarations every grade-capable shader needs.
 *  Note: uTime is deliberately NOT declared here. It is only needed for the
 *  animated film grain inside applyColourGrade, and some atmospheres already
 *  declare uTime in their vertex shader. Declaring it in this shared block
 *  caused `uTime : redefinition` errors when the block was included in a
 *  fragment shader whose vertex stage also declared the uniform. Each shader
 *  should declare uTime itself if it needs grain animation.
 */
export const COLOUR_GRADE_UNIFORMS_GLSL = /* glsl */ `
uniform float uGradeIntensity;
uniform vec3 uBrandBackground;
uniform vec3 uBrandAccent;
uniform vec3 uBrandText;
uniform float uGradeLift;
uniform float uGradeGamma;
uniform float uGradeGain;
uniform float uGradeSaturation;
uniform float uGradeContrast;
uniform float uGradeGrain;
`;

/** GLSL colour-space helpers + the grade function. */
export const COLOUR_GRADE_GLSL = /* glsl */ `
vec3 wcSrgbToLinear(vec3 c) {
  return pow(c, vec3(2.2));
}

vec3 wcLinearToSrgb(vec3 c) {
  return pow(c, vec3(1.0 / 2.2));
}

vec3 wcTonemap(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

float wcHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 applyColourGrade(vec3 col, vec2 uv) {
  if (uGradeIntensity <= 0.001) return col;

  vec3 linearCol = wcSrgbToLinear(col);
  float luma = dot(linearCol, vec3(0.2126, 0.7152, 0.0722));

  // Tonal masks.
  float shadowMask = 1.0 - smoothstep(0.0, 0.5, luma);
  float highlightMask = smoothstep(0.5, 1.0, luma);
  float midMask = 1.0 - shadowMask - highlightMask;

  vec3 brandBg = wcSrgbToLinear(uBrandBackground);
  vec3 brandAccent = wcSrgbToLinear(uBrandAccent);
  vec3 brandText = wcSrgbToLinear(uBrandText);

  // Tint each region toward its brand colour while preserving luminance.
  vec3 graded = linearCol;
  graded = mix(graded, brandBg * (luma + 0.15), shadowMask * 0.65 * uGradeIntensity);
  graded = mix(graded, brandAccent * (luma + 0.2), midMask * 0.55 * uGradeIntensity);
  graded = mix(graded, brandText * luma, highlightMask * 0.45 * uGradeIntensity);

  // Lift / gamma / gain.
  graded += uGradeLift * uGradeIntensity;
  graded = pow(max(graded, vec3(0.0)), vec3(uGradeGamma));
  graded *= uGradeGain;

  // Contrast around mid-grey.
  graded = (graded - 0.5) * uGradeContrast + 0.5;

  // Saturation.
  float gradedLuma = dot(graded, vec3(0.2126, 0.7152, 0.0722));
  graded = mix(vec3(gradedLuma), graded, uGradeSaturation);

  // Film grain — subtle animated noise.
  if (uGradeGrain > 0.001) {
    float grain = wcHash(uv * 100.0 + uTime * 10.0) - 0.5;
    graded += grain * uGradeGrain * uGradeIntensity;
  }

  // Soft tonemap, then back to sRGB.
  graded = wcTonemap(max(graded, vec3(0.0)));
  vec3 outCol = wcLinearToSrgb(graded);

  return mix(col, outCol, clamp(uGradeIntensity, 0.0, 1.0));
}
`;

// ─── Grade presets ───────────────────────────────────────────────────────────

export interface GradePreset {
  id: string;
  label: string;
  blurb: string;
  background: string;
  accent: string;
  text: string;
  lift: number;
  gamma: number;
  gain: number;
  saturation: number;
  contrast: number;
  grain: number;
  /**
   * Tonal temperature of the grade. Used by tag-based pickers to select
   * grades by mood instead of hardcoded ids.
   *   warm    — golden/amber casts       cold — blue/moonlit/pastel casts
   *   mono    — desaturated, silver      vivid — punchy saturated contrast
   *   film    — analog film-stock feel   neutral — no tint (untreated)
   */
  temperature?: 'warm' | 'cold' | 'mono' | 'vivid' | 'film' | 'neutral';
}

export const GRADE_PRESETS: GradePreset[] = [
  {
    id: 'original',
    label: 'Original',
    blurb: 'No grade — the image as it is.',
    background: '#000000',
    accent: '#ffffff',
    text: '#ffffff',
    lift: 0,
    gamma: 1,
    gain: 1,
    saturation: 1,
    contrast: 1,
    grain: 0,
    temperature: 'neutral',
  },
  {
    id: 'analog',
    label: 'Analog',
    blurb: 'Warm film stock with soft contrast and subtle grain.',
    background: '#1a1512',
    accent: '#c9a227',
    text: '#f5e6d3',
    lift: 0.03,
    gamma: 1.05,
    gain: 1.02,
    saturation: 0.85,
    contrast: 0.92,
    grain: 0.04,
    temperature: 'film',
  },
  {
    id: 'noir',
    label: 'Noir',
    blurb: 'Crushed blacks, cold shadows, silver highlights.',
    background: '#0a0a0f',
    accent: '#4a5568',
    text: '#e2e8f0',
    lift: 0.01,
    gamma: 0.95,
    gain: 1.08,
    saturation: 0.6,
    contrast: 1.15,
    grain: 0.06,
    temperature: 'mono',
  },
  {
    id: 'warm-film',
    label: 'Warm Film',
    blurb: 'Golden highlights, amber shadows, gentle bloom.',
    background: '#1f1810',
    accent: '#d4a574',
    text: '#fff8e7',
    lift: 0.04,
    gamma: 1.08,
    gain: 1.05,
    saturation: 0.9,
    contrast: 0.95,
    grain: 0.03,
    temperature: 'warm',
  },
  {
    id: 'cold-night',
    label: 'Cold Night',
    blurb: 'Blue shadows, cyan mids, moonlit highlights.',
    background: '#0a0f1a',
    accent: '#4a6fa5',
    text: '#e0f0ff',
    lift: 0.02,
    gamma: 0.98,
    gain: 1.06,
    saturation: 0.75,
    contrast: 1.1,
    grain: 0.05,
    temperature: 'cold',
  },
  {
    id: 'dream',
    label: 'Dream',
    blurb: 'Lifted blacks, pastel tones, soft glow.',
    background: '#1a1520',
    accent: '#b8a9c9',
    text: '#f0e6ff',
    lift: 0.06,
    gamma: 1.1,
    gain: 1.0,
    saturation: 0.8,
    contrast: 0.88,
    grain: 0.02,
    temperature: 'cold',
  },
  {
    id: 'bleached',
    label: 'Bleached',
    blurb: 'High-key, washed out, sun-bleached.',
    background: '#2a2520',
    accent: '#d4c5b0',
    text: '#ffffff',
    lift: 0.08,
    gamma: 1.15,
    gain: 1.1,
    saturation: 0.5,
    contrast: 0.85,
    grain: 0.03,
    temperature: 'mono',
  },
  {
    id: 'vivid',
    label: 'Vivid',
    blurb: 'Punchy saturation, deep contrast, electric.',
    background: '#0a0a0a',
    accent: '#ff3366',
    text: '#ffffff',
    lift: 0.01,
    gamma: 0.92,
    gain: 1.1,
    saturation: 1.3,
    contrast: 1.2,
    grain: 0.02,
    temperature: 'vivid',
  },
];

/** Default brand colours (dark background, purple accent, white text). */
export const DEFAULT_BRAND_BACKGROUND: [number, number, number] = [0.06, 0.06, 0.09];
export const DEFAULT_BRAND_ACCENT: [number, number, number] = [0.66, 0.33, 0.97];
export const DEFAULT_BRAND_TEXT: [number, number, number] = [1.0, 1.0, 1.0];

/** Convert a CSS hex colour to [r, g, b] 0–1. */
export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return [0, 0, 0];
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b];
}

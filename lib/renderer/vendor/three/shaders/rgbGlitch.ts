/**
 * RGB glitch shaders in the style of the CodePen "GSAP Pixi RGB Glitch"
 * (SupremoHQ) — https://codepen.io/SupremoHQ/pen/vYEvMGG
 *
 * The pen is built with Pixi's GlitchFilter + RGBSplitFilter animated in
 * randomised GSAP bursts. This is a GLSL re-implementation of that style:
 *
 *   - Horizontal slices displaced left/right in a few random vertical
 *     clusters (re-randomised every seed step), not uniformly everywhere.
 *   - Per-channel RGB splitting — the image is desaturated first, so the
 *     fringes read as colour tearing on black & white.
 *   - Stepped random seed so the slices jump rather than drift.
 *
 * Adapted for Remotion: a low always-on simmer plus bursts on *some*
 * detected beats (gated by `burstChance`) so the glitches feel irregular.
 *
 * All tunables live in GLITCH_SETTINGS below.
 */

import {
  COVER_IMPRINT_GLSL,
  COVER_IMPRINT_UNIFORMS_GLSL,
} from '../coverImprint';
import {
  COLOUR_GRADE_GLSL,
  COLOUR_GRADE_UNIFORMS_GLSL,
} from '../colourGrade';
import {
  UV_IMPRINTS_GLSL,
  UV_IMPRINTS_UNIFORMS_GLSL,
} from '../uvImprints';
import {
  BLUR_SAMPLE_GLSL,
  BLUR_SAMPLE_UNIFORMS_GLSL,
} from './blurBackground';

export interface RgbGlitchSettings {
  /** Always-on glitch level (0 = clean). */
  baseIntensity: number;
  /** Extra intensity at the peak of a beat burst. */
  burstStrength: number;
  /** Seconds for a burst to decay back to the base level. */
  burstDecaySec: number;
  /** Extra intensity from the current audio energy (0 = none). */
  energyBoost: number;
  /** Probability that any given beat triggers a burst (0–1). */
  burstChance: number;
  /** Number of horizontal slice bands across the frame height. */
  sliceCount: number;
  /** Max horizontal slice displacement, as a fraction of frame width. */
  maxSliceOffset: number;
  /** RGB channel split magnitude, as a fraction of frame width. */
  rgbOffset: number;
  /** Amplifies the colour deviation between split channels — 0 keeps the
   *  raw split, higher values give vivid red/cyan/green fringes while the
   *  grey body stays untouched. */
  fringeBoost: number;
  /** Channel split directions (x = horizontal, y = vertical). */
  redDir: { x: number; y: number };
  greenDir: { x: number; y: number };
  blueDir: { x: number; y: number };
  /** Bands above this hash threshold tear harder than the rest. */
  bigTearThreshold: number;
  /** Offset multiplier applied to big-tear bands. */
  bigTearMultiplier: number;
  /** Fraction of bands displaced at full intensity inside a cluster. */
  bandCoverage: number;
  /** Number of random vertical glitch clusters per seed step. */
  clusterCount: number;
  /** Whole-frame vertical jitter, as a fraction of frame height. */
  verticalJitter: number;
  /** Base seed steps per second — bursts multiply this, so glitches jump
   *  faster when the music hits. */
  seedStepsPerSec: number;
  /** Default for the uGrayscaleMix uniform when no per-video override is
   *  passed: 1 = full black & white (colour fringes only), 0 = colour. */
  grayscaleMix: number;
}

export const GLITCH_SETTINGS: RgbGlitchSettings = {
  baseIntensity: 0.05,
  burstStrength: 0.55,
  burstDecaySec: 0.5,
  energyBoost: 0.25,
  burstChance: 0.5,
  sliceCount: 64,
  maxSliceOffset: 0.06,
  rgbOffset: 0.02,
  fringeBoost: 2.5,
  redDir: { x: -1.0, y: 0.0 },
  greenDir: { x: 0.0, y: 0.6 },
  blueDir: { x: 1.0, y: 0.0 },
  bigTearThreshold: 0.92,
  bigTearMultiplier: 2.5,
  bandCoverage: 0.5,
  clusterCount: 3,
  verticalJitter: 0.003,
  seedStepsPerSec: 6,
  grayscaleMix: 0.0,
};

/** GLSL ES 1.00 has no implicit int→float conversion, so keep decimals. */
const f = (value: number): string => {
  const str = String(value);
  return str.includes('.') || str.includes('e') ? str : `${str}.0`;
};

export const GLITCH_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const GLITCH_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform vec2 uImageResolution;
uniform float uSeed;
uniform float uIntensity;
uniform float uGrayscaleMix;
${COVER_IMPRINT_UNIFORMS_GLSL}
${UV_IMPRINTS_UNIFORMS_GLSL}
${COLOUR_GRADE_UNIFORMS_GLSL}
${BLUR_SAMPLE_UNIFORMS_GLSL}

#define SLICE_COUNT ${f(GLITCH_SETTINGS.sliceCount)}
#define MAX_SLICE_OFFSET ${f(GLITCH_SETTINGS.maxSliceOffset)}
#define RGB_OFFSET ${f(GLITCH_SETTINGS.rgbOffset)}
#define RED_DIR vec2(${f(GLITCH_SETTINGS.redDir.x)}, ${f(GLITCH_SETTINGS.redDir.y)})
#define GREEN_DIR vec2(${f(GLITCH_SETTINGS.greenDir.x)}, ${f(GLITCH_SETTINGS.greenDir.y)})
#define BLUE_DIR vec2(${f(GLITCH_SETTINGS.blueDir.x)}, ${f(GLITCH_SETTINGS.blueDir.y)})
#define BIG_TEAR_THRESHOLD ${f(GLITCH_SETTINGS.bigTearThreshold)}
#define BIG_TEAR_MULTIPLIER ${f(GLITCH_SETTINGS.bigTearMultiplier)}
#define BAND_COVERAGE ${f(GLITCH_SETTINGS.bandCoverage)}
#define VERTICAL_JITTER ${f(GLITCH_SETTINGS.verticalJitter)}
#define FRINGE_BOOST ${f(GLITCH_SETTINGS.fringeBoost)}
#define LUMA vec3(0.299, 0.587, 0.114)

float hash(float n) {
  return fract(sin(n) * 43758.5453);
}

// Cover-fit UV so the image keeps its aspect ratio on any output size.
vec2 coverUv(vec2 uv, vec2 canvasResolution, vec2 imageResolution) {
  float canvasAspect = canvasResolution.x / canvasResolution.y;
  float imageAspect = imageResolution.x / imageResolution.y;
  vec2 scale = vec2(1.0);

  if (canvasAspect > imageAspect) {
    scale.y = imageAspect / canvasAspect;
  } else {
    scale.x = canvasAspect / imageAspect;
  }

  return (uv - 0.5) * scale + 0.5;
}

// One glitch cluster: a random vertical band with soft edges. The gate
// decides whether this cluster exists at all for the current seed.
float cluster(float seedOffset, float y) {
  float centre = hash(uSeed * 13.7 + seedOffset * 71.3);
  float clusterWidth = 0.02 + 0.10 * hash(uSeed * 29.1 + seedOffset * 17.9);
  float clusterOn = step(0.6, hash(uSeed * 7.7 + seedOffset * 3.1));
  float d = abs(y - centre);
  return clusterOn * smoothstep(clusterWidth, clusterWidth * 0.3, d);
}

${COVER_IMPRINT_GLSL}
${UV_IMPRINTS_GLSL}
${COLOUR_GRADE_GLSL}
${BLUR_SAMPLE_GLSL}

// Scene sample: the image only — the cover imprint is composited after
// grading so it stays ungraded and stands out.
vec3 sampleScene(vec2 uv) {
  vec2 imageUv = coverUv(clamp(uv, vec2(0.001), vec2(0.999)), uResolution, uImageResolution);
  return sampleBackgroundBlurred(uTexture, imageUv);
}

void main() {
  float intensity = clamp(uIntensity, 0.0, 1.5);

  // Random vertical clusters — the glitch lives in a few narrow regions that
  // move every seed step, rather than covering the whole frame evenly.
  // (Unrolled: ANGLE is picky about loops in some drivers.)
  float clusterMask = 0.0;
  clusterMask = max(clusterMask, cluster(0.0, vUv.y));
  clusterMask = max(clusterMask, cluster(1.0, vUv.y));
  clusterMask = max(clusterMask, cluster(2.0, vUv.y));

  // Whole-frame vertical jitter, quantized by the stepped seed.
  float jitter = (hash(uSeed * 1.7) - 0.5) * 2.0 * VERTICAL_JITTER * intensity;

  // Slice displacement inside the clusters: only some bands move — fewer
  // when calm, more during bursts. A small fraction tear harder.
  float band = floor(vUv.y * SLICE_COUNT);
  float bandRand = hash(band * 17.31 + uSeed * 91.7);
  float bandGate = hash(band * 7.13 + uSeed * 37.3);
  float gateThreshold = 1.0 - BAND_COVERAGE * min(intensity, 1.0);
  float bandOn = step(gateThreshold, bandGate);
  float bigTear = 1.0 +
    step(BIG_TEAR_THRESHOLD, hash(band * 3.7 + uSeed * 13.1)) *
      (BIG_TEAR_MULTIPLIER - 1.0);
  float sliceOffset =
    (bandRand - 0.5) * 2.0 * MAX_SLICE_OFFSET * intensity * bandOn *
    bigTear * clusterMask;

  vec2 uv = vec2(vUv.x + sliceOffset, vUv.y + jitter);

  // RGB channel split, localised to the clusters (RGBSplitFilter style).
  vec2 rgbShift =
    RGB_OFFSET * intensity * clusterMask *
    vec2(1.0, uResolution.x / uResolution.y);

  vec3 sBase = sampleScene(uv);
  vec3 sR = sampleScene(uv + RED_DIR * rgbShift);
  vec3 sG = sampleScene(uv + GREEN_DIR * rgbShift);
  vec3 sB = sampleScene(uv + BLUE_DIR * rgbShift);

  // Body: the image with slice displacement only, optionally desaturated.
  vec3 bodyCol = mix(sBase, vec3(dot(sBase, LUMA)), uGrayscaleMix);

  // Fringe: the deviation introduced purely by the channel offsets. It is
  // zero wherever the split is inactive, so the base image is never tinted.
  float rS = mix(sR.r, dot(sR, LUMA), uGrayscaleMix);
  float gS = mix(sG.g, dot(sG, LUMA), uGrayscaleMix);
  float bS = mix(sB.b, dot(sB, LUMA), uGrayscaleMix);
  vec3 fringe = vec3(rS, gS, bS) - bodyCol;

  vec3 col = bodyCol + fringe * (1.0 + FRINGE_BOOST);

  // UV-locked imprints (watermark, artist mark, …) — locked to the cover-fit
  // image UV (no glitch slices) so they stay proportioned correctly on
  // portrait outputs, and composited before the grade so they receive the
  // same grade/grain as the imagery.
  vec2 cleanImageUv = coverUv(vUv, uResolution, uImageResolution);
  col = applyUvImprints(col, cleanImageUv);

  // Shared brand colour grade — applied to the background BEFORE the cover
  // imprint so the imprint stays ungraded and stands out.
  col = applyColourGrade(col, vUv);

  // Cover imprint — sampled clean (no slice offset, no jitter) so the ghost
  // keeps its original colours and doesn't pick up the grade.
  vec2 cl = coverLocalUv();
  vec3 cover = texture2D(uCover, clamp(cl, vec2(0.001), vec2(0.999))).rgb;
  col = applyCoverImprint(col, cover, cl);

  gl_FragColor = vec4(col, 1.0);
}
`;

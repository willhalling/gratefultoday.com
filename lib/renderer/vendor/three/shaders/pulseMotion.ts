/**
 * Pulse-motion shaders adapted from Codrops' "Animate Shaders with GSAP" demo 1.
 *
 * Original: https://github.com/codrops/AnimateShadersWithGSAP
 *
 * A travelling radial ripple packet expands outward from the centre of the
 * image, followed by a circular grayscale/colour transition. This matches
 * demo 1 as closely as possible: an OrthographicCamera, a plane sized to the
 * output dimensions, and a vertex displacement on `position.y` driven by a
 * radial sine wave.
 *
 * Adapted for Remotion so the pulse is triggered by audio beats (or a steady
 * fallback) rather than mouse clicks.
 *
 * All tunables live in PULSE_SETTINGS below — tweak away.
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

export interface PulseMotionSettings {
  /** Ripple displacement strength (demo used 0.1, tuned for ~400px cards).
   *  Bump to ~0.2 if you want the wave to hit harder at fullscreen. */
  amplitude: number;
  /** Number of ripple rings across the plane. */
  frequency: number;
  /** Distance falloff clamps — higher = flatter amplitude across the plane. */
  decayMin: number;
  decayMax: number;
  /** Brightness kick along the ripple (`color += vRipple * brightnessKick`). */
  brightnessKick: number;
  /** How fast the ripple phase advances (demo ≈ 6 units/sec). */
  timeScale: number;
  /** Length of one pulse in seconds. */
  pulseDurationSec: number;
  /** Fallback pulse interval when no audio beats are available. */
  fallbackPulseIntervalSec: number;
  /** Ripple strength = base + audioEnergy * range. */
  rippleEnergyBase: number;
  rippleEnergyRange: number;
  /** Plane tessellation (segments per axis). Higher = smoother wave. */
  tessellation: number;
  /** Ripple epicentre in UV space (0.5, 0.5 = composition centre). */
  center: { x: number; y: number };
}

export const PULSE_SETTINGS: PulseMotionSettings = {
  amplitude: 0.1,
  frequency: 8.0,
  decayMin: 8.0,
  decayMax: 10.0,
  brightnessKick: 2.0,
  timeScale: 6.0,
  pulseDurationSec: 1.35,
  fallbackPulseIntervalSec: 2.5,
  rippleEnergyBase: 0.5,
  rippleEnergyRange: 0.5,
  tessellation: 100,
  center: { x: 0.5, y: 0.5 },
};

/** GLSL ES 1.00 has no implicit int→float conversion, so keep decimals. */
const f = (value: number): string => {
  const str = String(value);
  return str.includes('.') || str.includes('e') ? str : `${str}.0`;
};

export const PULSE_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
varying float vRipple;

uniform float uRippleProgress;
uniform float uTime;
uniform vec2 uMouse;

#define AMP ${f(PULSE_SETTINGS.amplitude)}
#define FREQ ${f(PULSE_SETTINGS.frequency)}
#define DECAY_MIN ${f(PULSE_SETTINGS.decayMin)}
#define DECAY_MAX ${f(PULSE_SETTINGS.decayMax)}
#define PI 3.14159265359

void main() {
  vec3 pos = position;

  // Distance from the pulse centre in UV space.
  float dist = distance(uv, uMouse);

  // Decay clamps to a large value so the ripple stays subtle at the edges.
  float decay = clamp(dist, DECAY_MIN, DECAY_MAX);

  // Travelling radial ripple packet.
  float ripple = sin(-PI * FREQ * dist + uTime) * (AMP / decay);
  ripple *= uRippleProgress;

  // Demo 1 displaces the geometry vertically; this makes the wave read as a
  // real 3D ripple rather than a UV distortion.
  pos.y += ripple;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

  vUv = uv;
  vRipple = ripple;
}
`;

export const PULSE_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying float vRipple;

uniform float uTime;
uniform float uGrayscaleProgress;
uniform vec2 uMouse;
uniform float uDirection;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform vec2 uImageResolution;
${COVER_IMPRINT_UNIFORMS_GLSL}
${UV_IMPRINTS_UNIFORMS_GLSL}
${COLOUR_GRADE_UNIFORMS_GLSL}
${BLUR_SAMPLE_UNIFORMS_GLSL}

#define BRIGHTNESS_KICK ${f(PULSE_SETTINGS.brightnessKick)}

vec3 toGrayscale(vec3 color) {
  float gray = dot(color, vec3(0.299, 0.587, 0.114));
  return vec3(gray);
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

// Maximum distance from a point to the four corners of the UV square.
float getMaxDistFromCorners(vec2 coords) {
  float dist_bl = distance(coords, vec2(0.0, 0.0));
  float dist_br = distance(coords, vec2(1.0, 0.0));
  float dist_tl = distance(coords, vec2(0.0, 1.0));
  float dist_tr = distance(coords, vec2(1.0, 1.0));
  return max(dist_tl, max(dist_bl, max(dist_tr, dist_br)));
}

${COVER_IMPRINT_GLSL}
${UV_IMPRINTS_GLSL}
${COLOUR_GRADE_GLSL}
${BLUR_SAMPLE_GLSL}

void main() {
  vec2 imageUv = coverUv(vUv, uResolution, uImageResolution);
  vec2 sampleUv = clamp(imageUv, vec2(0.001), vec2(0.999));

  vec4 diffuse = vec4(sampleBackgroundBlurred(uTexture, sampleUv), 1.0);

  vec3 grayscale = toGrayscale(diffuse.rgb);

  // Grayscale/colour mask expands from the pulse centre.
  float dist = distance(vUv, uMouse);
  float maxDist = getMaxDistFromCorners(uMouse);
  float mask = smoothstep(uGrayscaleProgress - 0.1, uGrayscaleProgress, dist / maxDist);

  vec3 color1 = uDirection > 0.0 ? diffuse.rgb : grayscale;
  vec3 color2 = uDirection > 0.0 ? grayscale : diffuse.rgb;

  vec3 color = mix(color1, color2, mask);

  // Brightness kick along the ripple.
  color += vRipple * BRIGHTNESS_KICK;

  // UV-locked imprints (watermark, artist mark, …) — locked to the cover-fit
  // image UV so they stay proportioned correctly on portrait outputs with
  // landscape images, and composited before the grade so they receive the
  // same grade/grain as the imagery.
  color = applyUvImprints(color, imageUv);

  // Shared brand colour grade — applied to the background BEFORE the cover
  // imprint so the imprint stays ungraded and stands out.
  color = applyColourGrade(color, vUv);

  // Cover imprint — sampled clean (no pulse effect) so the ghost keeps its
  // original colours and doesn't pick up the grade.
  vec2 cl = coverLocalUv();
  vec3 cover = texture2D(uCover, clamp(cl, vec2(0.001), vec2(0.999))).rgb;
  color = applyCoverImprint(color, cover, cl);

  gl_FragColor = vec4(color, diffuse.a);
}
`;

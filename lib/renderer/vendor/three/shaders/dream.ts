/**
 * Dream shaders — the photograph "remembers itself": the image flows like a
 * liquid memory while staying fully recognisable.
 *
 * Original WaveCanvas implementation. How it reads:
 *   - A curl-noise flow field (the divergence-free gradient of a simplex
 *     potential, rotated 90°) displaces the image UVs. Curl noise swirls
 *     around vortices instead of sliding in one direction — that is what
 *     separates "dream" from the uniform Wave ripple.
 *   - Two layers: broad currents that carry whole regions, and finer
 *     eddies warped by the broad ones so hair, clouds and water stir on
 *     their own.
 *   - The image is sampled three times along the local flow direction, so
 *     motion smears softly — liquid, not wobble.
 *   - The noise is 2D simplex noise by Ashima Arts / Ian McEwan (MIT
 *     license, webgl-noise) — used with credit; everything else here is
 *     original WaveCanvas code.
 *   - Audio energy only widens the drift; nothing snaps to the beat.
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

export interface DreamSettings {
  /** Spatial scale of the largest currents (field units per frame height). */
  fieldScale: number;
  /** Global speed multiplier for the flow. */
  timeScale: number;
  /** Max displacement as a fraction of frame height, at full intensity. */
  amplitude: number;
  /** How strongly audio energy widens the drift (0 = steady weather). */
  energyResponse: number;
  /** Smear reach — how far along the flow the extra taps sample. */
  smear: number;
  /** Breathing zoom depth (fractional scale swing). */
  breathe: number;
}

export const DREAM_SETTINGS: DreamSettings = {
  fieldScale: 1.1,
  timeScale: 1,
  amplitude: 0.016,
  energyResponse: 0.5,
  smear: 0.45,
  breathe: 0.008,
};

/** GLSL ES 1.00 has no implicit int→float conversion, so keep decimals. */
const f = (value: number): string => {
  const str = String(value);
  return str.includes('.') || str.includes('e') ? str : `${str}.0`;
};

export const DREAM_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const DREAM_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;

out vec4 fragColor;

uniform float uTime;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform vec2 uImageResolution;
uniform float uIntensity;
uniform float uEnergy;
${COVER_IMPRINT_UNIFORMS_GLSL}
${UV_IMPRINTS_UNIFORMS_GLSL}
${COLOUR_GRADE_UNIFORMS_GLSL}
${BLUR_SAMPLE_UNIFORMS_GLSL}

#define FIELD_SCALE ${f(DREAM_SETTINGS.fieldScale)}
#define TIME_SCALE ${f(DREAM_SETTINGS.timeScale)}
#define AMPLITUDE ${f(DREAM_SETTINGS.amplitude)}
#define ENERGY_RESPONSE ${f(DREAM_SETTINGS.energyResponse)}
#define SMEAR ${f(DREAM_SETTINGS.smear)}
#define BREATHE ${f(DREAM_SETTINGS.breathe)}

// ─── 2D simplex noise ────────────────────────────────────────────────────────
// Copyright (C) 2011 Ashima Arts (Ian McEwan). MIT license.
// https://github.com/ashima/webgl-noise
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) +
                   i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                          dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
// ─── end simplex noise ───────────────────────────────────────────────────────

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

// Flow potential: 3-octave simplex fbm drifting slowly through the field.
float potential(vec2 p, float t) {
  float v = 0.0;
  float a = 0.55;
  vec2 q = p + vec2(t * 0.06, -t * 0.04);

  for (int i = 0; i < 3; i++) {
    v += a * snoise(q);
    q = q * 2.03 + vec2(1.7, 9.2) + vec2(t * 0.03, t * 0.02);
    a *= 0.5;
  }

  return v;
}

// Curl of the potential — divergence-free flow: the field swirls around
// vortices instead of sliding in one direction.
vec2 curl(vec2 p, float t) {
  float e = 0.08;
  float dx = potential(p + vec2(e, 0.0), t) - potential(p - vec2(e, 0.0), t);
  float dy = potential(p + vec2(0.0, e), t) - potential(p - vec2(0.0, e), t);
  return vec2(dy, -dx) / (2.0 * e);
}

#define IMPRINT_SAMPLE(t, uv) texture(t, uv)
#define UV_IMPRINT_SAMPLE(t, uv) texture(t, uv)
${COVER_IMPRINT_GLSL}
${UV_IMPRINTS_GLSL}
${COLOUR_GRADE_GLSL}
${BLUR_SAMPLE_GLSL}

vec3 sampleImage(vec2 uv) {
  vec2 imageUv = coverUv(uv, uResolution, uImageResolution);
  return sampleBackgroundBlurred(uTexture, clamp(imageUv, vec2(0.001), vec2(0.999)));
}

void main() {
  float t = uTime * TIME_SCALE;

  // Aspect-correct space: y spans one unit at any output aspect ratio.
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 p = (vUv - 0.5) * aspect * FIELD_SCALE;

  // Broad currents carry whole regions; finer eddies, warped by the broad
  // ones, stir the detail.
  vec2 c1 = curl(p, t);
  vec2 c2 = curl(p * 2.3 + c1 * 0.35 + 5.0, t * 1.4);
  vec2 flow = (c1 + 0.35 * c2) / 2.5;

  // Energy only widens the drift — the dream never sits fully still, and
  // never snaps to the beat.
  float movement = 1.0 + ENERGY_RESPONSE * clamp(uEnergy, 0.0, 1.5);
  vec2 disp = flow * (AMPLITUDE * uIntensity * movement) / FIELD_SCALE;

  // A whisper of breathing zoom around the frame centre.
  float breatheZoom = 1.0 + BREATHE * uIntensity * sin(t * 0.15 + 1.3);
  vec2 uv = (vUv - 0.5) / breatheZoom + 0.5;

  // Sample along the local flow so motion smears softly — liquid, not
  // wobble.
  vec3 col = sampleImage(uv + disp * (1.0 + SMEAR * 0.6)) * 0.25 +
    sampleImage(uv + disp) * 0.5 +
    sampleImage(uv + disp * (1.0 - SMEAR * 0.6)) * 0.25;

  // UV-locked imprints (watermark, artist mark, …) — locked to the cover-fit
  // image UV (before dream flow) so they stay proportioned correctly on
  // portrait outputs, and composited before the grade so they receive the
  // same grade/grain as the imagery.
  vec2 cleanImageUv = coverUv(vUv, uResolution, uImageResolution);
  col = applyUvImprints(col, cleanImageUv);

  // Shared brand colour grade — applied to the background BEFORE the cover
  // imprint so the imprint stays ungraded and stands out.
  col = applyColourGrade(col, vUv);

  // Cover imprint — sampled clean (no flow displacement) so the ghost
  // keeps its original colours and doesn't pick up the grade.
  vec2 cl = coverLocalUv();
  vec3 cover = texture(uCover, clamp(cl, vec2(0.001), vec2(0.999))).rgb;
  col = applyCoverImprint(col, cover, cl);

  fragColor = vec4(col, 1.0);
}
`;

/**
 * Imprint slot system — shared GLSL and geometry helpers for compositing any
 * screen-locked image inside a shader atmosphere.
 *
 * A slot is just a prefix (e.g. "Cover", "Watermark") plus a rect/alpha pair.
 * The React side (`useImprintSlot`) owns texture loading, rect normalisation
 * and disposal; the GLSL side owns the screen-local UV math and the soft-edge
 * mask. Each shader calls the sampler itself so GLSL 1.0 `texture2D`, GLSL 3
 * `texture`/`textureLod`, and raw-WebGL can all use the same mask code.
 */

import * as THREE from 'three';

export interface ImprintRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Convert a screen rect from top-left pixel space (DOM style) to the shader's
 * normalised screen space: origin bottom-left, y up. Returns a plain object
 * compatible with `new THREE.Vector4(x, y, width, height)`.
 */
export function normaliseImprintRect(
  rect: ImprintRect,
  frameWidth: number,
  frameHeight: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: rect.x / frameWidth,
    y: 1 - (rect.y + rect.height) / frameHeight,
    width: rect.width / frameWidth,
    height: rect.height / frameHeight,
  };
}

/**
 * Same as `normaliseImprintRect` but returns a tuple for raw-WebGL callers.
 */
export function normaliseImprintRectTuple(
  rect: ImprintRect | null | undefined,
  frameWidth: number,
  frameHeight: number,
): [number, number, number, number] {
  if (!rect) return [0, 0, 1, 1];
  const n = normaliseImprintRect(rect, frameWidth, frameHeight);
  return [n.x, n.y, n.width, n.height];
}

/**
 * Build a `THREE.Vector4` in normalised screen space for an optional rect.
 * When no rect is supplied, returns a safe placeholder that the shader will
 * ignore because the slot's alpha is zero.
 */
export function imprintRectVector(
  rect: ImprintRect | null | undefined,
  frameWidth: number,
  frameHeight: number,
): THREE.Vector4 {
  if (!rect) return new THREE.Vector4(0, 0, 1, 1);
  const n = normaliseImprintRect(rect, frameWidth, frameHeight);
  return new THREE.Vector4(n.x, n.y, n.width, n.height);
}

/**
 * Uniform declarations for one imprint slot.
 *
 * `prefix` becomes `u{Prefix}`, `u{Prefix}Rect`, `u{Prefix}Alpha`.
 */
export function imprintUniformsGlsl(prefix: string): string {
  return /* glsl */ `
uniform sampler2D u${prefix};
uniform vec4 u${prefix}Rect;
uniform float u${prefix}Alpha;
`;
}

/**
 * Mask + optional emboss for an imprint box.
 *
 * `u{Prefix}Rect` is (x, y, w, h) in screen-normalised space (y up,
 * bottom-left origin). `u{Prefix}Alpha` 0 disables the imprint. The caller
 * samples `u{Prefix}` itself (texture2D / texture / textureLod depending on
 * the shader) at `{prefix}LocalUv()`.
 *
 * When `emboss` is true, a soft inner light / outer shadow is added so the
 * imprint feels pressed into the scene rather than stuck on top.
 *
 * When `sampleAlpha` is true, the apply function expects a `vec4` sample and
 * multiplies the box mask by the sample's alpha. Use this for textures with
 * transparent regions (e.g. the watermark badge rendered onto a clear canvas).
 */
export function imprintGlsl(
  prefix: string,
  { emboss = false, sampleAlpha = false }: { emboss?: boolean; sampleAlpha?: boolean } = {},
): string {
  const localUvFn = `${prefix.charAt(0).toLowerCase()}${prefix.slice(1)}LocalUv`;
  const applyFn = `apply${prefix}Imprint`;
  const sampleParam = sampleAlpha ? 'vec4 imprint' : 'vec3 imprint';
  const sampleRgb = sampleAlpha ? 'imprint.rgb' : 'imprint';
  const sampleMask = sampleAlpha ? 'mask * imprint.a' : 'mask';

  return /* glsl */ `
#ifndef IMPRINT_SAMPLE
#define IMPRINT_SAMPLE(t, uv) texture2D(t, uv)
#endif

// Hash + value noise for organic glass-surface waviness. Real glass is never
// a perfect mathematical lens; these small ripples make the refraction feel
// tactile and premium.
float ${prefix}Hash12(vec2 q) {
  vec3 p3 = fract(vec3(q.xyx) * vec3(0.1031, 0.11369, 0.13787));
  p3 += dot(p3.zxy, p3.yzx + 19.19);
  return fract((p3.x + p3.y) * p3.z);
}
float ${prefix}Noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = ${prefix}Hash12(i);
  float b = ${prefix}Hash12(i + vec2(1.0, 0.0));
  float c = ${prefix}Hash12(i + vec2(0.0, 1.0));
  float d = ${prefix}Hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec2 ${localUvFn}() {
  // Pin the imprint to screen coordinates so it stays aligned with the real
  // on-screen element even when camera motion moves the background plane.
  vec2 screenUv = gl_FragCoord.xy / uResolution;
  return (screenUv - u${prefix}Rect.xy) / u${prefix}Rect.zw;
}

vec3 ${applyFn}(vec3 background, ${sampleParam}, vec2 localUv) {
  if (u${prefix}Alpha <= 0.001) return background;

  // Signed distance to the imprint box in local units (negative in).
  vec2 b = abs(localUv - 0.5) - 0.5;
  float sd = max(b.x, b.y);
  float feather = 0.012;
  float mask = smoothstep(feather, -feather, sd) * u${prefix}Alpha;

  // Lift the imprint brightness so the ghost reads as a brighter, more
  // natural version of the cover rather than a muddy blend into the grade.
  vec3 brightened = ${sampleRgb} * 1.25;
  vec3 col = mix(background, brightened, ${sampleMask});

${
  emboss
    ? /* glsl */ `
  // Glass library-style refraction: the cover art is treated as a raster
  // snapshot behind a glossy glass pane. The pane displaces and blurs the
  // image underneath, then adds Fresnel reflection and a specular highlight.
  vec2 p = (localUv - 0.5) * 2.0;
  p.x *= u${prefix}Rect.z / max(u${prefix}Rect.w, 0.0001);
  float distFromCenter = length(p);

  // Displacement field from noise — this is what warps the image under the pane.
  float dispNoise = ${prefix}Noise2(localUv * 9.0) * 0.06 + ${prefix}Noise2(localUv * 28.0) * 0.02;
  dispNoise *= smoothstep(0.4, 0.85, distFromCenter);

  // Normal from the displacement gradient.
  float e = 0.004;
  float dx = (${prefix}Noise2((localUv + vec2(e, 0.0)) * 9.0) - ${prefix}Noise2((localUv - vec2(e, 0.0)) * 9.0)) * 0.06;
  float dy = (${prefix}Noise2((localUv + vec2(0.0, e)) * 9.0) - ${prefix}Noise2((localUv - vec2(0.0, e)) * 9.0)) * 0.06;
  dx += (${prefix}Noise2((localUv + vec2(e, 0.0)) * 28.0) - ${prefix}Noise2((localUv - vec2(e, 0.0)) * 28.0)) * 0.02;
  dy += (${prefix}Noise2((localUv + vec2(0.0, e)) * 28.0) - ${prefix}Noise2((localUv - vec2(0.0, e)) * 28.0)) * 0.02;
  vec3 lensNormal = normalize(vec3(dx, dy, 1.0));

  vec3 I = vec3(0.0, 0.0, -1.0);

  // Refraction offset — the glass bends the cover image underneath.
  vec3 refractDir = refract(I, lensNormal, 0.60606061); // 1.0 / 1.65
  vec2 refractOffset = refractDir.xy / max(0.01, abs(refractDir.z)) * 0.08;
  refractOffset = clamp(refractOffset + dispNoise, vec2(-0.16), vec2(0.16));

  // 9-tap tent blur of the cover art at the refracted UV.
  vec2 baseUV = clamp(localUv + refractOffset, vec2(0.001), vec2(0.999));
  vec3 refractColor = vec3(0.0);
  float refractWeightSum = 0.0;
  for (int i = -1; i <= 1; i++) {
    for (int j = -1; j <= 1; j++) {
      vec2 off = vec2(float(i), float(j)) * 0.009;
      float w = (1.0 - abs(float(i)) * 0.5) * (1.0 - abs(float(j)) * 0.5);
      refractColor += IMPRINT_SAMPLE(uCover, clamp(baseUV + off, vec2(0.001), vec2(0.999))).rgb * w;
      refractWeightSum += w;
    }
  }
  refractColor = (refractColor / refractWeightSum) * 1.04 + 0.015;

  // Surface reflection — a blurred mirror of the cover art at glancing angles.
  vec3 reflectDir = reflect(I, lensNormal);
  vec2 reflectOffset = reflectDir.xy * 0.07;
  vec2 reflectUV = clamp(localUv + reflectOffset, vec2(0.001), vec2(0.999));
  vec3 reflectColor = vec3(0.0);
  float reflectWeightSum = 0.0;
  for (int i = -1; i <= 1; i++) {
    for (int j = -1; j <= 1; j++) {
      vec2 off = vec2(float(i), float(j)) * 0.012;
      float w = (1.0 - abs(float(i)) * 0.5) * (1.0 - abs(float(j)) * 0.5);
      reflectColor += IMPRINT_SAMPLE(uCover, clamp(reflectUV + off, vec2(0.001), vec2(0.999))).rgb * w;
      reflectWeightSum += w;
    }
  }
  reflectColor = (reflectColor / reflectWeightSum) * 1.1;

  // Schlick Fresnel: reflection is strongest at glancing angles.
  float VdotN = abs(dot(I, lensNormal));
  float f0 = 0.04;
  float fresnel = f0 + (1.0 - f0) * pow(1.0 - VdotN, 5.0);

  vec3 glassColor = mix(refractColor, reflectColor, fresnel * 0.5);

  // Specular highlight from a virtual top-left light.
  vec3 lightDir = normalize(vec3(0.35, 0.55, -0.75));
  vec3 halfDir = normalize(lightDir + I);
  float NdotH = max(dot(lensNormal, halfDir), 0.0);
  float specular = pow(NdotH, 110.0) * 0.75;
  glassColor += vec3(1.0) * specular;

  // Composite the glass-covered cover over the imprint area.
  col = mix(col, glassColor, mask);
`
    : /* glsl */ ``
}
  return col;
}
`;
}

/**
 * UV-space variant of the imprint mask.
 *
 * `u{Prefix}Rect` is (x, y, w, h) in background-image UV space (0–1). The
 * caller passes the same image UV it uses for the background sample, so the
 * imprint is locked to the image content and moves with it under camera motion.
 */
export function imprintUvGlsl(
  prefix: string,
  { sampleAlpha = false }: { sampleAlpha?: boolean } = {},
): string {
  const localUvFn = `${prefix.charAt(0).toLowerCase()}${prefix.slice(1)}LocalUv`;
  const applyFn = `apply${prefix}Imprint`;
  const sampleParam = sampleAlpha ? 'vec4 imprint' : 'vec3 imprint';
  const sampleRgb = sampleAlpha ? 'imprint.rgb' : 'imprint';
  const sampleMask = sampleAlpha ? 'mask * imprint.a' : 'mask';

  return /* glsl */ `
vec2 ${localUvFn}(vec2 sampleUv) {
  // Lock the imprint to the image UV (after cover-fit) so it travels with
  // the image content rather than the raw plane UVs, which would distort
  // when the output aspect differs from the image aspect.
  return (sampleUv - u${prefix}Rect.xy) / u${prefix}Rect.zw;
}

vec3 ${applyFn}(vec3 background, ${sampleParam}, vec2 localUv) {
  if (u${prefix}Alpha <= 0.001) return background;

  // Signed distance to the imprint box in local units (negative in).
  vec2 b = abs(localUv - 0.5) - 0.5;
  float sd = max(b.x, b.y);
  float feather = 0.012;
  float mask = smoothstep(feather, -feather, sd) * u${prefix}Alpha;

  return mix(background, ${sampleRgb}, ${sampleMask});
}
`;
}

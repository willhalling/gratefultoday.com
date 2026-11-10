/**
 * UV-locked imprint slots — the generic system for compositing screen images
 * (watermark badge, artist mark, …) INSIDE a shader atmosphere.
 *
 * An imprint is pure data (`UvImprintSpec`); the scenes own no per-imprint
 * plumbing. Each WebGL scene:
 *   1. accepts a single `uvImprints?: UvImprintSpec[]` prop,
 *   2. calls `useUvImprintSlots(specs, …)` (texture load, rect, alpha, disposal),
 *   3. spreads `uvImprintUniforms(...)` into its ShaderMaterial and calls
 *      `syncUvImprintUniforms(...)` per frame,
 *   4. includes `UV_IMPRINTS_UNIFORMS_GLSL` + `UV_IMPRINTS_GLSL` in its shader
 *      and calls `applyUvImprints(col, imageUv)` BEFORE the colour grade so
 *      imprints receive the same grade/grain as the imagery.
 *
 * Because rects are background-image UV rects, every imprint travels with the
 * image content under camera motion. Adding a new imprint = push a spec into
 * the composition's array; adding a new scene = the four steps above.
 *
 * Cover art is deliberately NOT part of this system — several scenes give the
 * cover specialised treatment (glass emboss, rain fog with mipmaps).
 *
 * Framework-free: GLSL chunks, spec/rect types, rect math and the uniform
 * builders live here. (The React texture-loading hook `useUvImprintSlots`
 * that consumed this module was Remotion-only and is gone with the tree.)
 */

import * as THREE from 'three';

/** Max simultaneous imprints — fixed so shaders can use constant-bound loops
 *  (required for sampler-array indexing in GLSL ES 1.00). */
export const MAX_UV_IMPRINTS = 4;

export interface UvImprintSpec {
  /** Source image URL. Null/undefined disables the slot. */
  imageUrl?: string | null;
  /** Natural pixel size of the imprint image — needed for aspect-correct sizing. */
  naturalSize?: { width: number; height: number } | null;
  /** Overall opacity. 0 (or missing texture/rect) disables the slot. */
  alpha?: number;
  /**
   * Exact on-screen rect in pixels, top-left origin (DOM space) — converted
   * to an image-UV rect with the same cover-fit transform the shaders use,
   * so the imprint lands EXACTLY where the corresponding HTML overlay does.
   * Takes precedence over `position`/`heightFraction`/`scale`.
   */
  screenRect?: { left: number; top: number; width: number; height: number } | null;
  /**
   * When true (requires `screenRect`), the scene recomputes the screen→plane
   * rect with the CURRENT camera pose every frame, so the imprint stays glued
   * to its screen position instead of travelling with the world. Use for
   * imprints that must never drift across fixed layout boundaries (e.g. the
   * TikTok outro credit at the solid-zone edge).
   */
  frameLocked?: boolean;
  /** Centre of the imprint in image UV space. Defaults to lower-center. */
  position?: { x: number; y: number };
  /** Size multiplier (e.g. the per-video logo-size slider). Default 1. */
  scale?: number;
  /** Fraction of the image height the imprint occupies before `scale`.
   *  Defaults to 0.06 (0.04 portrait) — the watermark badge size. */
  heightFraction?: number;
  /** Generate mipmaps after load (only needed for textureLod sampling). */
  generateMipmaps?: boolean;
}

export interface UvImprintRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Convert an on-screen rect (DOM pixels, top-left origin) to a
 * background-image UV rect using the same cover-fit transform the shaders
 * apply (`imageUv = (screenUv - 0.5) * scale + 0.5`). This is exact — the
 * imprint appears at the same position and size as the equivalent HTML
 * overlay, on any frame/image aspect combination, and stays locked to the
 * image content under camera motion.
 *
 * When a camera rig is active the plane is oversized (`planeMargin`) and the
 * frame-0 pose is not identity (e.g. push-in starts ~7 % zoomed, drift ±5 %
 * translated), so the screen→plane mapping must be corrected for the imprint
 * to land in the right place AT FRAME 0. Pass `rig` with the frame-0 pose;
 * afterwards the imprint travels with the image, which is the intent.
 */
export function screenRectToUvImprintRect(
  screenRect: { left: number; top: number; width: number; height: number },
  frameSize: { width: number; height: number },
  imageSize: { width: number; height: number } | null | undefined,
  rig?: { planeMargin: number; pose: { x: number; y: number; zoom: number } } | null,
): UvImprintRect | null {
  if (!imageSize || imageSize.height <= 0 || frameSize.height <= 0 || frameSize.width <= 0) {
    return null;
  }

  const frameAspect = frameSize.width / frameSize.height;
  const imageAspect = imageSize.width / imageSize.height;
  // Mirror of the shaders' coverUv scale factors.
  const csx = frameAspect > imageAspect ? 1 : frameAspect / imageAspect;
  const csy = frameAspect > imageAspect ? imageAspect / frameAspect : 1;

  // Screen UV (y up, bottom-left origin) of the rect's centre.
  const screenCx = (screenRect.left + screenRect.width / 2) / frameSize.width;
  const screenCy = 1 - (screenRect.top + screenRect.height / 2) / frameSize.height;

  // Screen UV → plane UV. Without a rig the plane matches the frame exactly.
  const margin = rig?.planeMargin ?? 1;
  const pose = rig?.pose ?? { x: 0, y: 0, zoom: 1 };
  const planeCx =
    (pose.x + (screenCx - 0.5) * frameSize.width / pose.zoom) /
      (frameSize.width * margin) +
    0.5;
  const planeCy =
    (pose.y + (screenCy - 0.5) * frameSize.height / pose.zoom) /
      (frameSize.height * margin) +
    0.5;
  const planeW = screenRect.width / pose.zoom / (frameSize.width * margin);
  const planeH = screenRect.height / pose.zoom / (frameSize.height * margin);

  // Plane UV → image UV via the cover-fit transform.
  const cx = (planeCx - 0.5) * csx + 0.5;
  const cy = (planeCy - 0.5) * csy + 0.5;
  const w = planeW * csx;
  const h = planeH * csy;

  return { x: cx - w / 2, y: cy - h / 2, width: w, height: h };
}

/**
 * Compute a background-image UV rect for an imprint: sized as a fraction of
 * the image height while preserving its natural aspect ratio, centred on
 * `position`. If the imprint is too wide for the image it is scaled down
 * uniformly so it never bleeds past the edges.
 */
export function uvImprintRect(
  spec: UvImprintSpec,
  imageSize: { width: number; height: number } | null | undefined,
  isPortrait: boolean,
): UvImprintRect | null {
  const { naturalSize, position, scale = 1, heightFraction } = spec;
  const effectivePosition = position ?? { x: 0.5, y: isPortrait ? 0.28 : 0.22 };
  if (!naturalSize || !imageSize || naturalSize.height <= 0 || imageSize.height <= 0) {
    return null;
  }

  const imprintAspect = naturalSize.width / naturalSize.height;
  const imageAspect = imageSize.width / imageSize.height;

  let h = (heightFraction ?? (isPortrait ? 0.04 : 0.06)) * scale;
  let w = (h * imprintAspect) / imageAspect;

  // Keep the imprint inside the image horizontally; clamp the width and
  // recompute the height so the actual aspect ratio is preserved (otherwise
  // portrait images squash the imprint).
  const maxW = 0.92;
  if (w > maxW) {
    w = maxW;
    h = (w * imageAspect) / imprintAspect;
  }

  return {
    x: effectivePosition.x - w / 2,
    y: effectivePosition.y - h / 2,
    width: w,
    height: h,
  };
}

/** Uniform declarations for the imprint arrays. */
export const UV_IMPRINTS_UNIFORMS_GLSL = /* glsl */ `
uniform sampler2D uImprints[${MAX_UV_IMPRINTS}];
uniform vec4 uImprintRects[${MAX_UV_IMPRINTS}];
uniform float uImprintAlphas[${MAX_UV_IMPRINTS}];
`;

/**
 * Composite every active imprint over `background` at `sampleUv` (the same
 * cover-fit image UV used to sample the background, so imprints stay locked
 * to the image content and travel with camera motion).
 *
 * Imprints are expected on transparent canvases — only the image pixels
 * composite (mask × sample alpha), not the surrounding clear area.
 *
 * Sampling goes through UV_IMPRINT_SAMPLE so GLSL 1.0 (`texture2D`) and
 * GLSL 3 (`texture`) shaders can both use this: define the macro BEFORE
 * including this chunk to override the sampler call.
 *
 * The slots are unrolled with CONSTANT indices — GLSL ES 1.00 forbids
 * indexing sampler arrays with anything but constant integral expressions
 * (loop indices fail on ANGLE/Chrome), so a `for` loop is not portable.
 */
export const UV_IMPRINTS_GLSL = /* glsl */ `
#ifndef UV_IMPRINT_SAMPLE
#define UV_IMPRINT_SAMPLE(t, uv) texture2D(t, uv)
#endif

vec3 applyUvImprintSlot(vec3 background, sampler2D imprintTex, vec4 imprintRect, float imprintAlpha, vec2 sampleUv) {
  if (imprintAlpha <= 0.001) return background;

  vec2 localUv = (sampleUv - imprintRect.xy) / imprintRect.zw;

  // Signed distance to the imprint box in local units (negative in).
  vec2 b = abs(localUv - 0.5) - 0.5;
  float sd = max(b.x, b.y);
  float feather = 0.012;
  float mask = smoothstep(feather, -feather, sd) * imprintAlpha;
  if (mask <= 0.001) return background;

  vec4 imprint = UV_IMPRINT_SAMPLE(imprintTex, clamp(localUv, vec2(0.001), vec2(0.999)));
  return mix(background, imprint.rgb, mask * imprint.a);
}

vec3 applyUvImprints(vec3 background, vec2 sampleUv) {
  background = applyUvImprintSlot(background, uImprints[0], uImprintRects[0], uImprintAlphas[0], sampleUv);
  background = applyUvImprintSlot(background, uImprints[1], uImprintRects[1], uImprintAlphas[1], sampleUv);
  background = applyUvImprintSlot(background, uImprints[2], uImprintRects[2], uImprintAlphas[2], sampleUv);
  background = applyUvImprintSlot(background, uImprints[3], uImprintRects[3], uImprintAlphas[3], sampleUv);
  return background;
}
`;

export interface UseUvImprintSlotsOptions {
  /** Background image pixel size — required for UV rect computation. */
  imageSize: { width: number; height: number } | null;
  width: number;
  height: number;
  isPortrait: boolean;
  /** Route external CDN images through /api/proxy-image for CORS-safe previews. */
  proxyImagesForPreview?: boolean;
  colorSpace?: THREE.ColorSpace;
  /** Human-readable label prefix for Remotion's delayRender messages. */
  label?: string;
  /**
   * Camera-rig correction for `screenRect` specs: the plane margin and the
   * frame-0 pose, so the imprint lands in the right place at frame 0 when a
   * rig is active (the plane is oversized and styles start off-rest).
   */
  rig?: { planeMargin: number; pose: { x: number; y: number; zoom: number } } | null;
}

/**
 * Structural view of a loaded imprint slot — satisfied by
 * `UseImprintSlotResult` (remotion/three/useImprintSlot.ts). Declared here so
 * the uniform builders stay framework-free.
 */
export interface UvImprintSlotState {
  /** Loaded Three.js texture, or null when the slot is disabled/inactive. */
  texture: THREE.Texture | null;
  /** Rect as a Vector4 (screen-normalised or UV space, per slot config). */
  rectVec: THREE.Vector4;
  /** Alpha the shader should actually use (0 when nothing to render). */
  alphaEff: number;
  /** Whether the slot has a URL + rect (texture may still be loading). */
  active: boolean;
}

export interface UvImprintSlotsResult {
  slots: UvImprintSlotState[];
}

/**
 * Build the ShaderMaterial uniform entries for the imprint arrays.
 * `fallbackTexture` fills inactive slots so the sampler always has a valid
 * texture bound (its alpha is 0, so it is never sampled visibly).
 */
export function uvImprintUniforms(
  slots: UvImprintSlotState[],
  fallbackTexture: THREE.Texture,
): Record<string, THREE.IUniform> {
  return {
    uImprints: { value: slots.map((s) => s.texture ?? fallbackTexture) },
    uImprintRects: { value: slots.map((s) => s.rectVec) },
    uImprintAlphas: { value: slots.map((s) => s.alphaEff) },
  };
}

/**
 * Per-frame sync of the imprint uniforms — rects/alphas can change without a
 * material rebuild (e.g. alpha toggles, image size arriving after load).
 */
export function syncUvImprintUniforms(
  material: THREE.ShaderMaterial,
  slots: UvImprintSlotState[],
): void {
  const rects = material.uniforms.uImprintRects;
  const alphas = material.uniforms.uImprintAlphas;
  if (!rects || !alphas) return;
  for (let i = 0; i < slots.length; i++) {
    rects.value[i] = slots[i].rectVec;
    alphas.value[i] = slots[i].alphaEff;
  }
}

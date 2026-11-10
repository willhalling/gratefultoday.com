/**
 * lib/renderer/world-renderer.ts — plain-three.js port of the Remotion
 * composition's WebGL background stack (the non-DepthGallery branches of
 * renderBackground(), VisualizerComposition.tsx:1162–1485). No React, no
 * remotion, no @react-three/*: one THREE.WebGLRenderer + ShaderMaterial
 * planes whose uniforms are advanced manually per frame
 * (`uTime = frame/fps`), deterministic — no wall clock.
 *
 * GLSL, settings objects, camera pose math and grade plumbing are imported
 * VERBATIM from the Remotion tree (framework-free): shaders/{wave,
 * colourGrade, pulseMotion, rgbGlitch, rain, dream}.ts, camera/cameraMotion.ts,
 * glass/glassGlsl.ts. The per-frame values the React scenes compute in
 * render/useFrame are replicated line-for-line:
 *
 *   scene                 source component                       port notes
 *   'wave' / 'cover'      three/scenes/CameraMotionScene.tsx     WAVE vs
 *      (branches 5b/5c)                                        COVER shader
 *      (branch 5b: waveEnergy = BACKGROUND_WAVE_CONSTANT ×      by waveEnergy>0,
 *      waveEnergyMultiplier, steady, audioBeats = [])           waveAmp ×0.8
 *   'grade'               three/scenes/ColourGradeScene.tsx      Original-grade
 *      (branches 5a-ii/5d)                                     colour-space
 *      gradeIntensity = colourGradeIntensity (prop)             swap, alpha:false
 *   'pulse' (5a)          three/scenes/PulseMotionScene.tsx      continuous=true
 *      (composition always passes `continuous`)                 path only
 *   'rgb-glitch' (5a)     three/scenes/RgbGlitchScene.tsx        burst math verbatim
 *   'rain' (5a)           three/scenes/RainScene.tsx             mipmapped texture
 *   'dream' (5a)          three/scenes/DreamScene.tsx            GLSL3
 *
 * Camera rig (all scenes): PerspectiveCamera (RIG_FOV 40, near 1, far
 * restZ×4) posed per frame by getCameraPose exactly like CameraRigUpdater
 * (three/camera/CameraRig.tsx); plane oversized by RIG_PLANE_MARGIN when the
 * rig is active, orthographic camera otherwise.
 *
 * Deliberately NOT here:
 *   - BlurredBackgroundScene (the two-pass blur): in the composition it only
 *     ever renders UNDERNEATH the opaque shader scene (loading/thumbnail
 *     fallback) — never visible in export frames. The blur slider reaches
 *     the pixels via the in-shader uBackgroundBlur uniform, ported here.
 *   - uvImprints / cover imprints (watermark, artist lockup): Phase 1.3.
 *     Wired to the neutral state (alpha 0, fallback texture) so the shader's
 *     imprint compositing is a no-op.
 *   - Video backgrounds (sceneVideoUrl / backgroundVideoUrl) and the
 *     DepthGalleryBackground (scene pack): Phase 1.2b, descoped —
 *     setBackgroundSource() takes a source union so those slot in as
 *     additional source kinds. The AI scene-images branch is no longer the
 *     depth gallery: it renders through the cut world (cut-world.ts,
 *     dispatched by WorldLayerRenderer below).
 *   - The frame-0 WebGL warm-up skip (formerly lib/render-lambda.ts, removed
 *     with the Lambda path) applies to directorMode (depth gallery) only —
 *     it does not affect these paths.
 */
import * as THREE from 'three';
import {
  COVER_FRAGMENT_SHADER,
  WAVE_FRAGMENT_SHADER,
  WAVE_VERTEX_SHADER,
} from '@/lib/renderer/vendor/three/shaders/wave';
import {
  COLOUR_GRADE_FRAGMENT_SHADER,
  COLOUR_GRADE_VERTEX_SHADER,
} from '@/lib/renderer/vendor/three/shaders/colourGrade';
import {
  PULSE_FRAGMENT_SHADER,
  PULSE_SETTINGS,
  PULSE_VERTEX_SHADER,
} from '@/lib/renderer/vendor/three/shaders/pulseMotion';
import {
  GLITCH_FRAGMENT_SHADER,
  GLITCH_SETTINGS,
  GLITCH_VERTEX_SHADER,
} from '@/lib/renderer/vendor/three/shaders/rgbGlitch';
import {
  RAIN_FRAGMENT_SHADER,
  RAIN_VERTEX_SHADER,
} from '@/lib/renderer/vendor/three/shaders/rain';
import {
  TIKTOK_WORLD_FRAGMENT_SHADER,
  TIKTOK_WORLD_VERTEX_SHADER,
} from '@/lib/renderer/vendor/three/shaders/tiktokWorld';
import {
  DREAM_FRAGMENT_SHADER,
  DREAM_VERTEX_SHADER,
} from '@/lib/renderer/vendor/three/shaders/dream';
import {
  getCameraPose,
  getRestCameraZ,
  RIG_PLANE_MARGIN,
  RIG_FOV,
  type CameraMotion,
  type CameraMotionIntensity,
} from '@/lib/renderer/vendor/three/camera/cameraMotion';
import { defaultGlassStyleUniforms } from '@/lib/renderer/vendor/three/glass/glassGlsl';
import {
  screenRectToUvImprintRect,
  uvImprintRect,
  type PreparedImprints,
} from './imprints';

/** uvImprints.ts:29 — imprint slot count. Inlined rather than imported:
 * uvImprints.ts value-imports useImprintSlot.ts, which drags the entire
 * Remotion component tree into any bundle that touches it. */
const MAX_UV_IMPRINTS = 4;

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

/** RgbGlitchScene.tsx:89–102 / PulseMotionScene.tsx:86–102 — verbatim. */
const getMostRecentBeatIndex = (audioBeats: number[], currentTime: number): number => {
  let idx = -1;
  for (let i = 0; i < audioBeats.length; i++) {
    if (audioBeats[i] <= currentTime) {
      idx = i;
    } else {
      break;
    }
  }
  return idx;
};

/** RgbGlitchScene.tsx:104–108 — deterministic pseudo-random, matches the shader hash. */
const hash = (n: number): number => {
  const s = Math.sin(n) * 43758.5453;
  return s - Math.floor(s);
};

// ─── Texture loading (remotion/three/loadImageTexture.ts, minus the toast) ──

export interface LoadedWorldTexture {
  texture: THREE.Texture;
  width: number;
  height: number;
}

// ─── Live canvas sources (opt-in; used by the TikTok maker for video backgrounds) ──
// A caller registers a canvas under a `canvas-source:` URL and passes that URL
// wherever an image URL goes. The world textures from the canvas instead of an
// <img>, and the caller redraws the canvas + flags the texture each frame — so
// video frames get the same scenes, grade and camera as still images.

export const CANVAS_SOURCE_PREFIX = 'canvas-source:';
const canvasSources = new Map<string, { canvas: HTMLCanvasElement; textures: Set<THREE.Texture> }>();

export function registerCanvasSource(id: string, canvas: HTMLCanvasElement): string {
  canvasSources.set(id, { canvas, textures: new Set() });
  return `${CANVAS_SOURCE_PREFIX}${id}`;
}

/** Call after redrawing a registered canvas so every texture using it re-uploads. */
export function markCanvasSourceDirty(id: string): void {
  canvasSources.get(id)?.textures.forEach((t) => {
    t.needsUpdate = true;
  });
}

export function unregisterCanvasSource(id: string): void {
  canvasSources.delete(id);
}

function loadWorldTexture(
  url: string,
  opts?: { colorSpace?: THREE.ColorSpace; mipmaps?: boolean },
): Promise<LoadedWorldTexture> {
  if (url.startsWith(CANVAS_SOURCE_PREFIX)) {
    const entry = canvasSources.get(url.slice(CANVAS_SOURCE_PREFIX.length));
    if (!entry) return Promise.reject(new Error(`Unknown canvas source: ${url}`));
    const texture = new THREE.CanvasTexture(entry.canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = opts?.colorSpace ?? THREE.SRGBColorSpace;
    entry.textures.add(texture);
    return Promise.resolve({ texture, width: entry.canvas.width || 1, height: entry.canvas.height || 1 });
  }
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const texture = new THREE.Texture(img);
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.format = THREE.RGBAFormat;
      texture.colorSpace = opts?.colorSpace ?? THREE.SRGBColorSpace;
      if (opts?.mipmaps) {
        // RainScene.tsx:131–136 — the fog blur samples mips via textureLod.
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps = true;
      }
      texture.needsUpdate = true;
      resolve({
        texture,
        width: img.naturalWidth || img.width || 1,
        height: img.naturalHeight || img.height || 1,
      });
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

// ─── Frame params ────────────────────────────────────────────────────────────

export type WorldSceneKind =
  | 'wave' // CameraMotionScene with WAVE shader (branch 5b)
  | 'cover' // CameraMotionScene with COVER shader (branch 5c)
  | 'grade' // ColourGradeScene (branches 5a-ii / 5d)
  | 'pulse'
  | 'rgb-glitch'
  | 'rain'
  | 'dream'
  | 'tiktok-world'; // TikTokWorldScene (the TikTok layout's full-frame world)

/**
 * Background source — one shaderBgUrl today (image URL or the generated
 * colour/gradient data URL). The depth gallery / video backgrounds slot in
 * here in Phase 1.2b as additional kinds.
 */
export type WorldBackgroundSource =
  | { kind: 'image'; url: string }
  | { kind: 'none' };

export interface WorldFrameParams {
  frame: number;
  fps: number;
  width: number;
  height: number;
  /** Rig timeline length (the composition's cameraDurationInFrames). */
  durationInFrames: number;
  scene: WorldSceneKind;
  cameraMotion: CameraMotion;
  cameraMotionIntensity: CameraMotionIntensity;
  /** 'wave' scene only: steady amplitude (BACKGROUND_WAVE_CONSTANT ×
   * waveEnergyMultiplier). 0 selects the COVER shader. */
  waveEnergy: number;
  /** Beat grid for the rgb-glitch bursts (+ wave beat pulse, unused on the
   * composition's 5b path which passes []). */
  audioBeats: number[];
  motionEffectScale: number;
  motionEffectGrayscale: boolean;
  /** Raw Gaussian bass (frame-context motionWaveEnergy) for pulse/dream/
   * rgb-glitch. */
  motionWaveEnergy: number;
  // ── TikTok-world only (ignored by the other scenes) ──
  /** Middle-zone motion effect ('colour-grade' maps to null, TikTokLayout.tsx:388). */
  motionEffect?: 'pulse' | 'rgb-glitch' | 'rain' | 'dream' | null;
  /** Frame colour for the solid zones (0–1 rgb). */
  solidColor?: [number, number, number];
  zoneTopPx?: number;
  zoneBottomPx?: number;
  /** Outro credit visible (final 2.5 s of the clip). */
  showCredit?: boolean;
  /** Scales the motion-effect animation clock (1 = realtime; slowed clips
   * pass the audio playbackRate so the pulse slows proportionally).
   * Beat-synced logic stays realtime. TikTok-world only. */
  motionTimeScale?: number;
  /** slowedgen-style big pulse (pulse effect only). TikTok-world only. */
  pulseBoost?: boolean;

  /** colourGradeIntensity prop (ColourGradeScene: gradeIntensity ?? scale). */
  gradeIntensity: number;
  brandBackground: [number, number, number];
  brandAccent: [number, number, number];
  brandText: [number, number, number];
  gradeLift: number;
  gradeGamma: number;
  gradeGain: number;
  gradeSaturation: number;
  gradeContrast: number;
  gradeGrain: number;
  backgroundBlur: number;
}

// ─── Scene instance ──────────────────────────────────────────────────────────

interface SceneInstance {
  mesh: THREE.Mesh;
  geometry: THREE.PlaneGeometry;
  material: THREE.ShaderMaterial;
  /** Per-frame uniform values (the scene components' useFrame bodies). */
  syncUniforms: (p: WorldFrameParams, currentTime: number) => void;
  /** Colour-space handling (grade scene's Original-grade path). */
  outputColorSpace: THREE.ColorSpace;
}

/** Texture for an imprint canvas — loadImageTexture's params (clamp,
 * linear, RGBA; mipmaps only for the rain scene's textureLod fog). */
function makeImprintTexture(
  canvas: HTMLCanvasElement,
  colorSpace: THREE.ColorSpace,
  mipmaps: boolean,
): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = mipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = mipmaps;
  texture.format = THREE.RGBAFormat;
  texture.colorSpace = colorSpace;
  texture.flipY = true;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Real uvImprints uniforms (Phase 1.3): slot 0 = watermark badge (default
 * UV rule, uvImprints.ts:134–165), slot 1 = artist lockup (screenRect →
 * image UV with the frame-0 rig correction, uvImprints.ts:85–126), slots
 * 2–3 neutral. Mirrors useUvImprintSlots + uvImprintUniforms.
 */
function buildImprintUniforms(
  imprints: PreparedImprints | undefined,
  fallback: THREE.Texture,
  imageSize: { width: number; height: number },
  frameSize: { width: number; height: number },
  cameraMotion: CameraMotion,
  cameraMotionIntensity: CameraMotionIntensity,
  durationInFrames: number,
  textureColorSpace: THREE.ColorSpace,
  mipmaps: boolean,
): Record<string, THREE.IUniform> {
  const textures: THREE.Texture[] = new Array(MAX_UV_IMPRINTS).fill(fallback);
  const rects: THREE.Vector4[] = Array.from(
    { length: MAX_UV_IMPRINTS },
    () => new THREE.Vector4(0, 0, 0, 0),
  );
  const alphas: number[] = new Array(MAX_UV_IMPRINTS).fill(0);
  if (!imprints) {
    return {
      uImprints: { value: textures },
      uImprintRects: { value: rects },
      uImprintAlphas: { value: alphas },
    };
  }

  const isPortrait = frameSize.height > frameSize.width;
  // frameZeroRig (CameraMotionScene.tsx:176–186 etc.): screen→plane rect
  // correction uses the frame-0 pose when a rig is active.
  const useRig = cameraMotion !== 'static' && durationInFrames > 1;
  const rig = useRig
    ? {
        planeMargin: RIG_PLANE_MARGIN,
        pose: getCameraPose(cameraMotion, 0, 0, frameSize.width, frameSize.height, cameraMotionIntensity),
      }
    : null;

  if (imprints.watermark) {
    const rect = uvImprintRect(
      { naturalSize: imprints.watermark.size },
      imageSize,
      isPortrait,
    );
    if (rect) {
      textures[0] = makeImprintTexture(imprints.watermark.canvas, textureColorSpace, mipmaps);
      rects[0] = new THREE.Vector4(rect.x, rect.y, rect.width, rect.height);
      alphas[0] = imprints.watermark.alpha;
    }
  }
  if (imprints.lockup) {
    const rect = screenRectToUvImprintRect(imprints.lockup.screenRect, frameSize, imageSize, rig);
    if (rect) {
      textures[1] = makeImprintTexture(imprints.lockup.canvas, textureColorSpace, mipmaps);
      rects[1] = new THREE.Vector4(rect.x, rect.y, rect.width, rect.height);
      alphas[1] = imprints.lockup.alpha;
    }
  }

  return {
    uImprints: { value: textures },
    uImprintRects: { value: rects },
    uImprintAlphas: { value: alphas },
  };
}

function gradeUniformSet(
  p: WorldFrameParams,
  width: number,
  height: number,
): Record<string, THREE.IUniform> {
  return {
    uGradeIntensity: { value: p.gradeIntensity },
    uBrandBackground: { value: new THREE.Vector3(...p.brandBackground) },
    uBrandAccent: { value: new THREE.Vector3(...p.brandAccent) },
    uBrandText: { value: new THREE.Vector3(...p.brandText) },
    uGradeLift: { value: p.gradeLift },
    uGradeGamma: { value: p.gradeGamma },
    uGradeGain: { value: p.gradeGain },
    uGradeSaturation: { value: p.gradeSaturation },
    uGradeContrast: { value: p.gradeContrast },
    uGradeGrain: { value: p.gradeGrain },
    uBackgroundBlur: { value: p.backgroundBlur },
    uBlurResolution: { value: new THREE.Vector2(width, height) },
  };
}

function syncGradeUniforms(u: Record<string, THREE.IUniform>, p: WorldFrameParams): void {
  if (u.uGradeIntensity) u.uGradeIntensity.value = p.gradeIntensity;
  if (u.uBrandBackground) (u.uBrandBackground.value as THREE.Vector3).set(...p.brandBackground);
  if (u.uBrandAccent) (u.uBrandAccent.value as THREE.Vector3).set(...p.brandAccent);
  if (u.uBrandText) (u.uBrandText.value as THREE.Vector3).set(...p.brandText);
  if (u.uGradeLift) u.uGradeLift.value = p.gradeLift;
  if (u.uGradeGamma) u.uGradeGamma.value = p.gradeGamma;
  if (u.uGradeGain) u.uGradeGain.value = p.gradeGain;
  if (u.uGradeSaturation) u.uGradeSaturation.value = p.gradeSaturation;
  if (u.uGradeContrast) u.uGradeContrast.value = p.gradeContrast;
  if (u.uGradeGrain) u.uGradeGrain.value = p.gradeGrain;
  if (u.uBackgroundBlur) u.uBackgroundBlur.value = p.backgroundBlur;
}

function buildScene(
  kind: WorldSceneKind,
  texture: THREE.Texture,
  imageRes: THREE.Vector2,
  width: number,
  height: number,
  p0: WorldFrameParams,
  imprints?: PreparedImprints,
): SceneInstance {
  const imageSize = { width: imageRes.x, height: imageRes.y };
  const frameSize = { width, height };
  const imprintUniformsFor = (colorSpace: THREE.ColorSpace, mipmaps: boolean) =>
    buildImprintUniforms(
      imprints,
      texture,
      imageSize,
      frameSize,
      p0.cameraMotion,
      p0.cameraMotionIntensity,
      p0.durationInFrames,
      colorSpace,
      mipmaps,
    );
  const coverNeutral = {
    uCover: { value: texture },
    uCoverRect: { value: new THREE.Vector4(0, 0, 1, 1) },
    uCoverAlpha: { value: 0 },
  };
  const base = {
    uResolution: { value: new THREE.Vector2(width, height) },
  };

  switch (kind) {
    case 'wave':
    case 'cover': {
      // CameraMotionScene.tsx:211–253 — WAVE vs COVER by waveEnergy > 0.
      const material = new THREE.ShaderMaterial({
        vertexShader: WAVE_VERTEX_SHADER,
        fragmentShader: kind === 'wave' ? WAVE_FRAGMENT_SHADER : COVER_FRAGMENT_SHADER,
        uniforms: {
          uImage: { value: texture },
          uBackgroundTexture: { value: texture },
          ...base,
          uImageRes: { value: imageRes },
          uTime: { value: 0 },
          uWave: { value: 0 },
          uFreq: { value: 10.0 },
          uSpeed: { value: 1.7 },
          ...coverNeutral,
          ...imprintUniformsFor(THREE.SRGBColorSpace, false),
          ...gradeUniformSet(p0, width, height),
        },
      });
      const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
      return {
        mesh: new THREE.Mesh(geometry, material),
        geometry,
        material,
        outputColorSpace: THREE.SRGBColorSpace,
        syncUniforms: (p, currentTime) => {
          const u = material.uniforms;
          // CameraMotionScene.tsx:197–209 — beat-pulse gaussian.
          let waveAmp = 0;
          if (p.waveEnergy > 0) {
            const BEAT_SIGMA_SEC = 0.16;
            let beatPulse = 0;
            for (const beatSec of p.audioBeats) {
              const beatDistance = Math.abs(currentTime - beatSec);
              if (beatDistance > BEAT_SIGMA_SEC * 2.5) continue;
              const normalizedDistance = beatDistance / BEAT_SIGMA_SEC;
              const pulse = Math.exp(-0.5 * normalizedDistance * normalizedDistance);
              if (pulse > beatPulse) beatPulse = pulse;
            }
            waveAmp = p.waveEnergy * 0.8 + beatPulse * 0.22;
          }
          if (u.uTime) u.uTime.value = currentTime;
          if (u.uWave) u.uWave.value = waveAmp;
          syncGradeUniforms(u, p);
        },
      };
    }

    case 'grade': {
      // ColourGradeScene.tsx:199–244. uCoverAlpha is always 0 in useFrame
      // (:407); glass style uniforms are the defaults (:207).
      const glassStyle = defaultGlassStyleUniforms();
      const isOriginal = p0.gradeIntensity <= 0.001;
      const material = new THREE.ShaderMaterial({
        vertexShader: COLOUR_GRADE_VERTEX_SHADER,
        fragmentShader: COLOUR_GRADE_FRAGMENT_SHADER,
        uniforms: {
          uTexture: { value: texture },
          uBackgroundTexture: { value: texture },
          ...base,
          uImageResolution: { value: imageRes },
          ...gradeUniformSet(p0, width, height),
          uTime: { value: 0 },
          ...coverNeutral,
          uCoverGlassLensSize: { value: glassStyle.GlassLensSize },
          uCoverGlassDistortion: { value: glassStyle.GlassDistortion },
          uCoverGlassBlurRadius: { value: glassStyle.GlassBlurRadius },
          uCoverGlassLighting: { value: glassStyle.GlassLighting },
          uCoverGlassMix: { value: glassStyle.GlassMix },
          ...imprintUniformsFor(
            isOriginal ? THREE.NoColorSpace : THREE.SRGBColorSpace,
            false,
          ),
        },
      });
      const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
      return {
        mesh: new THREE.Mesh(geometry, material),
        geometry,
        material,
        // ColourGradeScene.tsx:104–113 — Original matches the flat <img>.
        outputColorSpace: isOriginal ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace,
        syncUniforms: (p, currentTime) => {
          const u = material.uniforms;
          u.uTime.value = currentTime;
          syncGradeUniforms(u, p);
        },
      };
    }

    case 'pulse': {
      // PulseMotionScene.tsx:290–336 — the composition always passes
      // `continuous` (:1288), so only the ambient path exists here
      // (direction −1, grayscaleProgress 0, breathe-driven ripple).
      const material = new THREE.ShaderMaterial({
        vertexShader: PULSE_VERTEX_SHADER,
        fragmentShader: PULSE_FRAGMENT_SHADER,
        uniforms: {
          uTexture: { value: texture },
          uBackgroundTexture: { value: texture },
          ...base,
          uImageResolution: { value: imageRes },
          uGrayscaleProgress: { value: 0 },
          uRippleProgress: { value: 0 },
          uTime: { value: 0 },
          uDirection: { value: -1.0 },
          uMouse: {
            value: new THREE.Vector2(PULSE_SETTINGS.center.x, PULSE_SETTINGS.center.y),
          },
          ...coverNeutral,
          ...imprintUniformsFor(THREE.SRGBColorSpace, false),
          ...gradeUniformSet(p0, width, height),
        },
      });
      const geometry = new THREE.PlaneGeometry(
        1,
        1,
        PULSE_SETTINGS.tessellation,
        PULSE_SETTINGS.tessellation,
      );
      return {
        mesh: new THREE.Mesh(geometry, material),
        geometry,
        material,
        outputColorSpace: THREE.SRGBColorSpace,
        syncUniforms: (p, currentTime) => {
          const u = material.uniforms;
          // PulseMotionScene.tsx:233–248 (continuous branch).
          const normalisedEnergy = clamp(p.motionWaveEnergy, 0, 1);
          const breathe =
            0.8 + 0.2 * Math.sin(currentTime * 0.7) * Math.sin(currentTime * 1.13 + 1.7);
          const rippleProgress =
            (PULSE_SETTINGS.rippleEnergyBase +
              normalisedEnergy * PULSE_SETTINGS.rippleEnergyRange) *
            0.5 *
            breathe *
            p.motionEffectScale;
          u.uGrayscaleProgress.value = 0;
          u.uRippleProgress.value = rippleProgress;
          u.uTime.value = currentTime * PULSE_SETTINGS.timeScale;
          u.uDirection.value = -1.0;
          syncGradeUniforms(u, p);
        },
      };
    }

    case 'rgb-glitch': {
      // RgbGlitchScene.tsx:270–310 + burst timing :233–263.
      const material = new THREE.ShaderMaterial({
        vertexShader: GLITCH_VERTEX_SHADER,
        fragmentShader: GLITCH_FRAGMENT_SHADER,
        uniforms: {
          uTexture: { value: texture },
          uBackgroundTexture: { value: texture },
          ...base,
          uImageResolution: { value: imageRes },
          uSeed: { value: 0 },
          uIntensity: { value: 0 },
          uGrayscaleMix: { value: p0.motionEffectGrayscale ? 1 : 0 },
          ...coverNeutral,
          ...imprintUniformsFor(THREE.SRGBColorSpace, false),
          ...gradeUniformSet(p0, width, height),
          uTime: { value: 0 },
        },
      });
      const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
      return {
        mesh: new THREE.Mesh(geometry, material),
        geometry,
        material,
        outputColorSpace: THREE.SRGBColorSpace,
        syncUniforms: (p, currentTime) => {
          const u = material.uniforms;
          // RgbGlitchScene.tsx:233–263 — verbatim.
          const beatIdx = getMostRecentBeatIndex(p.audioBeats, currentTime);
          const useBeats = p.audioBeats.length > 0 && beatIdx >= 0;
          const fallbackIdx = Math.floor(currentTime / 2.5);
          const pulseIndex = useBeats ? beatIdx : fallbackIdx;
          const lastPulseTime = useBeats ? p.audioBeats[pulseIndex] : pulseIndex * 2.5;
          const timeSincePulse = Math.max(0, currentTime - lastPulseTime);
          const burstEnvelope = Math.exp(-timeSincePulse / GLITCH_SETTINGS.burstDecaySec);
          const burstActive =
            hash(pulseIndex * 91.7 + 13.3) < GLITCH_SETTINGS.burstChance ? 1 : 0;
          const normalisedEnergy = clamp(p.motionWaveEnergy, 0, 1);
          const intensity =
            (GLITCH_SETTINGS.baseIntensity +
              GLITCH_SETTINGS.burstStrength * burstEnvelope * burstActive +
              normalisedEnergy * GLITCH_SETTINGS.energyBoost) *
            p.motionEffectScale;
          const seed = Math.floor(
            currentTime * GLITCH_SETTINGS.seedStepsPerSec * (1 + intensity),
          );
          u.uSeed.value = seed;
          u.uIntensity.value = intensity;
          u.uGrayscaleMix.value = p.motionEffectGrayscale ? 1 : 0;
          u.uTime.value = currentTime;
          syncGradeUniforms(u, p);
        },
      };
    }

    case 'rain': {
      // RainScene.tsx:210–249 (GLSL3 for textureLod).
      const material = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: RAIN_VERTEX_SHADER,
        fragmentShader: RAIN_FRAGMENT_SHADER,
        uniforms: {
          uTexture: { value: texture },
          uBackgroundTexture: { value: texture },
          ...base,
          uImageResolution: { value: imageRes },
          uTime: { value: 0 },
          uIntensity: { value: p0.motionEffectScale },
          ...coverNeutral,
          ...imprintUniformsFor(THREE.SRGBColorSpace, true),
          ...gradeUniformSet(p0, width, height),
        },
      });
      const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
      return {
        mesh: new THREE.Mesh(geometry, material),
        geometry,
        material,
        outputColorSpace: THREE.SRGBColorSpace,
        syncUniforms: (p, currentTime) => {
          const u = material.uniforms;
          u.uTime.value = currentTime;
          u.uIntensity.value = p.motionEffectScale;
          syncGradeUniforms(u, p);
        },
      };
    }

    case 'dream': {
      // DreamScene.tsx:206–247 (GLSL3).
      const material = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: DREAM_VERTEX_SHADER,
        fragmentShader: DREAM_FRAGMENT_SHADER,
        uniforms: {
          uTexture: { value: texture },
          uBackgroundTexture: { value: texture },
          ...base,
          uImageResolution: { value: imageRes },
          uTime: { value: 0 },
          uIntensity: { value: p0.motionEffectScale },
          uEnergy: { value: 0 },
          ...coverNeutral,
          ...imprintUniformsFor(THREE.SRGBColorSpace, false),
          ...gradeUniformSet(p0, width, height),
        },
      });
      const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
      return {
        mesh: new THREE.Mesh(geometry, material),
        geometry,
        material,
        outputColorSpace: THREE.SRGBColorSpace,
        syncUniforms: (p, currentTime) => {
          const u = material.uniforms;
          u.uTime.value = currentTime;
          u.uIntensity.value = p.motionEffectScale;
          u.uEnergy.value = p.motionWaveEnergy;
          syncGradeUniforms(u, p);
        },
      };
    }

    case 'tiktok-world': {
      // TikTokWorldScene.tsx:315–362 — one full-frame surface with
      // frame-locked solid zones + camera-locked imprints. The hook text
      // (slot 0) stays DOM (AnimatedHook), so slot 0 is neutral; slot 1 =
      // artwork stamp (screenRect); slot 2 = frame-locked outro credit.
      const solid = p0.solidColor ?? [0, 0, 0];
      const zoneTopPx = p0.zoneTopPx ?? 420;
      const zoneBottomPx = p0.zoneBottomPx ?? 1320;
      const tiktok = imprints?.tiktok ?? null;

      const textures: THREE.Texture[] = new Array(MAX_UV_IMPRINTS).fill(texture);
      const rects: THREE.Vector4[] = Array.from(
        { length: MAX_UV_IMPRINTS },
        () => new THREE.Vector4(0, 0, 0, 0),
      );
      const alphas: number[] = new Array(MAX_UV_IMPRINTS).fill(0);

      const useRig = p0.cameraMotion !== 'static' && p0.durationInFrames > 1;
      const frameZeroRig = useRig
        ? {
            planeMargin: RIG_PLANE_MARGIN,
            pose: getCameraPose(
              p0.cameraMotion, 0, 0, width, height, p0.cameraMotionIntensity,
            ),
          }
        : null;

      // Slot 1 — artwork stamp (the cover image itself, TikTokLayout.tsx:212–222).
      if (tiktok?.stamp) {
        const rect = screenRectToUvImprintRect(
          tiktok.stamp.screenRect,
          { width, height },
          imageSize,
          frameZeroRig,
        );
        if (rect) {
          textures[1] = texture;
          rects[1] = new THREE.Vector4(rect.x, rect.y, rect.width, rect.height);
          alphas[1] = tiktok.stamp.alpha;
        }
      }
      // Slot 2 — outro credit raster (frame-locked; rect recomputed per frame).
      if (tiktok?.credit) {
        const rect = screenRectToUvImprintRect(
          tiktok.credit.screenRect,
          { width, height },
          imageSize,
          frameZeroRig,
        );
        if (rect) {
          textures[2] = makeImprintTexture(tiktok.credit.canvas, THREE.SRGBColorSpace, false);
          rects[2] = new THREE.Vector4(rect.x, rect.y, rect.width, rect.height);
          alphas[2] = 0; // gated per frame by showCredit
        }
      }

      const material = new THREE.ShaderMaterial({
        vertexShader: TIKTOK_WORLD_VERTEX_SHADER,
        fragmentShader: TIKTOK_WORLD_FRAGMENT_SHADER,
        uniforms: {
          uImage: { value: texture },
          uBackgroundTexture: { value: texture },
          ...base,
          uImageRes: { value: imageRes },
          uTime: { value: 0 },
          uWave: { value: 0 },
          uFreq: { value: 10.0 },
          uSpeed: { value: 1.7 },
          uSolidColor: { value: new THREE.Vector3(...solid) },
          uRigPose: { value: new THREE.Vector3(0, 0, 1) },
          uPlaneMargin: { value: useRig ? RIG_PLANE_MARGIN : 1 },
          uZoneTopV: { value: 1 - zoneTopPx / height },
          uZoneBottomV: { value: 1 - zoneBottomPx / height },
          uZoneHeightPx: { value: zoneBottomPx - zoneTopPx },
          uMotionEffect: { value: 0 },
          uPulseTime: { value: 0 },
          uPulseRipple: { value: 0 },
          uPulseBoost: { value: 0 },
          uPulseEnergy: { value: 0 },
          uGlitchSeed: { value: 0 },
          uGlitchIntensity: { value: 0 },
          uGlitchGrayMix: { value: p0.motionEffectGrayscale ? 1 : 0 },
          uRainIntensity: { value: p0.motionEffectScale },
          uDreamIntensity: { value: p0.motionEffectScale },
          uDreamEnergy: { value: 0 },
          uImprints: { value: textures },
          uImprintRects: { value: rects },
          uImprintAlphas: { value: alphas },
          ...gradeUniformSet(p0, width, height),
        },
      });
      const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);

      const MOTION_EFFECT_IDS: Record<string, number> = {
        pulse: 1,
        'rgb-glitch': 2,
        rain: 3,
        dream: 4,
      };

      return {
        mesh: new THREE.Mesh(geometry, material),
        geometry,
        material,
        outputColorSpace: THREE.SRGBColorSpace,
        syncUniforms: (p, currentTime) => {
          const u = material.uniforms;

          // Rig pose → uRigPose (TikTokWorldScene.tsx:579–581). Recompute
          // here (same math as WorldRenderer.renderFrame's rig branch).
          const useRigNow = p.cameraMotion !== 'static' && p.durationInFrames > 1;
          const rigT = p.durationInFrames > 1 ? p.frame / (p.durationInFrames - 1) : 0;
          const pose = useRigNow
            ? getCameraPose(
                p.cameraMotion, rigT, currentTime, width, height, p.cameraMotionIntensity,
              )
            : { x: 0, y: 0, zoom: 1, rotationZ: 0 };
          (u.uRigPose.value as THREE.Vector3).set(pose.x, pose.y, pose.zoom);

          // Wave amplitude (TikTokWorldScene.tsx:240–252).
          let waveAmp = 0;
          if (p.waveEnergy > 0) {
            const BEAT_SIGMA_SEC = 0.16;
            let beatPulse = 0;
            for (const beatSec of p.audioBeats) {
              const beatDistance = Math.abs(currentTime - beatSec);
              if (beatDistance > BEAT_SIGMA_SEC * 2.5) continue;
              const normalizedDistance = beatDistance / BEAT_SIGMA_SEC;
              const pulse = Math.exp(-0.5 * normalizedDistance * normalizedDistance);
              if (pulse > beatPulse) beatPulse = pulse;
            }
            waveAmp = p.waveEnergy * 0.8 + beatPulse * 0.22;
          }
          u.uTime.value = currentTime * (p.motionTimeScale ?? 1);
          u.uWave.value = waveAmp;

          // Motion-effect drivers (TikTokWorldScene.tsx:271–313 — same math
          // as the standalone scenes' continuous pulse / glitch).
          // slowedgen pattern: the effect's animation clock runs at the
          // audio's playback rate, so slowed presets pulse/drift
          // proportionally slower. Beat-synced logic stays on realtime.
          const effectTime = currentTime * (p.motionTimeScale ?? 1);
          const motionEffectId = p.scene === 'tiktok-world' && p.motionEffect
            ? (MOTION_EFFECT_IDS[p.motionEffect] ?? 0)
            : 0;
          const normalisedEnergy = clamp(p.motionWaveEnergy, 0, 1);
          const pulseBreathe =
            0.8 + 0.2 * Math.sin(effectTime * 0.7) * Math.sin(effectTime * 1.13 + 1.7);
          const pulseRipple =
            (PULSE_SETTINGS.rippleEnergyBase +
              normalisedEnergy * PULSE_SETTINGS.rippleEnergyRange) *
            0.5 *
            pulseBreathe *
            p.motionEffectScale;
          const pulseTime = effectTime * PULSE_SETTINGS.timeScale;

          const glitchBeatIdx = getMostRecentBeatIndex(p.audioBeats, currentTime);
          const glitchUseBeats = p.audioBeats.length > 0 && glitchBeatIdx >= 0;
          const glitchPulseIndex = glitchUseBeats
            ? glitchBeatIdx
            : Math.floor(currentTime / 2.5);
          const glitchLastPulseTime = glitchUseBeats
            ? p.audioBeats[glitchPulseIndex]
            : glitchPulseIndex * 2.5;
          const glitchBurstEnvelope = Math.exp(
            -Math.max(0, currentTime - glitchLastPulseTime) / GLITCH_SETTINGS.burstDecaySec,
          );
          const glitchBurstActive =
            hash(glitchPulseIndex * 91.7 + 13.3) < GLITCH_SETTINGS.burstChance ? 1 : 0;
          const glitchIntensity =
            (GLITCH_SETTINGS.baseIntensity +
              GLITCH_SETTINGS.burstStrength * glitchBurstEnvelope * glitchBurstActive +
              normalisedEnergy * GLITCH_SETTINGS.energyBoost) *
            p.motionEffectScale;
          const glitchSeed = Math.floor(
            effectTime * GLITCH_SETTINGS.seedStepsPerSec * (1 + glitchIntensity),
          );

          u.uMotionEffect.value = motionEffectId;
          u.uPulseTime.value = pulseTime;
          u.uPulseRipple.value = pulseRipple;
          u.uPulseBoost.value = p.pulseBoost ? 1 : 0;
          u.uPulseEnergy.value = normalisedEnergy;
          u.uGlitchSeed.value = glitchSeed;
          u.uGlitchIntensity.value = glitchIntensity;
          u.uGlitchGrayMix.value = p.motionEffectGrayscale ? 1 : 0;
          u.uRainIntensity.value = p.motionEffectScale;
          u.uDreamIntensity.value = p.motionEffectScale;
          u.uDreamEnergy.value = p.motionWaveEnergy;

          // Slot 2 credit: frame-locked — recompute rect with the CURRENT
          // pose and gate alpha on showCredit (RigMesh :583–599).
          if (tiktok?.credit) {
            const rect = screenRectToUvImprintRect(
              tiktok.credit.screenRect,
              { width, height },
              imageSize,
              useRigNow ? { planeMargin: RIG_PLANE_MARGIN, pose } : null,
            );
            if (rect) {
              (u.uImprintRects.value as THREE.Vector4[])[2].set(
                rect.x, rect.y, rect.width, rect.height,
              );
              (u.uImprintAlphas.value as number[])[2] = p.showCredit
                ? tiktok.credit.alpha
                : 0;
            }
          }

          syncGradeUniforms(u, p);
        },
      };
    }
  }
}

// ─── WorldRenderer ───────────────────────────────────────────────────────────

export class WorldRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly rigCamera: THREE.PerspectiveCamera;
  private readonly orthoCamera: THREE.OrthographicCamera;
  private active: SceneInstance | null = null;
  private sourceTexture: LoadedWorldTexture | null = null;
  private width = 0;
  private height = 0;

  /**
   * `alpha` matches the scene being ported (R3F default true;
   * ColourGradeScene passes false) and must be known at construction — the
   * WebGL context attribute can't change afterwards.
   */
  constructor(canvas: HTMLCanvasElement, opts?: { alpha?: boolean }) {
    // ThreeCanvas equivalence: antialias on (R3F default), dpr 1,
    // NoToneMapping (the scenes' onCreated), manual render per frame.
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: opts?.alpha ?? true,
      preserveDrawingBuffer: true,
    });
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setPixelRatio(1);

    this.rigCamera = new THREE.PerspectiveCamera(RIG_FOV, 1, 1, 1000);
    this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
  }

  /** Canvas access for the compositor (scene-renderer flattens this). */
  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);

    // useRigCamera (three/camera/CameraRig.tsx:20–32).
    this.rigCamera.aspect = width / height;
    this.rigCamera.near = 1;
    this.rigCamera.far = getRestCameraZ(height) * 4;
    this.rigCamera.position.set(0, 0, getRestCameraZ(height));
    this.rigCamera.updateProjectionMatrix();

    this.orthoCamera.left = -width / 2;
    this.orthoCamera.right = width / 2;
    this.orthoCamera.top = height / 2;
    this.orthoCamera.bottom = -height / 2;
    this.orthoCamera.updateProjectionMatrix();
  }

  /**
   * Load the background texture and build the scene. `scene` selects the
   * shader stack; the texture's colour space follows ColourGradeScene's
   * Original-grade rule (:104–113), mipmaps follow RainScene (:131–136).
   */
  async setBackgroundSource(
    source: WorldBackgroundSource,
    scene: WorldSceneKind,
    width: number,
    height: number,
    initialParams: WorldFrameParams,
    imprints?: PreparedImprints,
  ): Promise<void> {
    this.disposeScene();
    if (width !== this.width || height !== this.height) {
      this.resize(width, height);
    }
    if (source.kind === 'none') return;

    const isOriginalGrade = scene === 'grade' && initialParams.gradeIntensity <= 0.001;
    const loaded = await loadWorldTexture(source.url, {
      colorSpace: isOriginalGrade ? THREE.NoColorSpace : THREE.SRGBColorSpace,
      mipmaps: scene === 'rain',
    });
    this.sourceTexture = loaded;

    this.active = buildScene(
      scene,
      loaded.texture,
      new THREE.Vector2(loaded.width, loaded.height),
      width,
      height,
      initialParams,
      imprints,
    );
    this.active.mesh.scale.set(width, height, 1);
    this.scene.add(this.active.mesh);
    this.renderer.outputColorSpace = this.active.outputColorSpace;
  }

  /** Draw one frame. Pure function of `p` + the preloaded texture. */
  renderFrame(p: WorldFrameParams): void {
    if (p.width !== this.width || p.height !== this.height) {
      this.resize(p.width, p.height);
    }
    if (!this.active) {
      // No background source — renderBackground() returns null (:1244) and
      // the composition root paints the theme background colour underneath.
      this.renderer.setClearColor(0x000000, 1);
      this.renderer.clear(true, true, false);
      return;
    }

    const { frame, fps, width, height, durationInFrames } = p;
    const currentTime = frame / fps;

    // ── Camera rig (CameraRigUpdater, three/camera/CameraRig.tsx:57–63) ──
    // useRig: CameraMotionScene :157 (durationInFrames > 1); the other scenes
    // use !!durationInFrames — identical for any real clip.
    const useRig = p.cameraMotion !== 'static' && durationInFrames > 1;
    let activeCamera: THREE.Camera;
    if (useRig) {
      const rigT = durationInFrames > 1 ? frame / (durationInFrames - 1) : 0;
      const pose = getCameraPose(
        p.cameraMotion,
        rigT,
        currentTime,
        width,
        height,
        p.cameraMotionIntensity,
      );
      const restZ = getRestCameraZ(height);
      this.rigCamera.position.set(pose.x, pose.y, restZ / pose.zoom);
      this.rigCamera.rotation.set(0, 0, pose.rotationZ);
      activeCamera = this.rigCamera;
      this.active.mesh.scale.set(width * RIG_PLANE_MARGIN, height * RIG_PLANE_MARGIN, 1);
    } else {
      activeCamera = this.orthoCamera;
      this.active.mesh.scale.set(width, height, 1);
    }

    this.active.syncUniforms(p, currentTime);
    this.renderer.render(this.scene, activeCamera);
  }

  private disposeScene(): void {
    if (this.active) {
      this.scene.remove(this.active.mesh);
      this.active.material.dispose();
      this.active.geometry.dispose();
      this.active = null;
    }
    this.sourceTexture?.texture.dispose();
    this.sourceTexture = null;
  }

  dispose(): void {
    this.disposeScene();
    this.renderer.dispose();
  }
}

// ─── World-layer dispatcher (Phase 1.2b) ─────────────────────────────────────

import { DepthGalleryRenderer } from './depth-gallery';
import { VideoBackgroundRenderer } from './video-background';
import { CutWorldRenderer } from './cut-world';
import { StripesRenderer } from './stripes';
import type { WorldArgs } from './frame-context';

/**
 * One background layer for a session: setup() with the first frame's
 * WorldArgs builds the right sub-renderer (single-image shader scenes /
 * depth gallery / video background / cut world), renderFrame/prepareFrame
 * then drive it with per-frame WorldArgs.
 *
 * NOTE: only one kind is supported per instance lifetime — the three
 * sub-renderers each own a THREE.WebGLRenderer and a canvas has one WebGL
 * context. Callers that switch background kinds should dispose and recreate.
 */
export class WorldLayerRenderer {
  readonly canvas: HTMLCanvasElement;
  private single: WorldRenderer | null = null;
  private gallery: DepthGalleryRenderer | null = null;
  private video: VideoBackgroundRenderer | null = null;
  private cutWorld: CutWorldRenderer | null = null;
  private stripes: StripesRenderer | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async setup(args: WorldArgs, imprints?: PreparedImprints): Promise<void> {
    switch (args.kind) {
      case 'single-image': {
        if (!this.single) this.single = new WorldRenderer(this.canvas, { alpha: args.alpha });
        await this.single.setBackgroundSource(
          args.source,
          args.scene,
          args.params.width,
          args.params.height,
          args.params,
          imprints,
        );
        break;
      }
      case 'depth-gallery': {
        if (!this.gallery) this.gallery = new DepthGalleryRenderer(this.canvas);
        await this.gallery.setAssets(args.assets);
        break;
      }
      case 'video': {
        if (!this.video) this.video = new VideoBackgroundRenderer(this.canvas);
        await this.video.setSource(args.video, {
          width: args.width,
          height: args.height,
          fps: args.fps,
        });
        break;
      }
      case 'cut-world': {
        if (!this.cutWorld) this.cutWorld = new CutWorldRenderer(this.canvas);
        this.cutWorld.resize(args.params.width, args.params.height);
        await this.cutWorld.setAssets(args.schedule);
        break;
      }
      case 'stripes': {
        if (!this.stripes) this.stripes = new StripesRenderer(this.canvas);
        this.stripes.setStripes(args.setup);
        break;
      }
    }
  }

  /** Preview affordance: free-run cut-world video pool items instead of
   *  parking them per frame. Export leaves the default 'seek' mode. */
  setVideoPlayback(mode: 'play' | 'seek'): void {
    this.cutWorld?.setVideoPlayback(mode);
  }

  /** Export-only: park async resources (video frames) on the exact frame
   * time before renderFrame. No-op for the other kinds. */
  async prepareFrame(args: WorldArgs): Promise<void> {
    if (args.kind === 'video') {
      await this.video?.prepareFrame(args.frame);
    } else if (args.kind === 'cut-world') {
      await this.cutWorld?.prepareFrame(args.frame, args.params.fps);
    }
  }

  renderFrame(args: WorldArgs): void {
    switch (args.kind) {
      case 'single-image':
        this.single?.renderFrame(args.params);
        break;
      case 'depth-gallery':
        this.gallery?.renderFrame(args.frame);
        break;
      case 'video':
        this.video?.renderFrame();
        break;
      case 'cut-world':
        this.cutWorld?.renderFrame(args.params);
        break;
      case 'stripes':
        this.stripes?.renderFrame(args.params);
        break;
    }
  }

  dispose(): void {
    this.single?.dispose();
    this.gallery?.dispose();
    this.video?.dispose();
    this.cutWorld?.dispose();
    this.stripes?.dispose();
    this.single = null;
    this.gallery = null;
    this.video = null;
    this.cutWorld = null;
    this.stripes = null;
  }
}

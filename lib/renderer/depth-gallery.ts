/**
 * lib/renderer/depth-gallery.ts — plain-three.js port of
 * remotion/DepthGalleryBackground.tsx (the AI scene-images / theme scene-pack
 * depth gallery). No React, no R3F, no drei, no Suspense: one
 * THREE.WebGLRenderer driven by `renderFrame(frame)`, a pure function of the
 * frame index and the preloaded assets.
 *
 * Mapping of React concepts:
 *   - delayRender/Suspense texture loading → setAssets() awaits everything
 *     (call from session.ts's prepare phase); the preloadImage dead-URL
 *     filter (:43–88, :994–1045) is replicated with the same all-settled
 *     semantics so `liveImages`/`liveIndices` resolve identically.
 *   - drei useTexture(src) → THREE.Texture built from the loaded image with
 *     TextureLoader defaults (clamp, mipmaps ON / LinearMipmapLinear,
 *     flipY true, NoColorSpace) — NOT the single-image loader's params.
 *   - useImagePalettes + moodPalettes overrides (:281–315, :1047–1065) →
 *     computed once in setAssets (canvas 64×64 pixel extraction, ported
 *     verbatim, incl. normalizePalette + DEFAULT_MOOD_PALETTES).
 *   - buildDirectorTrack / sampleWarpedProgress / sampleGhostPhase /
 *     sampleMoodAt / applyMoodGrade (lib/scene-director.ts) → imported
 *     VERBATIM (framework-free).
 *   - Scene body (:642–885) + useFrame camera (:843–846) + ImagePlane
 *     (:532–638) + MoodBackground shader (:331–445) + buildBorderGeometry
 *     (:461–525) → replicated line-for-line below.
 *   - R3F canvas: fov 45 / near 0.1 / far 100, antialias on, alpha false,
 *     dpr 1, ACESFilmic + sRGB output (R3F v9 defaults; every material is
 *     meshBasicMaterial toneMapped=false or a raw ShaderMaterial, so tone
 *     mapping never actually applies — set for fidelity).
 *   - flyby hook opening (:736–755) and the single-image opacity pin
 *     (:779–783) included.
 *
 * The error-boundary / fallback chain (:1067–1079): when every image fails
 * to load, the original renders the flat fallback <Img> (or nothing).
 * renderFrame returns a flag so the caller (world layer) can paint the
 * fallback image via the single-image path instead.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { MusicTimeline } from '@/lib/audio-analysis';
import {
  buildDirectorTrack,
  sampleWarpedProgress,
  sampleGhostPhase,
  sampleMoodAt,
  applyMoodGrade,
} from '@/lib/scene-director';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MoodPalette {
  background: string;
  blob1: string;
  blob2: string;
}

export interface GalleryImageInput {
  /** Preloaded image element (session pattern) or a URL to load. */
  source: HTMLImageElement | string;
}

export interface DepthGalleryAssets {
  /** Scene image urls (original order — moodPalettes indices refer to this). */
  sceneImages: (HTMLImageElement | string)[];
  /** Sparse per-image palette overrides (sceneImagePalettes prop). */
  moodPalettes?: (MoodPalette | null | undefined)[];
  sceneGallerySpeed?: 'slow' | 'medium' | 'fast';
  audioBpm?: number;
  musicTimeline?: MusicTimeline | null;
  showBorderBars?: boolean;
  hookOpeningPreset?: string;
  fullDurationInFrames?: number;
  fps: number;
  /** Composition durationInFrames (gallery uses fullDurationInFrames ?? this). */
  compositionDurationInFrames: number;
  width: number;
  height: number;
  /** Analysis per frame (128 bins) for the border bars. */
  frequencyData: ArrayLike<number>[] | null;
}

// ─── Palettes (ported verbatim from DepthGalleryBackground.tsx:110–315) ─────

const DEFAULT_MOOD_PALETTES: MoodPalette[] = [
  { background: '#0a1628', blob1: '#1e4080', blob2: '#4a9eff' },
  { background: '#120a28', blob1: '#3d1a78', blob2: '#9b59f5' },
  { background: '#0a1f1c', blob1: '#1a5f52', blob2: '#3ecfb8' },
  { background: '#1a0e05', blob1: '#5c2a08', blob2: '#e06c1a' },
  { background: '#0d1520', blob1: '#1e3550', blob2: '#5b8fc9' },
  { background: '#1a0818', blob1: '#5c1a50', blob2: '#d44fbd' },
];

type RGB = { r: number; g: number; b: number };

const rgbToHex = ({ r, g, b }: RGB): string => {
  const c = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
};

const colorDistance = (a: RGB, b: RGB): number =>
  Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);

const saturationOf = ({ r, g, b }: RGB): number => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
};

const hexToRgb = (hex: string): RGB => {
  const m = /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex.trim());
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
};

const capLumaRgb = (c: RGB, max: number): RGB => {
  const luma = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  if (luma <= max || luma === 0) return c;
  const f = max / luma;
  return { r: c.r * f, g: c.g * f, b: c.b * f };
};

const normalizePalette = (p: MoodPalette): MoodPalette => ({
  background: rgbToHex(hexToRgb(p.background)),
  blob1: rgbToHex(capLumaRgb(hexToRgb(p.blob1), 190)),
  blob2: rgbToHex(capLumaRgb(hexToRgb(p.blob2), 190)),
});

const computePaletteFromPixels = (data: Uint8ClampedArray): MoodPalette => {
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue;
    const key = `${r >> 5},${g >> 5},${b >> 5}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.r += r;
      existing.g += g;
      existing.b += b;
      existing.count += 1;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
  }

  const clusters = Array.from(buckets.values())
    .map((c) => ({ r: c.r / c.count, g: c.g / c.count, b: c.b / c.count, count: c.count }))
    .sort((a, b) => b.count - a.count);

  if (clusters.length === 0) return DEFAULT_MOOD_PALETTES[0];

  const dominant: RGB = clusters[0];

  const blob1Candidate =
    clusters
      .slice(1)
      .filter((c) => colorDistance(c, dominant) > 50)
      .sort((a, b) => saturationOf(b) - saturationOf(a))[0] ?? dominant;

  const blob2Candidate =
    clusters
      .slice(1)
      .filter((c) => colorDistance(c, dominant) > 50 && colorDistance(c, blob1Candidate) > 50)
      .sort((a, b) => saturationOf(b) - saturationOf(a))[0] ?? blob1Candidate;

  const matchedBg = dominant;

  const capLuma = (c: RGB, max: number): RGB => {
    const luma = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
    if (luma <= max || luma === 0) return c;
    const f = max / luma;
    return { r: c.r * f, g: c.g * f, b: c.b * f };
  };

  return {
    background: rgbToHex(matchedBg),
    blob1: rgbToHex(capLuma(blob1Candidate, 190)),
    blob2: rgbToHex(capLuma(blob2Candidate, 190)),
  };
};

/** extractPaletteFromUrl (:235–265) on an already-loaded element. */
function extractPaletteFromImage(img: HTMLImageElement): MoodPalette | null {
  if (typeof document === 'undefined') return null;
  try {
    const W = 64;
    const H = 64;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, W, H);
    const { data } = ctx.getImageData(0, 0, W, H);
    return computePaletteFromPixels(data);
  } catch {
    return null;
  }
}

// ─── Constants (mirror DepthGalleryBackground.tsx:317–327) ──────────────────

const PLANE_GAP = 5.0;
const FIRST_PLANE_VIEW_OFFSET = 5.0;
const LAST_PLANE_VIEW_OFFSET = 5.0;
const PLANE_FADE_SAMPLE_OFFSET = 1.0;
const CAMERA_FOV = 45;
const PARALLAX_AMOUNT = 0.25;
const DRIFT_AMOUNT = 0.15;
const BREATH_TILT = 0.12;
const BREATH_SCALE = 0.08;

// ─── Mood background shader (direct port of :331–390) ───────────────────────

const BG_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const BG_FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  uniform vec3 uBgColor;
  uniform vec3 uBlob1Color;
  uniform vec3 uBlob2Color;
  uniform float uTime;
  uniform float uVelocityIntensity;
  uniform float uBlobStrength;
  uniform float uBlobRadius;
  uniform float uBlobRadiusSecondary;
  uniform float uNoiseStrength;

  float random(vec2 coord) {
    return fract(sin(dot(coord, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    // uTime is seconds; original used ms with * 0.00028, so * 0.28 gives identical speed
    float animTime = uTime * 0.28;

    // Dual-frequency Lissajous wandering — matches tutorial GLSL exactly
    vec2 blob1Center = vec2(
      0.50 + sin(animTime * 1.000) * 0.13 + sin(animTime * 1.618) * 0.05,
      0.48 + cos(animTime * 0.794) * 0.09 + cos(animTime * 1.272) * 0.03
    );
    vec2 blob2Center = vec2(
      0.35 + cos(animTime * 0.927) * 0.11 + cos(animTime * 1.414) * 0.04,
      0.55 + sin(animTime * 1.175) * 0.07 + sin(animTime * 0.618) * 0.03
    );

    vec3 color = uBgColor;

    // Distance in plain UV space — matches source (no aspect correction)
    float blob1 = smoothstep(uBlobRadius, 0.0, distance(vUv, blob1Center));
    float blob2 = smoothstep(uBlobRadiusSecondary, 0.0, distance(vUv, blob2Center));

    // Reduced bg bleed (0.15 instead of 0.35) so blobs stay vivid and the
    // radial gradient is clearly visible against the dark background.
    vec3 blob1SoftColor = mix(uBlob1Color, uBgColor, 0.15);
    vec3 blob2SoftColor = mix(uBlob2Color, uBgColor, 0.15);
    color = mix(color, blob1SoftColor, blob1 * uBlobStrength);
    color = mix(color, blob2SoftColor, blob2 * uBlobStrength);

    color += uVelocityIntensity * 0.10;

    float grain = random(vUv * vec2(1387.13, 947.91)) - 0.5;
    color += grain * uNoiseStrength;

    color = clamp(color, 0.0, 1.0);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const BASE_BLOB_RADIUS = 0.65;
const SECONDARY_BLOB_RATIO = 0.78;
const BASE_BLOB_STRENGTH = 0.9;
const DEPTH_TO_RADIUS = 0.08;
const VELOCITY_TO_STRENGTH = 0.1;

// ─── Border bars (:448–525) ─────────────────────────────────────────────────

const BORDER_BAR_MIN_H = 0.008;
const BORDER_BAR_MAX_H = 0.42;
const BORDER_TOTAL_BARS = 96;
const BORDER_BAR_DEPTH = 0.012;
const BORDER_BAR_GAP = 0.15;

function buildBorderGeometry(
  pw: number,
  ph: number,
  freqData: ArrayLike<number>,
): THREE.BufferGeometry | null {
  if (freqData.length === 0) return null;
  const perim = 2 * (pw + ph);
  const nH = Math.max(4, Math.round((BORDER_TOTAL_BARS * pw) / perim));
  const nV = Math.max(4, Math.round((BORDER_TOTAL_BARS * ph) / perim));
  const geoms: THREE.BufferGeometry[] = [];

  const stepH = pw / nH;
  const stepV = ph / nV;
  const faceH = stepH * (1 - BORDER_BAR_GAP);
  const faceV = stepV * (1 - BORDER_BAR_GAP);

  const getAmp = (i: number, n: number): number => {
    const bin = Math.floor((i / n) * freqData.length);
    return Math.min(1, (freqData[bin] ?? 0) * 9);
  };

  for (let i = 0; i < nH; i++) {
    const x = -pw / 2 + (i + 0.5) * stepH;
    const amp = getAmp(i, nH);
    const h = BORDER_BAR_MIN_H + amp * BORDER_BAR_MAX_H;
    const g = new THREE.BoxGeometry(faceH, h, BORDER_BAR_DEPTH);
    g.translate(x, ph / 2 + h / 2, 0);
    geoms.push(g);
  }
  for (let i = 0; i < nV; i++) {
    const y = ph / 2 - (i + 0.5) * stepV;
    const amp = getAmp(i, nV);
    const h = BORDER_BAR_MIN_H + amp * BORDER_BAR_MAX_H;
    const g = new THREE.BoxGeometry(h, faceV, BORDER_BAR_DEPTH);
    g.translate(pw / 2 + h / 2, y, 0);
    geoms.push(g);
  }
  for (let i = 0; i < nH; i++) {
    const x = pw / 2 - (i + 0.5) * stepH;
    const amp = getAmp(i, nH);
    const h = BORDER_BAR_MIN_H + amp * BORDER_BAR_MAX_H;
    const g = new THREE.BoxGeometry(faceH, h, BORDER_BAR_DEPTH);
    g.translate(x, -ph / 2 - h / 2, 0);
    geoms.push(g);
  }
  for (let i = 0; i < nV; i++) {
    const y = -ph / 2 + (i + 0.5) * stepV;
    const amp = getAmp(i, nV);
    const h = BORDER_BAR_MIN_H + amp * BORDER_BAR_MAX_H;
    const g = new THREE.BoxGeometry(h, faceV, BORDER_BAR_DEPTH);
    g.translate(-pw / 2 - h / 2, y, 0);
    geoms.push(g);
  }

  const merged = mergeGeometries(geoms);
  geoms.forEach((g) => g.dispose());
  return merged;
}

// ─── Speed tiers (:945–971) ─────────────────────────────────────────────────

const SPEED_TO_SEC_PER_PASS: Record<'slow' | 'medium' | 'fast', number> = {
  slow: 60,
  medium: 40,
  fast: 20,
};

const BEATS_PER_PASS: Record<'slow' | 'medium' | 'fast', number> = {
  slow: 48,
  medium: 32,
  fast: 24,
};

function autoSpeedFromBpm(bpm?: number): 'slow' | 'medium' | 'fast' {
  if (!bpm) return 'medium';
  if (bpm < 85) return 'slow';
  if (bpm < 115) return 'medium';
  return 'fast';
}

// ─── Texture from a loaded element (TextureLoader defaults) ────────────────

function galleryTexture(img: HTMLImageElement): THREE.Texture {
  const texture = new THREE.Texture(img);
  // THREE.TextureLoader defaults — clamp, mipmaps on, flipY true,
  // NoColorSpace. NOT the single-image loader's params (the gallery planes
  // are meshBasicMaterial, which applies the output color-space transform).
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.format = THREE.RGBAFormat;
  texture.colorSpace = THREE.NoColorSpace;
  texture.flipY = true;
  texture.needsUpdate = true;
  return texture;
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

// ─── Per-plane runtime ───────────────────────────────────────────────────────

interface PlaneRuntime {
  group: THREE.Group;
  imageMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  borderMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | null;
  texture: THREE.Texture;
  aspect: number;
  barColor: THREE.Color;
  lastBorderGeo: THREE.BufferGeometry | null;
}

export interface DepthGalleryFrameParams {
  frame: number;
}

export class DepthGalleryRenderer {
  private renderer: THREE.WebGLRenderer | null = null;
  private readonly scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera | null = null;
  private moodMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null = null;
  private planes: PlaneRuntime[] = [];
  private moods: MoodPalette[] = [];
  private moodColorCache: { bg: THREE.Color; b1: THREE.Color; b2: THREE.Color }[] = [];
  private assets: DepthGalleryAssets | null = null;
  private directorTrack: ReturnType<typeof buildDirectorTrack> = null;
  private passes = 2;
  private durationInFrames = 1;
  private visibleWidth = 1;
  private visibleHeight = 1;
  private width = 0;
  private height = 0;
  /** True when every image failed to load — caller paints the fallback. */
  public allImagesFailed = false;

  constructor(private readonly canvasEl: HTMLCanvasElement) {}

  get canvas(): HTMLCanvasElement {
    return this.renderer?.domElement ?? this.canvasEl;
  }

  async setAssets(assets: DepthGalleryAssets): Promise<void> {
    this.disposeSceneContent();
    this.assets = assets;
    const { width, height } = assets;
    this.width = width;
    this.height = height;

    if (!this.renderer) {
      // ThreeCanvas: fov 45/near 0.1/far 100, antialias, alpha false, dpr 1.
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvasEl,
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
      });
      this.renderer.setPixelRatio(1);
      // R3F v9 defaults — no effect (all materials opt out), kept for fidelity.
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, width / height, 0.1, 100);
      this.camera.position.set(0, 0, FIRST_PLANE_VIEW_OFFSET);
    }
    this.renderer.setSize(width, height, false);
    this.camera!.aspect = width / height;
    this.camera!.updateProjectionMatrix();

    // ── preloadImage dead-URL filter (:994–1045) ──────────────────────────
    const rawImages = (() => {
      const list = assets.sceneImages;
      if (!list || list.length === 0) return [];
      if (list.length === 1) return [list[0], list[0]]; // :988–991 duplicate
      return list;
    })();

    const loaded = await Promise.all(
      rawImages.map(async (source) => {
        if (typeof source !== 'string') return { source, ok: true as const };
        try {
          return { source: await loadImageElement(source), ok: true as const };
        } catch {
          return { source, ok: false as const };
        }
      }),
    );
    const liveImages: HTMLImageElement[] = [];
    const liveIndices: number[] = [];
    loaded.forEach((r, i) => {
      if (r.ok) {
        liveImages.push(r.source as HTMLImageElement);
        liveIndices.push(i);
      }
    });

    if (liveImages.length === 0) {
      this.allImagesFailed = true;
      return;
    }
    this.allImagesFailed = false;

    // ── Moods (:1047–1065) ────────────────────────────────────────────────
    const allSupplied = !!(
      assets.moodPalettes &&
      liveIndices.length > 0 &&
      liveIndices.every((idx) => !!assets.moodPalettes![idx])
    );
    const extracted = allSupplied
      ? []
      : liveImages.map(
          (img, i) =>
            extractPaletteFromImage(img) ??
            DEFAULT_MOOD_PALETTES[i % DEFAULT_MOOD_PALETTES.length],
        );

    this.moods = Array.from({ length: Math.max(liveImages.length, 2) }, (_, i) => {
      const override = assets.moodPalettes?.[liveIndices[i] ?? i];
      if (override) return normalizePalette(override);
      const ext = extracted[i % Math.max(extracted.length, 1)];
      if (ext) return normalizePalette(ext);
      return DEFAULT_MOOD_PALETTES[i % DEFAULT_MOOD_PALETTES.length];
    });
    this.moodColorCache = this.moods.map((m) => ({
      bg: new THREE.Color(m.background),
      b1: new THREE.Color(m.blob1),
      b2: new THREE.Color(m.blob2),
    }));

    // ── Static gallery math (:642–710) ────────────────────────────────────
    const speed = assets.sceneGallerySpeed ?? autoSpeedFromBpm(assets.audioBpm);
    this.durationInFrames = assets.fullDurationInFrames ?? assets.compositionDurationInFrames;
    const secPerPass =
      assets.audioBpm && assets.audioBpm > 0
        ? BEATS_PER_PASS[speed] * (60 / assets.audioBpm)
        : SPEED_TO_SEC_PER_PASS[speed];
    this.passes = Math.max(
      2,
      Math.round(this.durationInFrames / (assets.fps * secPerPass)),
    );
    this.directorTrack = buildDirectorTrack(
      assets.musicTimeline ?? null,
      this.durationInFrames,
      assets.fps,
      this.passes,
    );

    this.visibleHeight = 2 * PLANE_GAP * Math.tan((CAMERA_FOV * Math.PI) / 180 / 2);
    this.visibleWidth = this.visibleHeight * (width / height);

    // ── Mood background mesh (renderOrder -1, depthTest/Write false) ──────
    const moodMaterial = new THREE.ShaderMaterial({
      vertexShader: BG_VERTEX,
      fragmentShader: BG_FRAGMENT,
      uniforms: {
        uBgColor: { value: new THREE.Color() },
        uBlob1Color: { value: new THREE.Color() },
        uBlob2Color: { value: new THREE.Color() },
        uTime: { value: 0 },
        uVelocityIntensity: { value: 0 },
        uBlobStrength: { value: BASE_BLOB_STRENGTH },
        uBlobRadius: { value: BASE_BLOB_RADIUS },
        uBlobRadiusSecondary: { value: BASE_BLOB_RADIUS * SECONDARY_BLOB_RATIO },
        uNoiseStrength: { value: 0.04 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.moodMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), moodMaterial);
    this.moodMesh.frustumCulled = false;
    this.moodMesh.renderOrder = -1;
    this.scene.add(this.moodMesh);

    // ── Image planes ──────────────────────────────────────────────────────
    const N = liveImages.length;
    this.planes = liveImages.map((img, i) => {
      const texture = galleryTexture(img);
      const aspect =
        img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;

      const palette = this.moods[i] ?? DEFAULT_MOOD_PALETTES[i % DEFAULT_MOOD_PALETTES.length];
      const hsl = { h: 0, s: 0, l: 0 };
      new THREE.Color(palette.blob1).getHSL(hsl);
      const barColor = new THREE.Color().setHSL(hsl.h, Math.max(hsl.s, 0.7), Math.max(hsl.l, 0.55));

      const imageMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map: texture,
          toneMapped: false,
          transparent: true,
          depthWrite: false,
          opacity: 1,
        }),
      );

      const group = new THREE.Group();
      group.position.set(0, 0, -i * PLANE_GAP);
      group.add(imageMesh);
      this.scene.add(group);

      return {
        group,
        imageMesh,
        borderMesh: null,
        texture,
        aspect,
        barColor,
        lastBorderGeo: null,
      };
    });
    void N;
  }

  /** Draw one frame — the Scene body (:642–885) + useFrame (:843–846). */
  renderFrame(frame: number): void {
    if (!this.renderer || !this.camera || !this.assets || this.allImagesFailed) return;
    const assets = this.assets;
    const { fps } = assets;
    const durationInFrames = this.durationInFrames;
    const N = this.planes.length;

    // ── Camera Z (:720–755) ───────────────────────────────────────────────
    const nearestZ = 0;
    const deepestZ = -(N - 1) * PLANE_GAP;
    const cameraStartZ = nearestZ + FIRST_PLANE_VIEW_OFFSET;
    const cameraEndZ = deepestZ + LAST_PLANE_VIEW_OFFSET;

    const sampleCameraZ = (f: number): number => {
      const rawProgress = this.directorTrack
        ? sampleWarpedProgress(this.directorTrack, f)
        : f / Math.max(durationInFrames - 1, 1);
      const ghost = this.directorTrack ? sampleGhostPhase(this.directorTrack, f) : 0;
      const phase = rawProgress * this.passes * Math.PI + ghost;
      const eased = 0.5 - 0.5 * Math.cos(phase);
      return cameraStartZ + (cameraEndZ - cameraStartZ) * eased;
    };

    const FLYBY_FRAMES = 30;
    const sampleEffectiveCameraZ = (f: number): number => {
      if (assets.hookOpeningPreset !== 'flyby' || f >= FLYBY_FRAMES) return sampleCameraZ(f);
      const t = f / FLYBY_FRAMES;
      const eased = t * t * t * (t * (t * 6 - 15) + 10);
      const flybyStartZ = cameraEndZ - PLANE_GAP * 3;
      const flybyEndZ = sampleCameraZ(FLYBY_FRAMES);
      return flybyStartZ + (flybyEndZ - flybyStartZ) * eased;
    };

    const effectiveCameraZ = sampleEffectiveCameraZ(frame);

    // ── Velocity (:759–767) ───────────────────────────────────────────────
    const dF = 1.5;
    const rawVelocity =
      (sampleEffectiveCameraZ(Math.min(frame + dF, durationInFrames - 1)) -
        sampleEffectiveCameraZ(Math.max(frame - dF, 0))) /
      (2 * dF);
    const avgSpeed = Math.abs(cameraEndZ - cameraStartZ) / Math.max(durationInFrames - 1, 1);
    const peakVelocity = avgSpeed * 1.8;
    const velocityIntensity = Math.min(Math.abs(rawVelocity) / Math.max(peakVelocity, 1e-6), 1);

    // ── Plane opacity crossfade (:769–790) ────────────────────────────────
    const firstPlaneZ = 0;
    const lastIdx = N - 1;
    const sampledCameraZ = effectiveCameraZ - PLANE_GAP * PLANE_FADE_SAMPLE_OFFSET;
    const normalizedDepth = Math.max(
      0,
      Math.min(lastIdx, (firstPlaneZ - sampledCameraZ) / PLANE_GAP),
    );
    const currentPlaneIndex = Math.floor(normalizedDepth);
    const nextPlaneIndex = Math.min(currentPlaneIndex + 1, lastIdx);
    const planeBlend = normalizedDepth - currentPlaneIndex;

    const planeOpacities: number[] =
      N <= 1
        ? [1]
        : Array.from({ length: N }, (_, i) => {
            let target = 0;
            if (i === currentPlaneIndex) target = 1 - planeBlend;
            if (i === nextPlaneIndex) target = Math.max(target, planeBlend);
            return target;
          });

    // ── Mood blend (:792–830) ─────────────────────────────────────────────
    const moodSampleZ = effectiveCameraZ - PLANE_GAP * 1.0;
    const moodNormalized = Math.max(0, Math.min(lastIdx, (firstPlaneZ - moodSampleZ) / PLANE_GAP));
    const moodIdx0 = Math.floor(moodNormalized);
    const moodIdx1 = Math.min(moodIdx0 + 1, lastIdx);
    const moodBlend = moodNormalized - moodIdx0;

    const cur = this.moodColorCache[moodIdx0 % this.moodColorCache.length];
    const nxt = this.moodColorCache[moodIdx1 % this.moodColorCache.length];
    const bgColor = cur.bg.clone().lerp(nxt.bg, moodBlend);
    const blob1Color = cur.b1.clone().lerp(nxt.b1, moodBlend);
    const blob2Color = cur.b2.clone().lerp(nxt.b2, moodBlend);

    if (assets.musicTimeline) {
      const mood = sampleMoodAt(assets.musicTimeline, frame / fps);
      if (mood) {
        applyMoodGrade(bgColor, mood);
        applyMoodGrade(blob1Color, mood);
        applyMoodGrade(blob2Color, mood);
      }
    }

    const t = frame / fps;
    const pointerX = Math.sin(t * 0.4) * 0.75;
    const pointerY = Math.cos(t * 0.32) * 0.55;
    const driftCurrent = Math.sin(t * 0.0707) * 0.65 + Math.sin(t * 0.1257 + 1.4) * 0.35;
    const breathIntensity = velocityIntensity;

    // ── Camera (useFrame :843–846) ────────────────────────────────────────
    this.camera.position.set(0, 0, effectiveCameraZ);
    this.camera.lookAt(0, 0, effectiveCameraZ - 1);

    // ── Mood background uniforms (:402–432) ───────────────────────────────
    const mu = this.moodMesh!.material.uniforms;
    (mu.uBgColor.value as THREE.Color).copy(bgColor);
    (mu.uBlob1Color.value as THREE.Color).copy(blob1Color);
    (mu.uBlob2Color.value as THREE.Color).copy(blob2Color);
    mu.uTime.value = t;
    mu.uVelocityIntensity.value = velocityIntensity;
    const blobRadius = THREE.MathUtils.clamp(
      BASE_BLOB_RADIUS + moodBlend * DEPTH_TO_RADIUS,
      0.05,
      1,
    );
    mu.uBlobRadius.value = blobRadius;
    mu.uBlobRadiusSecondary.value = blobRadius * SECONDARY_BLOB_RATIO;
    mu.uBlobStrength.value = THREE.MathUtils.clamp(
      BASE_BLOB_STRENGTH + velocityIntensity * VELOCITY_TO_STRENGTH,
      0,
      1,
    );

    // ── Image planes (:532–638) ───────────────────────────────────────────
    const frequencyData =
      assets.showBorderBars && assets.frequencyData ? assets.frequencyData[frame] : undefined;

    for (let i = 0; i < this.planes.length; i++) {
      const plane = this.planes[i];
      const opacity = planeOpacities[i];
      const depthFactor = i / Math.max(N - 1, 1);

      // Fit (:568–575)
      const margin = 0.86;
      const fitByHeight = this.visibleHeight * margin;
      const fitByWidth = (this.visibleWidth * margin) / plane.aspect;
      const planeHeight = Math.min(fitByHeight, fitByWidth);
      const planeWidth = planeHeight * plane.aspect;

      // Parallax / breath (:578–585)
      const parallaxInfluence = opacity * (1 + depthFactor * 0.35);
      const x = pointerX * PARALLAX_AMOUNT * parallaxInfluence;
      const y =
        pointerY * PARALLAX_AMOUNT * parallaxInfluence + driftCurrent * DRIFT_AMOUNT;
      const breathInfluence = breathIntensity * opacity;
      const rotationX = -pointerY * BREATH_TILT * breathInfluence;
      const rotationY = pointerX * BREATH_TILT * breathInfluence;
      const scale = 1 + BREATH_SCALE * breathInfluence;

      plane.group.position.set(x, y, -i * PLANE_GAP);
      plane.group.rotation.set(rotationX, rotationY, 0);
      plane.group.scale.set(scale, scale, scale);

      plane.imageMesh.visible = opacity > 0.001;
      plane.imageMesh.material.opacity = opacity;
      plane.imageMesh.scale.set(planeWidth, planeHeight, 1);

      // Border bars (:596–600, :624–635) — rebuilt per frame when shown.
      const wantBars = !!frequencyData && frequencyData.length > 0 && opacity > 0.02;
      if (wantBars) {
        const geo = buildBorderGeometry(planeWidth, planeHeight, frequencyData!);
        if (plane.lastBorderGeo) plane.lastBorderGeo.dispose();
        plane.lastBorderGeo = geo;
        if (!plane.borderMesh && geo) {
          plane.borderMesh = new THREE.Mesh(
            geo,
            new THREE.MeshBasicMaterial({
              color: plane.barColor,
              toneMapped: false,
              transparent: true,
              depthWrite: false,
              opacity: opacity * 0.55,
              blending: THREE.AdditiveBlending,
            }),
          );
          plane.group.add(plane.borderMesh);
        } else if (plane.borderMesh && geo) {
          plane.borderMesh.geometry = geo;
        }
        if (plane.borderMesh) {
          plane.borderMesh.visible = true;
          plane.borderMesh.material.opacity = opacity * 0.55;
        }
      } else if (plane.borderMesh) {
        plane.borderMesh.visible = false;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  private disposeSceneContent(): void {
    if (this.moodMesh) {
      this.scene.remove(this.moodMesh);
      this.moodMesh.geometry.dispose();
      this.moodMesh.material.dispose();
      this.moodMesh = null;
    }
    for (const plane of this.planes) {
      plane.texture.dispose();
      plane.imageMesh.geometry.dispose();
      plane.imageMesh.material.dispose();
      plane.lastBorderGeo?.dispose();
      plane.borderMesh?.material.dispose();
      this.scene.remove(plane.group);
    }
    this.planes = [];
    this.allImagesFailed = false;
  }

  dispose(): void {
    this.disposeSceneContent();
    this.renderer?.dispose();
    this.renderer = null;
  }
}

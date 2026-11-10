/**
 * lib/renderer/cut-world.ts — the cut-world renderer: roughclip's
 * "cut world" (lib/renderer/tiktok-world.ts) ported onto wavecanvas's
 * vendored three tree and extended for full-length songs.
 *
 * One THREE.WebGLRenderer + one ShaderMaterial plane
 * (vendor/three/shaders/cutWorld.ts) showing ONE pool item at a time. At
 * the beat-driven cut points from lib/aesthetics/cut-schedule.ts the texture
 * hard-swaps to the next scheduled item; the same item renders blurred as
 * the full-frame backdrop behind the focal zone; the camera rig
 * (push-in/drift/orbit/breathing — vendor/three/camera/cameraMotion.ts)
 * carries through the cuts; motion-effect atmospheres (pulse / rgb-glitch /
 * rain / dream) run in zone space; glitch/breakout flash choreography
 * (cut-schedule's CutWorldChoreoFrame, built from MusicTimeline impacts)
 * punctuates the frame.
 *
 * Long-form differences from roughclip:
 *   - no MAX_CUT_WORLD_IMAGES=9 clip cap semantics — the pool cycles via
 *     cut-schedule's per-cycle shuffled `shotItems` mapping (shot → item);
 *   - pool items may be VIDEOS: deterministic per-frame seeking in 'seek'
 *     mode (export), free-running in 'play' mode (preview). Video frames are
 *     blitted through a Canvas2D into a CanvasTexture — the compositor-
 *     identical YUV→RGB path documented in video-background.ts (raw
 *     VideoTexture uploads shift colour for untagged H.264);
 *   - no collage grid, no UV imprints (wavecanvas draws watermark/lockup in
 *     the overlay layer), no tiktok solid zones (blurred backdrop instead).
 *
 * Deterministic per frame: every uniform is a pure function of the frame
 * index + the preloaded assets; no wall clock.
 */
import * as THREE from 'three';
import {
  CUT_WORLD_FRAGMENT_SHADER,
  CUT_WORLD_VERTEX_SHADER,
} from '@/lib/renderer/vendor/three/shaders/cutWorld';
import { PULSE_SETTINGS } from '@/lib/renderer/vendor/three/shaders/pulseMotion';
import { GLITCH_SETTINGS } from '@/lib/renderer/vendor/three/shaders/rgbGlitch';
import {
  RIG_FOV,
  RIG_PLANE_MARGIN,
  getCameraPose,
  getRestCameraZ,
  type CameraMotion,
  type CameraMotionIntensity,
} from '@/lib/renderer/vendor/three/camera/cameraMotion';
import {
  poolItemAtTime,
  sampleCutTransition,
  shotStartAtTime,
  type CutWorldChoreoFrame,
  type CutWorldSchedule,
} from '@/lib/aesthetics/cut-schedule';

/** Effect ids matching the uMotionEffect branches in the cutWorld shader. */
const MOTION_EFFECT_IDS = {
  pulse: 1,
  'rgb-glitch': 2,
  rain: 3,
  dream: 4,
} as const;

const REST_POSE = { x: 0, y: 0, zoom: 1, rotationZ: 0 };

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

/** RgbGlitchScene.tsx:89–102 — verbatim (matches world-renderer.ts). */
const getMostRecentBeatIndex = (audioBeats: number[], currentTime: number): number => {
  let idx = -1;
  for (let i = 0; i < audioBeats.length; i++) {
    if (audioBeats[i] <= currentTime) idx++;
    else break;
  }
  return idx;
};

/** Deterministic pseudo-random in [0, 1) — matches the shader's hash. */
const hash = (n: number): number => {
  const s = Math.sin(n) * 43758.5453;
  return s - Math.floor(s);
};

// ─── Frame params ────────────────────────────────────────────────────────────

/**
 * Per-frame inputs — built by frame-context's buildWorldArgs ('scene-images'
 * branch). The schedule itself is session-static and handed to setAssets;
 * `choreo` is sampled per frame by the caller (cut-schedule's
 * sampleCutWorldChoreo).
 */
export interface CutWorldFrameParams {
  frame: number;
  fps: number;
  width: number;
  height: number;
  /** Rig timeline length (the composition's cameraDurationInFrames). */
  durationInFrames: number;
  cameraMotion: CameraMotion;
  cameraMotionIntensity: CameraMotionIntensity;
  /** Steady wave amplitude (BACKGROUND_WAVE_CONSTANT × waveEnergyMultiplier). */
  waveEnergy: number;
  /** Beat grid for the wave beat-pulse + rgb-glitch bursts. */
  audioBeats: number[];
  motionEffect: 'pulse' | 'rgb-glitch' | 'rain' | 'dream' | null;
  motionEffectScale: number;
  motionEffectGrayscale: boolean;
  /** Raw Gaussian bass (frame-context motionWaveEnergy). */
  motionWaveEnergy: number;
  /** Scales the motion-effect animation clock (1 = realtime). */
  motionTimeScale: number;
  /** slowedgen-style big pulse (pulse effect only). */
  pulseBoost: boolean;
  /** Focal-zone bounds in frame px (portrait middle band; landscape full). */
  zoneTopPx: number;
  zoneBottomPx: number;
  /** Choreography sample for this frame (null = no impacts). */
  choreo: CutWorldChoreoFrame | null;
  /** Per-cut punch-in zoom (≥ 1) from cut-schedule's cutPunchZoomAt — the
   *  constant rhythm layer; the breakout zoom wins when larger. */
  cutPunchZoom: number;
  // ── Grade (same plumbing as the single-image scenes) ──
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
  /** User backgroundBlur setting — reveal blur on the FOCAL zone. */
  backgroundBlur: number;
}

// ─── Texture loading ─────────────────────────────────────────────────────────

interface LoadedCutTexture {
  texture: THREE.Texture;
  width: number;
  height: number;
  kind: 'image' | 'video';
  video?: HTMLVideoElement;
  blit?: HTMLCanvasElement;
  blitCtx?: CanvasRenderingContext2D;
  /** Video duration in seconds (shot-relative loop length). */
  videoDuration?: number;
}

/** Same parameters as world-renderer.ts's loadWorldTexture (clamp, linear,
 *  no mipmaps, RGBA, sRGB) so pool images sample identically to the other
 *  scenes' backgrounds. */
function loadImageTexture(url: string): Promise<LoadedCutTexture> {
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
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      resolve({
        texture,
        width: img.naturalWidth || img.width || 1,
        height: img.naturalHeight || img.height || 1,
        kind: 'image',
      });
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Video pool item: HTMLVideoElement → Canvas2D blit → CanvasTexture (the
 * video-background.ts pattern — compositor-identical colour). SRGB colour
 * space so it samples through the shader exactly like the image textures.
 */
function loadVideoTexture(url: string): Promise<LoadedCutTexture> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';
    video.src = url;
    video.addEventListener('loadeddata', () => {
      const w = video.videoWidth || 1;
      const h = video.videoHeight || 1;
      const blit = document.createElement('canvas');
      blit.width = w;
      blit.height = h;
      const blitCtx = blit.getContext('2d');
      if (!blitCtx) {
        reject(new Error(`Failed to create blit context for video: ${url}`));
        return;
      }
      blitCtx.drawImage(video, 0, 0, w, h);
      const texture = new THREE.CanvasTexture(blit);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.format = THREE.RGBAFormat;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      resolve({
        texture,
        width: w,
        height: h,
        kind: 'video',
        video,
        blit,
        blitCtx,
        videoDuration: video.duration || 1,
      });
    });
    video.addEventListener('error', () => reject(new Error(`Failed to load video: ${url}`)));
    video.load();
  });
}

// ─── Renderer ────────────────────────────────────────────────────────────────

export class CutWorldRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly rigCamera: THREE.PerspectiveCamera;
  private readonly orthoCamera: THREE.OrthographicCamera;
  private geometry: THREE.PlaneGeometry | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private mesh: THREE.Mesh | null = null;
  private textures: LoadedCutTexture[] = [];
  private schedule: CutWorldSchedule | null = null;
  private prevVideo: HTMLVideoElement | null = null;
  private width = 0;
  private height = 0;
  /** 'play' = free-run videos (preview); 'seek' = park on exact frame (export). */
  private videoPlayback: 'play' | 'seek' = 'seek';

  constructor(canvas: HTMLCanvasElement) {
    // ThreeCanvas equivalence (world-renderer.ts): antialias on, dpr 1,
    // NoToneMapping, manual render per frame. The world is opaque.
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.rigCamera = new THREE.PerspectiveCamera(RIG_FOV, 1, 1, 1000);
    this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  setVideoPlayback(mode: 'play' | 'seek'): void {
    this.videoPlayback = mode;
  }

  /**
   * Load the pool textures (schedule order) and build the plane. Like
   * roughclip, a dead item drops out of the sequence; only when EVERY load
   * fails does this throw. When items were dropped, the shot→item mapping is
   * rebuilt against the survivors (pool-item identity is positional).
   */
  async setAssets(schedule: CutWorldSchedule): Promise<void> {
    this.disposeContent();

    const results = await Promise.allSettled(
      schedule.items.map((item) =>
        item.kind === 'video' ? loadVideoTexture(item.url) : loadImageTexture(item.url),
      ),
    );
    const survivorIdx: number[] = [];
    const loaded: LoadedCutTexture[] = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        survivorIdx.push(i);
        loaded.push(r.value);
      }
    });
    if (schedule.items.length > 0 && loaded.length === 0) {
      throw new Error(
        `CutWorldRenderer: every pool item failed to load (${schedule.items
          .map((i) => i.url)
          .join(', ')})`,
      );
    }

    // Remap shotItems onto the survivors (positional compaction).
    const remap = new Map<number, number>();
    survivorIdx.forEach((orig, compact) => remap.set(orig, compact));
    const shotItems = schedule.shotItems.map((item) => remap.get(item) ?? 0);
    this.schedule = { ...schedule, items: schedule.items.filter((_, i) => remap.has(i)), shotItems };
    this.textures = loaded;
    this.rebuildMaterial();
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

    if (this.material) {
      (this.material.uniforms.uResolution.value as THREE.Vector2).set(width, height);
      (this.material.uniforms.uBlurResolution.value as THREE.Vector2).set(width, height);
    }
  }

  private rebuildMaterial(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh = null;
    }
    this.material?.dispose();
    this.material = null;
    this.geometry?.dispose();
    this.geometry = null;

    const first = this.textures[0];
    if (!first) return;

    this.material = new THREE.ShaderMaterial({
      vertexShader: CUT_WORLD_VERTEX_SHADER,
      fragmentShader: CUT_WORLD_FRAGMENT_SHADER,
      uniforms: {
        uImage: { value: first.texture },
        uResolution: { value: new THREE.Vector2(this.width, this.height) },
        uImageRes: { value: new THREE.Vector2(first.width, first.height) },
        uPrevImage: { value: first.texture },
        uPrevImageRes: { value: new THREE.Vector2(first.width, first.height) },
        uCrossfade: { value: 0 },
        uTime: { value: 0 },
        uWave: { value: 0 },
        uFreq: { value: 10.0 },
        uSpeed: { value: 1.7 },
        uRigPose: { value: new THREE.Vector3(0, 0, 1) },
        uPlaneMargin: { value: 1 },
        uZoneTopV: { value: 1 },
        uZoneBottomV: { value: 0 },
        uZoneHeightPx: { value: this.height },
        uMotionEffect: { value: 0 },
        uPulseTime: { value: 0 },
        uPulseRipple: { value: 0 },
        uPulseBoost: { value: 0 },
        uPulseEnergy: { value: 0 },
        uGlitchSeed: { value: 0 },
        uGlitchIntensity: { value: 0 },
        uGlitchGrayMix: { value: 0 },
        uRainIntensity: { value: 1 },
        uDreamIntensity: { value: 1 },
        uDreamEnergy: { value: 0 },
        uGlitchEvent: { value: 0 },
        uBreakoutZoom: { value: 1 },
        uBreakoutEdge: { value: 0 },
        uBackdropBlur: { value: 0.55 },
        uBackdropDarken: { value: 0.35 },
        uGradeIntensity: { value: 0 },
        uBrandBackground: { value: new THREE.Vector3(0.06, 0.06, 0.09) },
        uBrandAccent: { value: new THREE.Vector3(0.66, 0.33, 0.97) },
        uBrandText: { value: new THREE.Vector3(1, 1, 1) },
        uGradeLift: { value: 0 },
        uGradeGamma: { value: 1 },
        uGradeGain: { value: 1 },
        uGradeSaturation: { value: 1 },
        uGradeContrast: { value: 1 },
        uGradeGrain: { value: 0 },
        uBackgroundBlur: { value: 0 },
        uBlurResolution: { value: new THREE.Vector2(this.width, this.height) },
      },
    });

    this.geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.scale.set(this.width, this.height, 1);
    this.scene.add(this.mesh);
  }

  /**
   * Export-only: seek the active shot's video to the exact composition time
   * for this frame and wait for the seek (video-background.ts pattern:
   * seekable wait + 500 ms safety net). Preview free-runs and never calls
   * this.
   */
  async prepareFrame(frame: number, fps: number): Promise<void> {
    if (this.videoPlayback !== 'seek') return;
    const schedule = this.schedule;
    if (!schedule || this.textures.length === 0) return;

    const currentTime = frame / fps;
    const cur = this.textures[poolItemAtTime(schedule, currentTime)];
    const video = cur?.video;
    if (!cur || !video) return;

    const shotStart = shotStartAtTime(schedule, currentTime);
    const len = Math.max(0.1, cur.videoDuration ?? 1);
    const target = Math.max(0, currentTime - shotStart) % len;
    if (Math.abs(video.currentTime - target) <= 1 / fps) return;

    video.pause();
    for (let i = 0; i < 100 && video.seekable.length === 0; i++) {
      await new Promise((r) => setTimeout(r, 50));
    }
    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      video.addEventListener('seeked', onSeeked);
      video.currentTime = target;
      setTimeout(() => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      }, 500);
    });
  }

  /** Draw one frame. Pure function of `p` + the preloaded textures. */
  renderFrame(p: CutWorldFrameParams): void {
    if (p.width !== this.width || p.height !== this.height) {
      this.resize(p.width, p.height);
    }
    if (!this.material || !this.mesh || !this.schedule) {
      // No pool loaded — the composition root paints underneath.
      this.renderer.setClearColor(0x000000, 1);
      this.renderer.clear(true, true, false);
      return;
    }

    const {
      frame,
      fps,
      width,
      height,
      durationInFrames,
      zoneTopPx,
      zoneBottomPx,
      choreo,
    } = p;
    const currentTime = frame / fps;

    // ── Camera rig (CameraRigUpdater, three/camera/CameraRig.tsx:57–63) ──
    // The rig carries through cuts — the pose never resets on a texture swap.
    const useRig = p.cameraMotion !== 'static' && durationInFrames > 1;
    let activeCamera: THREE.Camera;
    let pose = { ...REST_POSE };
    if (useRig) {
      const rigT = durationInFrames > 1 ? frame / (durationInFrames - 1) : 0;
      pose = getCameraPose(p.cameraMotion, rigT, currentTime, width, height, p.cameraMotionIntensity);
      const restZ = getRestCameraZ(height);
      this.rigCamera.position.set(pose.x, pose.y, restZ / pose.zoom);
      this.rigCamera.rotation.set(0, 0, pose.rotationZ);
      activeCamera = this.rigCamera;
      this.mesh.scale.set(width * RIG_PLANE_MARGIN, height * RIG_PLANE_MARGIN, 1);
    } else {
      activeCamera = this.orthoCamera;
      this.mesh.scale.set(width, height, 1);
    }

    // ── Wave amplitude (TikTokWorldScene.tsx:240–252 beat-pulse gaussian) ──
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

    // ── Zone bounds + BREAKOUT envelope (roughclip tiktok-world.ts:632–641) ──
    const breakoutTopE = choreo?.breakoutTop ?? 0;
    const breakoutBottomE = choreo?.breakoutBottom ?? 0;
    const zoneTopVEff = 1 - (zoneTopPx * (1 - breakoutTopE)) / height;
    const zoneBottomVEff = 1 - (zoneBottomPx + (height - zoneBottomPx) * breakoutBottomE) / height;
    const zoneHeightPxEff =
      zoneBottomPx + (height - zoneBottomPx) * breakoutBottomE - zoneTopPx * (1 - breakoutTopE);
    const breakoutE = choreo?.breakout ?? 0;
    const breakoutEdgeMotion = 4 * breakoutE * (1 - breakoutE);

    // ── Motion-effect drivers (same math as the tiktok-world scene) ────────
    const motionEffectId = p.motionEffect ? (MOTION_EFFECT_IDS[p.motionEffect] ?? 0) : 0;
    const normalisedEnergy = clamp(p.motionWaveEnergy, 0, 1);
    const effectTime = currentTime * p.motionTimeScale;

    const pulseBreathe =
      0.8 + 0.2 * Math.sin(effectTime * 0.7) * Math.sin(effectTime * 1.13 + 1.7);
    const pulseRipple =
      (PULSE_SETTINGS.rippleEnergyBase + normalisedEnergy * PULSE_SETTINGS.rippleEnergyRange) *
      0.5 *
      pulseBreathe *
      p.motionEffectScale;
    const pulseTime = effectTime * PULSE_SETTINGS.timeScale;

    const glitchBeatIdx = getMostRecentBeatIndex(p.audioBeats, currentTime);
    const glitchUseBeats = p.audioBeats.length > 0 && glitchBeatIdx >= 0;
    const glitchPulseIndex = glitchUseBeats ? glitchBeatIdx : Math.floor(currentTime / 2.5);
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

    // ── Texture swap at the cut points (the cut world itself) ─────────────
    const u = this.material.uniforms;
    const itemIdx = poolItemAtTime(this.schedule, currentTime);
    const cur = this.textures[itemIdx] ?? this.textures[0];
    u.uImage.value = cur.texture;
    (u.uImageRes.value as THREE.Vector2).set(cur.width, cur.height);

    // Transition into this shot (cut / flash / crossfade) — pure function of
    // time + schedule. A crossfading video item keeps its last blitted frame.
    const transition = sampleCutTransition(this.schedule, currentTime);
    if (transition.crossfade > 0) {
      const prev = this.textures[transition.prevItem] ?? cur;
      u.uPrevImage.value = prev.texture;
      (u.uPrevImageRes.value as THREE.Vector2).set(prev.width, prev.height);
    }
    u.uCrossfade.value = transition.crossfade;

    if (cur.video && cur.blitCtx && cur.blit) {
      // Video pool item: preview free-runs; export was parked on the exact
      // frame by prepareFrame. Either way, blit the current picture.
      const video = cur.video;
      if (this.prevVideo && this.prevVideo !== video) this.prevVideo.pause();
      if (this.videoPlayback === 'play') {
        if (video.paused) void video.play().catch(() => {});
        const shotStart = shotStartAtTime(this.schedule, currentTime);
        const len = Math.max(0.1, cur.videoDuration ?? 1);
        const target = Math.max(0, currentTime - shotStart) % len;
        if (Math.abs(video.currentTime - target) > 0.5) video.currentTime = target;
      } else if (!video.paused) {
        video.pause();
      }
      cur.blitCtx.drawImage(video, 0, 0, cur.blit.width, cur.blit.height);
      cur.texture.needsUpdate = true;
      this.prevVideo = video;
    } else if (this.prevVideo) {
      this.prevVideo.pause();
      this.prevVideo = null;
    }

    // ── Uniform sync ───────────────────────────────────────────────────────
    u.uTime.value = effectTime;
    u.uWave.value = waveAmp;
    (u.uRigPose.value as THREE.Vector3).set(pose.x, pose.y, pose.zoom);
    u.uPlaneMargin.value = useRig ? RIG_PLANE_MARGIN : 1;

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

    u.uGradeIntensity.value = p.gradeIntensity;
    (u.uBrandBackground.value as THREE.Vector3).set(...p.brandBackground);
    (u.uBrandAccent.value as THREE.Vector3).set(...p.brandAccent);
    (u.uBrandText.value as THREE.Vector3).set(...p.brandText);
    u.uGradeLift.value = p.gradeLift;
    u.uGradeGamma.value = p.gradeGamma;
    u.uGradeGain.value = p.gradeGain + (choreo?.gradeGainDelta ?? 0) + transition.flashGain;
    u.uGradeSaturation.value = p.gradeSaturation;
    u.uGradeContrast.value = p.gradeContrast;
    u.uGradeGrain.value = p.gradeGrain;

    // Choreography: motion-blur spike adds to the user's reveal blur; the
    // glitch envelope fires over any atmosphere; zone bounds + zoom punch.
    // The zoom channel carries BOTH the per-cut punch-in (constant rhythm)
    // and the bigger impact breakout overshoot — whichever is larger wins.
    u.uBackgroundBlur.value = Math.min(1, p.backgroundBlur + (choreo?.motionBlur ?? 0));
    u.uGlitchEvent.value = Math.min(1, choreo?.glitch ?? 0);
    u.uZoneTopV.value = zoneTopVEff;
    u.uZoneBottomV.value = zoneBottomVEff;
    u.uZoneHeightPx.value = zoneHeightPxEff;
    u.uBreakoutZoom.value = Math.max(choreo?.breakoutZoom ?? 1, p.cutPunchZoom);
    u.uBreakoutEdge.value = breakoutEdgeMotion;

    this.renderer.render(this.scene, activeCamera);
  }

  private disposeContent(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh = null;
    }
    this.material?.dispose();
    this.material = null;
    this.geometry?.dispose();
    this.geometry = null;
    for (const t of this.textures) {
      t.texture.dispose();
      if (t.video) {
        t.video.pause();
        t.video.removeAttribute('src');
        t.video.load();
      }
    }
    this.textures = [];
    this.schedule = null;
    this.prevVideo = null;
  }

  dispose(): void {
    this.disposeContent();
    this.renderer.dispose();
  }
}

/**
 * lib/renderer/video-background.ts — frame-exact video backgrounds,
 * replacing remotion/VideoBackgroundLayer.tsx (DOM <video> / @remotion/media
 * <Video>) with an HTMLVideoElement-driven WebGL texture.
 *
 * Time mapping (replicated exactly):
 *   - mode 'pingpong' — PreviewVideoBackground (:36–77): the editor preview
 *     path (useHtml5Audio). cycle = floor(t/duration); even cycles forward,
 *     odd cycles reversed (boomerang driven in JS). Used by BOTH video
 *     branches in preview (the boomerang asset is ignored there).
 *   - mode 'loop' — the Lambda render path (:107–121): @remotion/media
 *     <Video loop> of `boomerangVideoUrl ?? videoUrl`, i.e. videoTime =
 *     t % duration of the chosen asset. This is what the export pipeline
 *     uses to stay pixel-consistent with current Lambda output.
 *
 * Seeking: export-style determinism needs frame-exact samples, so each
 * renderFrame seeks to the exact target time and awaits 'seeked' (roughclip
 * lib/renderer/tiktok-world.ts:464–494 pattern, 500 ms fallback). The
 * remotion/VideoBackgroundLayer.tsx:21 warning says mediabunny WASM decoding
 * was tried and abandoned for mobile glitches — hence plain
 * HTMLVideoElement seeking here too. Seek tolerance mirrors the original:
 * skip the seek when |currentTime − target| ≤ 1/fps (the preview's own
 * hysteresis), so consecutive frames within one video frame show the same
 * image both sides.
 *
 * Drawing: the video frame is blitted through a 2D canvas each frame and
 * textured from THAT (CanvasTexture). Reason: texImage2D-from-<video>
 * (VideoTexture) converts YUV→RGB on the WebGL upload path, which does NOT
 * match the page compositor's conversion for untagged content (measured
 * ~+10 R/G uniform shift on a BT.709-untagged source in headless Chromium)
 * — while Canvas2D drawImage uses the exact same conversion as the DOM
 * compositor, which is what the original PreviewVideoBackground shows.
 * The cover-fit quad then matches CSS objectFit: cover. flipY stays at the
 * three default (true) — the same upload path as the image scenes, proven
 * bit-exact in Phase 1.2a.
 */
import * as THREE from 'three';

export type VideoPlaybackMode = 'pingpong' | 'loop';

export interface VideoBackgroundSource {
  kind: 'video';
  url: string;
  /** Render path ('loop' mode) prefers this pre-baked forward+reversed copy. */
  boomerangUrl?: string | null;
  mode: VideoPlaybackMode;
}

const COVER_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

// CSS objectFit: cover — uniform scale, centre crop (frame-space).
const COVER_FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform vec2 uVideoRes;

  void main() {
    float frameAspect = uResolution.x / uResolution.y;
    float videoAspect = uVideoRes.x / uVideoRes.y;
    vec2 scale = frameAspect > videoAspect
      ? vec2(1.0, videoAspect / frameAspect)
      : vec2(frameAspect / videoAspect, 1.0);
    vec2 uv = (vUv - 0.5) * scale + 0.5;
    gl_FragColor = texture2D(uTexture, uv);
  }
`;

export class VideoBackgroundRenderer {
  private renderer: THREE.WebGLRenderer | null = null;
  private readonly scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera | null = null;
  private mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null = null;
  private video: HTMLVideoElement | null = null;
  private blit: HTMLCanvasElement | null = null;
  private blitCtx: CanvasRenderingContext2D | null = null;
  private texture: THREE.CanvasTexture | null = null;
  private duration = 0;
  private width = 0;
  private height = 0;
  private fps = 30;
  private mode: VideoPlaybackMode = 'loop';

  constructor(private readonly canvasEl: HTMLCanvasElement) {}

  get canvas(): HTMLCanvasElement {
    return this.renderer?.domElement ?? this.canvasEl;
  }

  async setSource(
    source: VideoBackgroundSource,
    opts: { width: number; height: number; fps: number },
  ): Promise<void> {
    this.disposeContent();
    const { width, height, fps } = opts;
    this.width = width;
    this.height = height;
    this.fps = fps;
    this.mode = source.mode;

    const url = source.mode === 'loop' ? (source.boomerangUrl ?? source.url) : source.url;

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.addEventListener('loadedmetadata', () => resolve(), { once: true });
      video.addEventListener('error', () => reject(new Error(`Failed to load video: ${url}`)), {
        once: true,
      });
      video.load();
    });
    this.video = video;
    this.duration = video.duration;

    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvasEl,
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
      });
      this.renderer.setPixelRatio(1);
      // DOM <video objectFit:cover> shows raw sRGB pixels — no tone mapping.
      this.renderer.toneMapping = THREE.NoToneMapping;
      this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
    }
    this.renderer.setSize(width, height, false);

    // Blit canvas — the video frame is drawn here (compositor-identical
    // YUV→RGB) and the texture uploads from it. Linear, no mipmaps — the
    // DOM compositor does a plain bilinear scale for objectFit: cover.
    this.blit = document.createElement('canvas');
    this.blit.width = video.videoWidth || 1;
    this.blit.height = video.videoHeight || 1;
    this.blitCtx = this.blit.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.blit);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.texture.colorSpace = THREE.NoColorSpace;

    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: COVER_VERTEX,
        fragmentShader: COVER_FRAGMENT,
        uniforms: {
          uTexture: { value: this.texture },
          uResolution: { value: new THREE.Vector2(width, height) },
          uVideoRes: {
            value: new THREE.Vector2(video.videoWidth || 1, video.videoHeight || 1),
          },
        },
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  /** Composition-time → video-time mapping (see header). */
  targetTime(frame: number): number {
    const t = frame / this.fps;
    const duration = this.duration;
    if (!(duration > 0) || !isFinite(duration)) return 0;
    if (this.mode === 'loop') {
      return t % duration;
    }
    // 'pingpong' — PreviewVideoBackground (:52–57).
    const cycle = Math.floor(t / duration);
    const phase = t - cycle * duration;
    return cycle % 2 === 0 ? phase : Math.max(0, duration - phase);
  }

  /**
   * Seek the video to the exact frame time and wait for the seek (roughclip
   * pattern, 500 ms safety net). Call BEFORE renderFrame in export flows.
   * Waits for the media to become seekable first — setting currentTime on a
   * non-seekable element is a silent no-op (HTMLMediaElement spec), which
   * races progressive MP4 loading.
   */
  async prepareFrame(frame: number): Promise<void> {
    const video = this.video;
    if (!video) return;
    const target = this.targetTime(frame);
    // Same hysteresis as PreviewVideoBackground (:60): within one
    // composition frame of video time, keep the current picture.
    if (Math.abs(video.currentTime - target) <= 1 / this.fps) return;
    video.pause();
    // Wait until the media is actually seekable (moov parsed + buffered).
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

  renderFrame(): void {
    if (!this.renderer || !this.camera || !this.mesh || !this.texture) return;
    if (this.video && this.blitCtx && this.blit) {
      this.blitCtx.drawImage(this.video, 0, 0, this.blit.width, this.blit.height);
      this.texture.needsUpdate = true;
    }
    this.renderer.render(this.scene, this.camera);
  }

  private disposeContent(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }
    this.texture?.dispose();
    this.texture = null;
    this.blit = null;
    this.blitCtx = null;
    if (this.video) {
      this.video.pause();
      this.video.removeAttribute('src');
      this.video.load();
      this.video = null;
    }
  }

  dispose(): void {
    this.disposeContent();
    this.renderer?.dispose();
    this.renderer = null;
  }
}

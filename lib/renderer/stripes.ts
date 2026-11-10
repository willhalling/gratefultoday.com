/**
 * lib/renderer/stripes.ts — the 'stripes' world: procedural crayon stripes
 * on paper (Sobriety Cards). No source texture; one ShaderMaterial plane
 * under an orthographic camera, uniforms advanced per frame from the frame
 * index (`uTime = frame / fps`) — deterministic like the other world scenes.
 *
 * Dispatched by WorldLayerRenderer for WorldArgs `{ kind: 'stripes' }`.
 * Geometry comes from lib/sobriety-card-art.ts (buildStripes) so the WebGL
 * frame lines up with the static SVG / OG renders of the same seed.
 */
import * as THREE from 'three';
import {
  MAX_STRIPES,
  STRIPES_FRAGMENT_SHADER,
  STRIPES_VERTEX_SHADER,
} from '@/lib/renderer/vendor/three/shaders/stripes';

export interface StripeSpec {
  color: [number, number, number];
  x0: number;
  x1: number;
  top: number;
  bottom: number;
  amp: number;
  freq: number;
  phase: number;
  lean: number;
}

/** Session-static stripes setup (pixels at the render resolution). */
export interface StripesSetup {
  width: number;
  height: number;
  seed: number;
  paper: [number, number, number];
  stripes: StripeSpec[];
}

export interface StripesFrameParams {
  frame: number;
  fps: number;
  /** 0 = static frame, 1 = gentle drift + grain boil. */
  motion: number;
  /** Frame the one-off wave ripple starts on; null = no ripple. */
  rippleStartFrame: number | null;
}

export class StripesRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
  private mesh: THREE.Mesh | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private geometry: THREE.PlaneGeometry | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setPixelRatio(1);
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  setStripes(setup: StripesSetup): void {
    this.disposeScene();
    this.renderer.setSize(setup.width, setup.height, false);

    const count = Math.min(MAX_STRIPES, setup.stripes.length);
    const boxes = Array.from({ length: MAX_STRIPES }, () => new THREE.Vector4());
    const wobbles = Array.from({ length: MAX_STRIPES }, () => new THREE.Vector4());
    const colors = Array.from({ length: MAX_STRIPES }, () => new THREE.Vector3(1, 1, 1));
    for (let i = 0; i < count; i++) {
      const stripe = setup.stripes[i];
      boxes[i].set(stripe.x0, stripe.x1, stripe.top, stripe.bottom);
      wobbles[i].set(stripe.amp, stripe.freq, stripe.phase, stripe.lean);
      colors[i].set(...stripe.color);
    }

    this.geometry = new THREE.PlaneGeometry(2, 2);
    this.material = new THREE.ShaderMaterial({
      vertexShader: STRIPES_VERTEX_SHADER,
      fragmentShader: STRIPES_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uMotion: { value: 0 },
        uRipple: { value: -1 },
        uResolution: { value: new THREE.Vector2(setup.width, setup.height) },
        uSeed: { value: (setup.seed % 997) / 997 },
        uCount: { value: count },
        uBox: { value: boxes },
        uWobble: { value: wobbles },
        uColor: { value: colors },
        uPaper: { value: new THREE.Vector3(...setup.paper) },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);
  }

  /** Draw one frame. Pure function of `p` + the stripes setup. */
  renderFrame(p: StripesFrameParams): void {
    if (!this.material) return;
    const u = this.material.uniforms;
    u.uTime.value = p.frame / p.fps;
    u.uMotion.value = p.motion;
    u.uRipple.value =
      p.rippleStartFrame === null || p.frame < p.rippleStartFrame
        ? -1
        : (p.frame - p.rippleStartFrame) / p.fps;
    this.renderer.render(this.scene, this.camera);
  }

  private disposeScene(): void {
    if (this.mesh) this.scene.remove(this.mesh);
    this.material?.dispose();
    this.geometry?.dispose();
    this.mesh = null;
    this.material = null;
    this.geometry = null;
  }

  dispose(): void {
    this.disposeScene();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

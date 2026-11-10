/**
 * SceneRenderer — the per-frame compositor for the custom canvas pipeline.
 * Modeled on roughclip lib/renderer/scene-renderer.ts.
 *
 * Owns three canvases at plan resolution (width × height, e.g. 1080×1920):
 *   world     — the visual world (artwork, background stack, colour grade,
 *               camera rig). Phase 0: a plain Canvas2D fill via the
 *               `drawWorld` option. Phase 1: a WebGL canvas driven by the
 *               three.js world-renderer — the compositor contract (this
 *               class) does not change.
 *   overlay   — Canvas2D: layouts, lyrics, visualizers, fx overlays
 *               (the `drawOverlay` hook point — subclasses or the option
 *               callback draw here).
 *   composite — Canvas2D: world + overlay flattened; this is the canvas the
 *               mediabunny encoder consumes (exposed as `.canvas`).
 *
 * Deterministic per frame: every per-frame value is derived from the frame
 * index (and pre-analysed audio), never wall clock.
 */

import type { WorldLayerRenderer } from './world-renderer';
import type { WorldArgs } from './frame-context';

/** Per-frame slice of ClipAudioAnalysis (see lib/renderer/audio-engine.ts). */
export interface AudioFrame {
  /** 128-bin spectrum for this frame. */
  frequencyData: Float32Array;
  /** Smoothed background wave energy for this frame (0–1). */
  backgroundWaveEnergy: number;
}

export interface SceneRendererOptions {
  width: number;
  height: number;
  /**
   * Phase 1.2: the WebGL world layer. When provided, `renderFrame` drives it
   * with `worldArgs(frameIndex)` (buildWorldArgs output) and flattens its
   * canvas underneath the overlay, replacing the Canvas2D `drawWorld`
   * placeholder. Covers single-image scenes, the depth gallery and video
   * backgrounds.
   */
  world?: WorldLayerRenderer;
  worldArgs?: (frameIndex: number) => WorldArgs;
  /** Draws the world for a frame into the world canvas (already cleared,
   * sized to the plan resolution). Defaults to opaque black. Ignored when
   * `world` is set. */
  drawWorld?: (
    ctx: CanvasRenderingContext2D,
    frameIndex: number,
    audioFrame: AudioFrame | null,
  ) => void;
  /** Draws the Canvas2D overlay for a frame into the overlay canvas
   * (already cleared, sized to the plan resolution). */
  drawOverlay?: (
    ctx: CanvasRenderingContext2D,
    frameIndex: number,
    audioFrame: AudioFrame | null,
  ) => void;
}

export class SceneRenderer {
  /** The composite canvas — hand to the encoder. */
  readonly canvas: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;

  protected readonly worldCanvas: HTMLCanvasElement;
  protected readonly overlayCanvas: HTMLCanvasElement;
  protected readonly worldCtx: CanvasRenderingContext2D;
  protected readonly overlayCtx: CanvasRenderingContext2D;
  private readonly compositeCtx: CanvasRenderingContext2D;
  private readonly opts: SceneRendererOptions;

  constructor(opts: SceneRendererOptions) {
    this.opts = opts;
    this.width = opts.width;
    this.height = opts.height;

    this.worldCanvas = document.createElement('canvas');
    this.worldCanvas.width = opts.width;
    this.worldCanvas.height = opts.height;
    const worldCtx = this.worldCanvas.getContext('2d');
    if (!worldCtx) throw new Error('SceneRenderer: no 2d context (world)');
    this.worldCtx = worldCtx;

    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.width = opts.width;
    this.overlayCanvas.height = opts.height;
    const overlayCtx = this.overlayCanvas.getContext('2d');
    if (!overlayCtx) throw new Error('SceneRenderer: no 2d context (overlay)');
    this.overlayCtx = overlayCtx;

    this.canvas = document.createElement('canvas');
    this.canvas.width = opts.width;
    this.canvas.height = opts.height;
    const compositeCtx = this.canvas.getContext('2d');
    if (!compositeCtx) throw new Error('SceneRenderer: no 2d context (composite)');
    this.compositeCtx = compositeCtx;
  }

  /** Export-only hook: park async resources (video textures) on the exact
   * composition time for this frame before renderFrame runs. */
  async prepareFrame(frameIndex: number): Promise<void> {
    if (this.opts.world && this.opts.worldArgs) {
      await this.opts.world.prepareFrame(this.opts.worldArgs(frameIndex));
    }
  }

  /** Draw one frame into the composite canvas. */
  renderFrame(frameIndex: number, audioFrame: AudioFrame | null = null): void {
    let worldSource: HTMLCanvasElement;
    if (this.opts.world && this.opts.worldArgs) {
      // WebGL world (Phase 1.2): the world layer draws into its own canvas;
      // flatten it underneath the overlay.
      this.opts.world.renderFrame(this.opts.worldArgs(frameIndex));
      worldSource = this.opts.world.canvas;
    } else {
      this.worldCtx.clearRect(0, 0, this.width, this.height);
      if (this.opts.drawWorld) {
        this.opts.drawWorld(this.worldCtx, frameIndex, audioFrame);
      } else {
        this.worldCtx.fillStyle = '#000';
        this.worldCtx.fillRect(0, 0, this.width, this.height);
      }
      worldSource = this.worldCanvas;
    }

    this.overlayCtx.clearRect(0, 0, this.width, this.height);
    this.opts.drawOverlay?.(this.overlayCtx, frameIndex, audioFrame);

    this.compositeCtx.clearRect(0, 0, this.width, this.height);
    this.compositeCtx.drawImage(worldSource, 0, 0);
    this.compositeCtx.drawImage(this.overlayCanvas, 0, 0);
  }

  dispose(): void {
    // Phase 1: release WebGL contexts / textures here.
  }
}

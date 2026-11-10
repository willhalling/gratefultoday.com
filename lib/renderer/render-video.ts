/**
 * lib/renderer/render-video.ts — shared full-composition assembly for the
 * custom canvas pipeline. Mirrors the working assembly in
 * scripts/parity/engine-probe.entry.ts (renderFixture), lifted into a
 * reusable module so the editor preview (CanvasVideoPreview, Phase 1.9) and
 * the later export path (Phase 1.10+) build frames IDENTICALLY:
 *
 *   props → resolveCompositionConfig → getPreparedSession (decode + FFT,
 *   WeakMap-cached) → createFrameContext → fonts → imprints → lyric band →
 *   visualizer → cover image → WorldLayerRenderer → SceneRenderer
 *
 * Per-frame work after creation is fully synchronous: renderer.renderFrame(f).
 *
 * Descoped backgrounds (Phase 1.2b: depth gallery scene-packs, scene/
 * background video — buildWorldArgs throws for those branches) degrade
 * gracefully here: the throw is logged once and the world falls back to a
 * flat cover-fit draw of the composition's resolved background image
 * (shaderBgUrl), so the preview still shows artwork/lyrics/visualizer over
 * the right backdrop instead of dying. The scene-images branch renders for
 * real (the cut world, cut-world.ts).
 */
import { WorldLayerRenderer } from './world-renderer';
import { SceneRenderer } from './scene-renderer';
import {
  buildWorldArgs,
  createFrameContext,
  resolveCompositionConfig,
  type AudioPlacement,
  type FrameContext,
} from './frame-context';
import { prepareImprints } from './imprints';
import { drawOverlayLayer } from './overlays';
import { createLyricBandRenderer } from './lyrics';
import { createVisualizerRenderer } from './visualizers';
import { getPreparedSession, loadImageElement, type PreparedSession } from './session';
import { loadThemeFont, loadTikTokSans } from './fonts';
import { synthFontKeys } from './lyrics/synth';
import type { LoadedImage } from './overlays/layouts/types';
import type { VisualizerCompositionProps } from '@/lib/renderer/props';

/**
 * Value-keyed session cache on top of session.ts's identity-keyed WeakMap:
 * the preview rebuilds its props object on every editor edit, but the AUDIO
 * inputs rarely change — keyed by value, visual-only edits hit the cache and
 * skip the re-decode + FFT. Bounded (last 4); a rejected prepare is evicted
 * so the next call retries.
 */
const sessionByKey = new Map<string, Promise<PreparedSession>>();
const SESSION_CACHE_MAX = 4;

function getCachedSession(input: Parameters<typeof getPreparedSession>[0]): Promise<PreparedSession> {
  const key = JSON.stringify(input);
  const cached = sessionByKey.get(key);
  if (cached) return cached;
  const promise = getPreparedSession(input);
  sessionByKey.delete(key);
  sessionByKey.set(key, promise);
  while (sessionByKey.size > SESSION_CACHE_MAX) {
    const oldest = sessionByKey.keys().next().value;
    if (oldest === undefined) break;
    sessionByKey.delete(oldest);
  }
  promise.catch(() => {
    if (sessionByKey.get(key) === promise) sessionByKey.delete(key);
  });
  return promise;
}

export interface CreateVideoRendererOptions {
  props: VisualizerCompositionProps;
  /**
   * Render resolution override. Defaults to the composition config
   * (1080×1920 / 1920×1080). The frame context is built with these
   * dimensions, so every layout derives its geometry at this size — the
   * same way the Remotion <Player> renders the composition at reduced
   * compositionWidth/Height for previews. Must keep the orientation aspect.
   */
  width?: number;
  height?: number;
  /** Preview/thumbnail paths don't need the mux buffer and can skip it. */
  preview?: boolean;
  /** Optional pre-fetched audio bytes shared with the playback element. */
  audioBuffer?: ArrayBuffer;
  frameDataOverride?: import('./audio-engine').ClipAudioFrameData;
  customOverlay?: (ctx: CanvasRenderingContext2D, frame: number) => void;
}

export interface VideoRenderer {
  renderer: SceneRenderer;
  frameContext: FrameContext;
  session: PreparedSession;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  /**
   * True when the background branch resolved to a descoped kind (depth
   * gallery / video) and the world fell back to a flat image draw. The
   * original buildWorldArgs error is in `worldError`.
   */
  worldFallback: boolean;
  worldError: Error | null;
  /** Composition-timeline → source-audio mapping for the playback clock. */
  audioPlacement: AudioPlacement;
  /** effectiveVolume (fade-out × hook duck) at a frame — mirror onto
   *  HTMLAudioElement.volume during preview playback. */
  volumeAt(frame: number): number;
  dispose(): void;
}

/** Cover-fit draw of an image into a 2d context (fallback world). */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
): void {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    return;
  }
  const scale = Math.max(width / iw, height / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
}

export async function createVideoRenderer(
  options: CreateVideoRendererOptions,
): Promise<VideoRenderer> {
  const { props, preview, audioBuffer } = options;
  const resolved = resolveCompositionConfig(props);
  const config = {
    ...resolved,
    width: options.width ?? resolved.width,
    height: options.height ?? resolved.height,
  };
  const { fps, width, height, durationInFrames } = config;
  const durationSec = durationInFrames / fps;

  // Decode + FFT. Value-keyed cache (above): visual-only edits rebuild the
  // props object but reuse the prepared audio session.
  const preparedSession = await getCachedSession({
    fps,
    durationSec,
    audioUrl: props.audioUrl,
    previewAudioUrl: preview ? (props.previewAudioUrl ?? undefined) : undefined,
    audioTrim: props.audioTrim ?? null,
    fadeAudio: props.fadeAudio,
    fadeOutSec: props.fadeOutSec,
    waveEnergyMultiplier: props.waveEnergyMultiplier,
    audioBuffer,
    preview,
  });
  const session = options.frameDataOverride
    ? { ...preparedSession, analysis: { ...preparedSession.analysis, ...options.frameDataOverride } }
    : preparedSession;

  const frameContext = createFrameContext({ props, config, analysis: session.analysis });

  // The cover image doesn't depend on fonts or imprints — start loading it
  // now so it overlaps the font / imprint work below.
  const coverImagePromise: Promise<LoadedImage | null> = frameContext.proxiedCoverImageUrl
    ? loadImageElement(frameContext.proxiedCoverImageUrl)
        .then((img) => ({
          img,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
        }))
        .catch(() => null)
    : Promise.resolve(null);

  // Fonts must be in the document before imprints/lyrics measure text.
  // The TikTok layout adds TikTok Sans (its hook/lyrics/credit typeface).
  await Promise.all([
    ...[
      frameContext.theme.font,
      ...(frameContext.hasLyrics ? synthFontKeys(frameContext.effectiveSubtitle.mode) : []),
    ].map((key) => loadThemeFont(key)),
    ...(frameContext.isTikTokLayout ? [loadTikTokSans()] : []),
  ]).catch(() => {
    /* font failure degrades to fallback family — never block the render */
  });

  const imprints = await prepareImprints(frameContext);
  const lyricBand = createLyricBandRenderer(frameContext);
  const channel = session.analysis.audioBuffer?.getChannelData(0) ?? null;
  const visualizer = createVisualizerRenderer(frameContext, channel);

  // World layer — buildWorldArgs throws for the descoped 1.2b branches
  // (scene-pack depth gallery, scene/background video). Fall back to a flat
  // cover-fit draw of the resolved background image so the preview keeps
  // working. (The scene-images branch is real now — the cut world.)
  let world: WorldLayerRenderer | undefined;
  let worldFallback = false;
  let worldError: Error | null = null;
  let fallbackImage: HTMLImageElement | null = null;
  try {
    const firstArgs = buildWorldArgs(frameContext, 0);
    world = new WorldLayerRenderer(document.createElement('canvas'));
    await world.setup(firstArgs, imprints);
    // Preview free-runs cut-world video pool items; export parks them per
    // frame via prepareFrame (deterministic seeking).
    if (preview) world.setVideoPlayback('play');
  } catch (err) {
    worldFallback = true;
    worldError = err instanceof Error ? err : new Error(String(err));
    // eslint-disable-next-line no-console
    console.error(
      '[render-video] world background descoped — falling back to a flat image background:',
      worldError.message,
    );
    if (frameContext.shaderBgUrl) {
      fallbackImage = await loadImageElement(frameContext.shaderBgUrl).catch(() => null);
    }
  }

  // Loaded in parallel since just after the frame context was built.
  const coverImage = await coverImagePromise;

  const renderer = new SceneRenderer({
    width,
    height,
    world,
    worldArgs: world ? (f) => buildWorldArgs(frameContext, f) : undefined,
    drawWorld: world
      ? undefined
      : (ctx2d) => {
          if (fallbackImage) {
            drawCover(ctx2d, fallbackImage, width, height);
          } else {
            ctx2d.fillStyle = '#000';
            ctx2d.fillRect(0, 0, width, height);
          }
        },
    drawOverlay: (ctx2d, f) =>
      drawOverlayLayer(ctx2d, frameContext, f, {
        coverImage,
        imprints,
        lyricBand,
        visualizer,
        customLayer: options.customOverlay,
      }),
  });

  return {
    renderer,
    frameContext,
    session,
    durationInFrames,
    fps,
    width,
    height,
    worldFallback,
    worldError,
    audioPlacement: frameContext.audioPlacement,
    volumeAt: (frame) => frameContext.frameArgs(frame).effectiveVolume,
    dispose: () => {
      world?.dispose();
      visualizer.dispose?.();
      renderer.dispose();
    },
  };
}

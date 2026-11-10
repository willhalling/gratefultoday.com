/**
 * lib/renderer/render-clip.ts — client-side MP4 export for editor renders
 * (Phase 1.10). Drives the shared createVideoRenderer assembly frame by
 * frame through the WebCodecs/mediabunny encoder (mp4-export.ts) and returns
 * the finished MP4 Blob; the caller (RenderJobContext) uploads + finalizes
 * exactly like the existing client render path.
 *
 * Audio mux: the composition's <Audio> placement math lives in
 * frame-context's audioPlacement — source time at composition frame f is
 * f/fps + audioSourceOffsetSec (= trimStart − desiredLeadInSec). The mux
 * buffer is rebuilt from the session's decoded AudioBuffer at that offset
 * (leading silence when the hook lead-in is missing, zeros past EOF), with
 * the composition's linear fade-out baked in (frame-context frameArgs
 * audioVolume: interpolate [totalSec−fadeSec, totalSec] → [1, 0]). The
 * session's pre-baked trimmedBuffer is NOT used: it fades at the trim-window
 * tail, which diverges from the composition tail when the render is
 * sample-capped (renderSample) or hook-extended.
 *
 * Descoped backgrounds (depth gallery / video — createVideoRenderer's
 * worldFallback) render with the engine's flat-image fallback backdrop and a
 * console warning. (Pre-removal this threw so the caller could fall back to
 * Lambda; with Lambda gone the flat fallback is the documented behavior for
 * the descoped branches.)
 *
 * clipHook voiceover audio is not muxed (descoped; the hook card visuals
 * render). Editor renders never carry a voiceover today.
 *
 * NOTE for scripts/parity (e2e-MP4 open issue): this module is the head
 * start for the end-to-end MP4 check — a browser harness can drive
 * renderClipToMp4(props) → Blob with the same fixtures and hash/diff
 * against Lambda output. Harness intentionally not built here.
 */
import { createVideoRenderer, type VideoRenderer } from './render-video';
import { exportClipMp4 } from './mp4-export';
import type { VisualizerCompositionProps } from '@/lib/renderer/props';

export interface RenderClipToMp4Options {
  props: VisualizerCompositionProps;
  /** 0–100, same shape RenderJobContext reports for Lambda renders. */
  onProgress?: (pct: number) => void;
}

/**
 * Composition-length mux buffer sampled from the decoded source at
 * audioPlacement.audioSourceOffsetSec, fade-out baked per the frame-context
 * envelope. Null when the session is silent (no audioUrl).
 */
function buildMuxBuffer(vr: VideoRenderer): AudioBuffer | null {
  const src = vr.session.analysis.audioBuffer;
  if (!src) return null;

  const { fps, durationInFrames, audioPlacement, props } = vr.frameContext;
  const totalSec = durationInFrames / fps;
  const sampleRate = src.sampleRate;
  const length = Math.max(1, Math.round(totalSec * sampleRate));

  // Fade envelope — frame-context frameArgs audioVolume
  // (useVisualizerSetup.ts:146–162): linear 1→0 over the last
  // min(fadeOutSec||1, totalSec) seconds, only when fadeAudio is set.
  const fadeAudio = props.fadeAudio ?? false;
  const requestedFadeSec = props.fadeOutSec && props.fadeOutSec > 0 ? props.fadeOutSec : 1;
  const fadeSec = Math.min(requestedFadeSec, totalSec);
  const fadeStartSec = Math.max(0, totalSec - fadeSec);

  const startSample = Math.floor(audioPlacement.audioSourceOffsetSec * sampleRate);

  // OfflineAudioContext just for createBuffer — no autoplay-policy baggage.
  const bufferCtx = new OfflineAudioContext(src.numberOfChannels, 1, sampleRate);
  const out = bufferCtx.createBuffer(src.numberOfChannels, length, sampleRate);
  for (let c = 0; c < src.numberOfChannels; c++) {
    const srcData = src.getChannelData(c);
    const dst = out.getChannelData(c);
    for (let i = 0; i < length; i++) {
      const srcIndex = startSample + i;
      let sample = srcIndex >= 0 && srcIndex < srcData.length ? srcData[srcIndex] : 0;
      if (fadeAudio) {
        const t = i / sampleRate;
        if (t >= fadeStartSec && fadeSec > 0) {
          sample *= Math.max(0, Math.min(1, (totalSec - t) / fadeSec));
        }
      }
      dst[i] = sample;
    }
  }
  return out;
}

export async function renderClipToMp4({
  props,
  onProgress,
}: RenderClipToMp4Options): Promise<Blob> {
  const vr = await createVideoRenderer({ props });
  try {
    if (vr.worldFallback) {
      console.warn(
        `[render-clip] background branch is descoped — exporting with the flat-image fallback (${vr.worldError?.message ?? 'unknown'})`,
      );
    }
    const audioBuffer = buildMuxBuffer(vr);
    return await exportClipMp4({
      frames: vr.durationInFrames,
      fps: vr.fps,
      width: vr.width,
      height: vr.height,
      canvas: vr.renderer.canvas,
      renderFrame: (f) => vr.renderer.renderFrame(f),
      prepareFrame: (f) => vr.renderer.prepareFrame(f),
      audioBuffer,
      onProgress,
    });
  } finally {
    vr.dispose();
  }
}

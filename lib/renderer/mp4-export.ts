/**
 * mp4-export — WebCodecs + mediabunny MP4 encoder for the canvas pipeline.
 *
 * Ported from roughclip lib/renderer/mp4-export.ts (itself from the slowedgen
 * Phase-B exporter), adapted to mediabunny 1.35.1 (`bitrate: QUALITY_HIGH`)
 * and simplified to a single-clip signature — roughclip's multi-segment
 * A-or-B concept doesn't exist in wavecanvas. The structure stays close to
 * the original so later phases can re-consult it.
 *
 * The encoder consumes a single fixed canvas (`CanvasSource`); the caller's
 * renderFrame draws each frame into `.canvas` and the loop blits it onto the
 * encoder canvas. Audio is one pre-trimmed, fade-baked AudioBuffer from
 * analyzeClipAudio (omitted entirely for silent clips).
 *
 * Deterministic: frame timestamps are f/fps. No wall clock anywhere.
 */

const MAX_DURATION_SEC = 600;
const VIDEO_BITRATE = 10_000_000;
/** avc1.640028 = h264 High profile, level 4.0 (covers 1080×1920 @30). */
const H264_CODEC_STRING = 'avc1.640028';
/** Level 4.2 covers 1080×1920 @60 (level 4.0 caps at 30fps for this size). */
const H264_CODEC_STRING_60FPS = 'avc1.64002A';

export class Mp4ExportError extends Error {
  constructor(
    message: string,
    readonly code: 'unsupported' | 'too-long' | 'failed',
  ) {
    super(message);
    this.name = 'Mp4ExportError';
  }
}

export class Mp4UnsupportedError extends Mp4ExportError {
  constructor(
    message = "Grateful Today renders the video directly on your device, and this browser can't encode MP4. Please try a modern smartphone or desktop Chrome/Edge.",
  ) {
    super(message, 'unsupported');
    this.name = 'Mp4UnsupportedError';
  }
}

export function isMp4ExportSupported(): boolean {
  return (
    typeof VideoEncoder !== 'undefined' &&
    typeof VideoFrame !== 'undefined' &&
    typeof AudioEncoder !== 'undefined'
  );
}

export interface Mp4ExportSupportDetails {
  supported: boolean;
  videoSupported: boolean;
  audioSupported: boolean;
  /** Human-readable reason when supported is false. */
  reason: string;
}

let configSupportPromises:
  | { key: string; promise: Promise<Mp4ExportSupportDetails> }
  | null = null;

/** Cheap cached check that h264 1080×1920@fps (+ AAC when audio is present)
 * is actually encodable. Silent clips only need the video config. */
async function checkEncoderSupportDetails(
  fps: number,
  needsAudio: boolean,
): Promise<Mp4ExportSupportDetails> {
  const key = `${fps}:${needsAudio ? 1 : 0}`;
  if (!isMp4ExportSupported()) {
    return {
      supported: false,
      videoSupported: false,
      audioSupported: false,
      reason:
        'Your browser does not support WebCodecs, which is required to export video. Please use the latest Chrome, Edge, or Safari.',
    };
  }
  if (!configSupportPromises || configSupportPromises.key !== key) {
    configSupportPromises = {
      key,
      promise: (async () => {
        const videoConfig = await VideoEncoder.isConfigSupported({
          codec: fps > 30 ? H264_CODEC_STRING_60FPS : H264_CODEC_STRING,
          width: 1080,
          height: 1920,
          bitrate: VIDEO_BITRATE,
          framerate: fps,
        });
        const videoSupported = !!videoConfig.supported;
        const audioSupported = needsAudio
          ? !!(await AudioEncoder.isConfigSupported({
              codec: 'mp4a.40.2',
              sampleRate: 48000,
              numberOfChannels: 2,
            })).supported
          : true;
        const supported = videoSupported && audioSupported;
        let reason = '';
        if (!supported) {
          if (!videoSupported && !audioSupported) {
            reason = 'Your browser cannot encode H.264 video or AAC audio, so video export is unavailable. Please use the latest Chrome, Edge, or Safari.';
          } else if (!videoSupported) {
            reason = 'Your browser cannot encode H.264 video, so video export is unavailable. Please use the latest Chrome, Edge, or Safari.';
          } else {
            reason = 'Your browser cannot encode AAC audio, so video export is unavailable. Please use the latest Chrome, Edge, or Safari.';
          }
        }
        return { supported, videoSupported, audioSupported, reason };
      })().catch(() => ({
        supported: false,
        videoSupported: false,
        audioSupported: false,
        reason: 'Export capability check failed. Please use the latest Chrome, Edge, or Safari.',
      })),
    };
  }
  return configSupportPromises.promise;
}

async function checkEncoderSupport(fps: number, needsAudio: boolean): Promise<boolean> {
  const details = await checkEncoderSupportDetails(fps, needsAudio);
  return details.supported;
}

/** Returns granular support details for the codecs we actually use. */
export async function getMp4ExportSupportDetails(
  fps = 30,
  needsAudio = true,
): Promise<Mp4ExportSupportDetails> {
  return checkEncoderSupportDetails(fps, needsAudio);
}

const fourKSupport = new Map<number, Promise<boolean>>();

/** Whether this device can encode 4K H.264 (3840×2160, level 5.1 / 5.2 at
 *  60 fps). Many integrated GPUs top out at 1080p, so 4K is offered only
 *  where this passes. Cached per fps. */
export function isMp4Export4kSupported(fps = 30): Promise<boolean> {
  const hit = fourKSupport.get(fps);
  if (hit) return hit;
  const promise = (async () => {
    if (!isMp4ExportSupported()) return false;
    const config = await VideoEncoder.isConfigSupported({
      codec: fps > 30 ? 'avc1.640034' : 'avc1.640033',
      width: 3840,
      height: 2160,
      bitrate: VIDEO_BITRATE * 4,
      framerate: fps,
    });
    return !!config.supported;
  })().catch(() => false);
  fourKSupport.set(fps, promise);
  return promise;
}

/** Throws Mp4UnsupportedError when this browser cannot encode the MP4. */
export async function assertMp4ExportSupported(fps = 30, needsAudio = true): Promise<void> {
  const details = await getMp4ExportSupportDetails(fps, needsAudio);
  if (!details.supported) {
    throw new Mp4UnsupportedError(details.reason);
  }
}

export interface ExportClip {
  /** Clip length in frames. */
  frames: number;
  fps: number;
  width: number;
  height: number;
  /** Renders frame f (0-based) into `.canvas`. */
  renderFrame: (frame: number) => void;
  /** Export-only hook: seek video textures etc. to the exact frame time
   * before renderFrame runs. */
  prepareFrame?: (frame: number) => Promise<void>;
  /** The composite canvas to blit onto the encoder canvas. */
  canvas: HTMLCanvasElement;
  /** Trimmed, fade-baked audio (added after the frames). Null/undefined for
   * silent clips — no audio track is emitted then. */
  audioBuffer?: AudioBuffer | null;
  /** Called when the export finishes (renderer resources released). */
  dispose?: () => void;
  onProgress?: (pct: number) => void;
}

/**
 * Encode the clip into one MP4 Blob. Progress: frames map to 0–90, audio to
 * 95, done to 100.
 */
export async function exportClipMp4(clip: ExportClip): Promise<Blob> {
  const { frames, fps, width, height, renderFrame, prepareFrame, canvas, audioBuffer, onProgress } =
    clip;

  const hasAudio = audioBuffer != null;
  await assertMp4ExportSupported(fps, hasAudio);

  if (frames / fps > MAX_DURATION_SEC) {
    throw new Mp4ExportError(
      'Video export is limited to 10 minutes — pick a shorter clip and try again.',
      'too-long',
    );
  }

  // mediabunny is client-only — load it lazily inside the export call.
  const { Output, Mp4OutputFormat, BufferTarget, CanvasSource, AudioBufferSource, QUALITY_HIGH } =
    await import('mediabunny');

  const composite = document.createElement('canvas');
  composite.width = width;
  composite.height = height;
  const compositeCtx = composite.getContext('2d');
  if (!compositeCtx) {
    throw new Mp4ExportError('Could not create a 2D canvas for video encoding.', 'failed');
  }

  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });
  const videoSource = new CanvasSource(composite, {
    codec: 'avc',
    bitrate: QUALITY_HIGH,
    keyFrameInterval: 2,
  });
  output.addVideoTrack(videoSource, { frameRate: fps });
  const audioSource = hasAudio
    ? new AudioBufferSource({ codec: 'aac', bitrate: QUALITY_HIGH })
    : null;
  if (audioSource) output.addAudioTrack(audioSource);

  try {
    await output.start();

    for (let f = 0; f < frames; f++) {
      if (prepareFrame) {
        await prepareFrame(f);
      }
      renderFrame(f);
      compositeCtx.clearRect(0, 0, width, height);
      compositeCtx.drawImage(canvas, 0, 0);
      await videoSource.add(f / fps, 1 / fps);

      onProgress?.(Math.round(((f + 1) / frames) * 90));
      if (f % 30 === 29) {
        // Keep the tab responsive on long exports.
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    if (audioSource && audioBuffer) {
      await audioSource.add(audioBuffer);
    }
    onProgress?.(95);
    await output.finalize();
  } catch (error) {
    await output.cancel().catch(() => undefined);
    if (error instanceof Mp4ExportError) throw error;
    throw new Mp4ExportError(
      error instanceof Error ? error.message : 'Video export failed.',
      'failed',
    );
  } finally {
    clip.dispose?.();
  }

  if (!target.buffer) {
    throw new Mp4ExportError('Video export produced no output.', 'failed');
  }
  onProgress?.(100);
  return new Blob([target.buffer], { type: 'video/mp4' });
}

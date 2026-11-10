'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import type { TikTokRenderer, TikTokSpec } from '@/lib/tiktok-maker/tiktok-video';

const PREVIEW_WIDTH = 540;
const PREVIEW_HEIGHT = 960;

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface TikTokPreviewProps {
  spec: TikTokSpec;
  /** Called with each ready renderer so the export can reuse its mixed audio. */
  onReady?: (handle: TikTokRenderer | null) => void;
  /** Tailwind max-width for the frame and controls. */
  widthClass?: string;
}

/** Live canvas preview — the same renderer as the export, at half size. Mirrors ChipVideoCanvasPreview. */
export default function TikTokPreview({ spec, onReady, widthClass = 'max-w-[360px]' }: TikTokPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<TikTokRenderer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const frameRef = useRef(0);
  const lastDrawnFrameRef = useRef(-1);
  const clockFrameRef = useRef(0);
  const clockStartedAtRef = useRef(0);
  const playingRef = useRef(false);
  const fillRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  const drawFrame = useCallback((frame: number) => {
    const handle = handleRef.current;
    const canvas = canvasRef.current;
    if (!handle || !canvas || frame === lastDrawnFrameRef.current) return;
    lastDrawnFrameRef.current = frame;
    handle.engine.renderer.renderFrame(frame);
    const context = canvas.getContext('2d');
    context?.clearRect(0, 0, canvas.width, canvas.height);
    context?.drawImage(handle.engine.renderer.canvas, 0, 0);
    const seconds = frame / handle.engine.fps;
    if (fillRef.current) fillRef.current.style.width = `${(seconds / handle.totalSec) * 100}%`;
    if (timeRef.current) {
      timeRef.current.textContent = `${formatTime(seconds)} / ${formatTime(handle.totalSec)}`;
    }
  }, []);

  const stopSource = useCallback(() => {
    if (!sourceRef.current) return;
    sourceRef.current.onended = null;
    try {
      sourceRef.current.stop();
    } catch {
      // The source may already have ended.
    }
    sourceRef.current.disconnect();
    sourceRef.current = null;
  }, []);

  const startPlayback = useCallback(async () => {
    const handle = handleRef.current;
    if (!handle) return;
    const context = audioContextRef.current ?? new AudioContext({ sampleRate: 48000 });
    audioContextRef.current = context;
    await context.resume();
    stopSource();
    const source = context.createBufferSource();
    source.buffer = handle.audioBuffer;
    source.loop = true;
    source.loopEnd = handle.totalSec;
    source.connect(context.destination);
    source.start(0, frameRef.current / handle.engine.fps);
    sourceRef.current = source;
    clockFrameRef.current = frameRef.current;
    clockStartedAtRef.current = context.currentTime;
    playingRef.current = true;
    setIsPlaying(true);
  }, [stopSource]);

  const pausePlayback = useCallback(() => {
    if (!playingRef.current) return;
    playingRef.current = false;
    stopSource();
    setIsPlaying(false);
  }, [stopSource]);

  const togglePlayback = useCallback(() => {
    if (!handleRef.current || status !== 'ready') return;
    if (playingRef.current) pausePlayback();
    else void startPlayback().catch((err) => console.error('[tiktok-maker] playback failed:', err));
  }, [pausePlayback, startPlayback, status]);

  useEffect(() => {
    let animationFrame = 0;
    const tick = () => {
      const handle = handleRef.current;
      const audioContext = audioContextRef.current;
      if (handle && playingRef.current && audioContext) {
        const elapsed = audioContext.currentTime - clockStartedAtRef.current;
        const next = Math.floor(clockFrameRef.current + elapsed * handle.engine.fps);
        frameRef.current = next % handle.engine.durationInFrames;
      }
      if (handle) drawFrame(frameRef.current);
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [drawFrame]);

  // Rebuild the renderer (debounced) whenever the spec changes; keep the playhead.
  useEffect(() => {
    let cancelled = false;
    const wasPlaying = playingRef.current;
    setStatus('loading');
    const timer = setTimeout(() => {
      import('@/lib/tiktok-maker/tiktok-video')
        .then(({ createTikTokRenderer }) =>
          createTikTokRenderer({ spec, width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, preview: true }),
        )
        .then((handle) => {
          if (cancelled) {
            handle.dispose();
            return;
          }
          pausePlayback();
          const previous = handleRef.current;
          handleRef.current = handle;
          previous?.dispose();
          frameRef.current = Math.min(frameRef.current, handle.engine.durationInFrames - 1);
          clockFrameRef.current = frameRef.current;
          lastDrawnFrameRef.current = -1;
          setStatus('ready');
          setError('');
          onReadyRef.current?.(handle);
          if (wasPlaying) void startPlayback();
        })
        .catch((err) => {
          if (cancelled) return;
          console.error('[tiktok-maker] preview failed:', err);
          setError(err instanceof Error ? err.message : String(err));
          setStatus('error');
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [spec, pausePlayback, startPlayback]);

  useEffect(() => {
    return () => {
      stopSource();
      handleRef.current?.dispose();
      handleRef.current = null;
      onReadyRef.current?.(null);
      void audioContextRef.current?.close();
      audioContextRef.current = null;
    };
  }, [stopSource]);

  const seek = (event: React.PointerEvent<HTMLDivElement>) => {
    const handle = handleRef.current;
    if (!handle || status !== 'ready') return;
    const wasPlaying = playingRef.current;
    pausePlayback();
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const frame = Math.min(handle.engine.durationInFrames - 1, Math.floor(ratio * handle.engine.durationInFrames));
    frameRef.current = frame;
    clockFrameRef.current = frame;
    lastDrawnFrameRef.current = -1;
    drawFrame(frame);
    if (wasPlaying) void startPlayback();
  };

  return (
    <div>
      <div
        className={`relative mx-auto aspect-[9/16] w-full ${widthClass} cursor-pointer overflow-hidden rounded-xl bg-neutral-950 shadow-lg`}
        onClick={togglePlayback}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') togglePlayback();
        }}
        role="button"
        tabIndex={0}
        aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
      >
        <canvas ref={canvasRef} width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT} className="block h-full w-full" />
        {status === 'loading' && (
          <div className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            Updating…
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-950/90 px-8 text-center text-sm text-neutral-300">
            Preview failed: {error}
          </div>
        )}
      </div>
      <div className={`mx-auto mt-3 flex w-full ${widthClass} items-center gap-2`}>
        <button
          type="button"
          onClick={togglePlayback}
          disabled={status === 'error' || !handleRef.current}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white disabled:opacity-40"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
        </button>
        <span ref={timeRef} className="w-24 shrink-0 text-xs tabular-nums text-neutral-600">
          0:00 / 0:00
        </span>
        <div
          className="relative h-8 flex-1 cursor-pointer touch-none"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            seek(event);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) seek(event);
          }}
          onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
          role="slider"
          aria-label="Seek preview"
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={0}
        >
          <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-neutral-200">
            <div ref={fillRef} className="h-full rounded-full bg-neutral-900" style={{ width: 0 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

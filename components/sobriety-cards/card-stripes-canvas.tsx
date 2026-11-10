'use client';

import { useEffect, useRef, useState } from 'react';
import type { SobrietyCardRenderer } from '@/lib/sobriety-card-renderer';

const MAX_RENDER_WIDTH = 900;

interface CardStripesCanvasProps {
  palette: string[];
  seed: number;
  /** Run the gentle motion loop (ignored under prefers-reduced-motion). */
  animate?: boolean;
  /** One soft wave ripple through the stripes when it first appears. */
  ripple?: boolean;
}

export function usePrefersReducedMotion(): boolean {
  // Client-only component (dynamic, ssr: false), so window is available.
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/**
 * Live WaveCanvas 'stripes' world for a card front. Lazy-loads the renderer,
 * draws over the static SVG once its first frame is ready, and leaves the
 * SVG showing when WebGL is unavailable. Pauses while offscreen.
 */
export default function CardStripesCanvas({
  palette,
  seed,
  animate = true,
  ripple = false,
}: CardStripesCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const paletteKey = palette.join(',');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let handle: SobrietyCardRenderer | null = null;
    let raf = 0;
    let visible = true;
    const moving = animate && !reducedMotion;

    const bounds = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(200, Math.min(MAX_RENDER_WIDTH, Math.round(bounds.width * dpr)));
    const height = Math.round((width * 7) / 5);
    canvas.width = width;
    canvas.height = height;

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(canvas);

    setReady(false);
    import('@/lib/sobriety-card-renderer')
      .then(async ({ createSobrietyCardRenderer, isWebGLAvailable }) => {
        // No WebGL: the static SVG underneath is the fallback.
        if (!isWebGLAvailable()) return null;
        return createSobrietyCardRenderer({
          palette: paletteKey.split(','),
          seed,
          width,
          height,
          motion: moving,
          ripple: ripple && !reducedMotion,
        });
      })
      .then((created) => {
        if (!created) return;
        if (cancelled || !created.usesWebGL) {
          created.dispose();
          return;
        }
        handle = created;
        const context = canvas.getContext('2d');
        const draw = (frame: number) => {
          created.renderFrame(frame);
          context?.drawImage(created.canvas, 0, 0, width, height);
        };
        draw(0);
        setReady(true);
        if (!moving && !(ripple && !reducedMotion)) return;
        const startedAt = performance.now();
        // Ripple-only (static) cards stop once the ripple has passed.
        const stopAfter = moving ? Infinity : 3.2 * created.fps;
        const tick = () => {
          if (cancelled) return;
          const frame = Math.floor(((performance.now() - startedAt) / 1000) * created.fps);
          if (visible) draw(frame);
          if (frame < stopAfter) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      })
      .catch((error) => console.warn('[sobriety-card] live render failed:', error));

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      handle?.dispose();
    };
  }, [paletteKey, seed, animate, ripple, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`absolute inset-0 h-full w-full transition-opacity duration-500 motion-reduce:transition-none ${
        ready ? 'opacity-100' : 'opacity-0'
      }`}
    />
  );
}

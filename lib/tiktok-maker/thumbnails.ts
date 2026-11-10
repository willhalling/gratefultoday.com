/**
 * lib/tiktok-maker/thumbnails.ts — still thumbnails for the bulk grid.
 *
 * Browsers cap live WebGL contexts (~16), so the grid never runs one per
 * tile. Instead one renderer at a time draws the finished frame (text fully
 * typed) at a small size, the PNG is cached by everything that affects it,
 * and the renderer is disposed before the next one. Tiles ask only while
 * they're mounted (the grid is virtualized), and drop their request when they
 * scroll away before it starts.
 */
import type { TikTokSpec } from './tiktok-video';

const THUMB_WIDTH = 270;
const THUMB_HEIGHT = 480;
const CACHE_LIMIT = 400;

interface Request {
  key: string;
  spec: TikTokSpec;
  /** Seconds into the clip to capture. */
  atSec: number | 'end';
  resolve: (url: string) => void;
  reject: (err: unknown) => void;
  cancelled: boolean;
}

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();
const queue: Request[] = [];
let running = false;

function remember(key: string, url: string): void {
  cache.delete(key);
  cache.set(key, url);
  while (cache.size > CACHE_LIMIT) {
    const [oldKey, oldUrl] = cache.entries().next().value as [string, string];
    cache.delete(oldKey);
    URL.revokeObjectURL(oldUrl);
  }
}

async function drawOne(req: Request): Promise<string> {
  const { createTikTokRenderer } = await import('./tiktok-video');
  const handle = await createTikTokRenderer({
    spec: req.spec,
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    preview: true,
    silent: true,
  });
  try {
    const { renderer, durationInFrames, fps } = handle.engine;
    const frame =
      req.atSec === 'end'
        ? Math.max(0, durationInFrames - 2)
        : Math.min(durationInFrames - 1, Math.max(0, Math.round(req.atSec * fps)));
    await renderer.prepareFrame(frame);
    renderer.renderFrame(frame);
    const blob = await new Promise<Blob>((resolve, reject) =>
      renderer.canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Thumbnail encode failed.'))), 'image/jpeg', 0.82),
    );
    return URL.createObjectURL(blob);
  } finally {
    handle.dispose();
  }
}

async function pump(): Promise<void> {
  if (running) return;
  running = true;
  try {
    while (queue.length > 0) {
      const req = queue.shift()!;
      if (req.cancelled) continue;
      try {
        const url = await drawOne(req);
        remember(req.key, url);
        req.resolve(url);
      } catch (err) {
        req.reject(err);
      }
      // Let the page breathe between thumbnails.
      await new Promise((r) => setTimeout(r, 0));
    }
  } finally {
    running = false;
  }
}

export function cachedThumbnail(key: string): string | null {
  return cache.get(key) ?? null;
}

/**
 * A thumbnail for `spec`, keyed by `key` (callers build it from everything
 * that changes the picture — not from signed URLs, which change per load).
 * Returns the request plus a cancel for tiles that unmount first.
 */
export function requestThumbnail(
  key: string,
  spec: TikTokSpec,
  atSec: number | 'end' = 'end',
): { promise: Promise<string>; cancel: () => void } {
  const hit = cache.get(key);
  if (hit) return { promise: Promise.resolve(hit), cancel: () => undefined };
  const existing = inflight.get(key);
  if (existing) return { promise: existing, cancel: () => undefined };
  let req!: Request;
  const promise = new Promise<string>((resolve, reject) => {
    req = { key, spec, atSec, resolve, reject, cancelled: false };
  }).finally(() => inflight.delete(key));
  inflight.set(key, promise);
  queue.push(req);
  void pump();
  return {
    promise,
    cancel: () => {
      if (queue.includes(req)) {
        req.cancelled = true;
        queue.splice(queue.indexOf(req), 1);
        inflight.delete(key);
      }
    },
  };
}

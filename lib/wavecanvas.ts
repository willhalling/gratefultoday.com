import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * WaveCanvas API client (https://wavecanvas.io/api/v1). Each order renders a
 * base video with a look's `changes` (lib/looks.ts), the order's narration
 * and lines passed as the render's own `song`.
 */

const BASE = process.env.WAVECANVAS_API_URL || 'https://wavecanvas.io/api/v1';

export type RenderStatus = 'queued' | 'rendering' | 'succeeded' | 'failed';

export interface Render {
  id: string;
  status: RenderStatus;
  progress: number | null;
  url: string | null;
  error: string | null;
  metadata: Record<string, string>;
}

export interface RenderSong {
  audioUrl: string;
  duration: number;
  words: { word: string; start: number; end: number }[];
  lines: string[];
}

export class WaveCanvasError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.WAVECANVAS_API_KEY;
  if (!key) throw new Error('WAVECANVAS_API_KEY is not set.');
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...init?.headers },
    signal: AbortSignal.timeout(60_000),
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string } }).error;
    throw new WaveCanvasError(res.status, err?.code ?? 'unknown', err?.message ?? `WaveCanvas returned ${res.status}.`);
  }
  return body as T;
}

export function createRender(input: {
  videoId: string;
  orientation?: 'portrait' | 'landscape' | 'square';
  /** Part of the song to render, in seconds (default: all of it). */
  start?: number;
  end?: number;
  /** Signature style id; needs a photo background. */
  style?: string | null;
  /** A photo in place of the base video's background, for this render only. */
  background?: { imageUrl: string };
  title: string;
  subtitle?: string;
  changes?: Record<string, unknown>;
  song: RenderSong;
  webhookUrl?: string;
  metadata: Record<string, string>;
}): Promise<Render> {
  return api<Render>('/renders', {
    method: 'POST',
    body: JSON.stringify({ orientation: 'portrait', watermark: false, ...input }),
  });
}

export const getRender = (id: string) => api<Render>(`/renders/${encodeURIComponent(id)}`);

/**
 * Checks a webhook's `WaveCanvas-Signature: t=<unix>,v1=<hex>` header: an
 * HMAC-SHA256 of `<t>.<raw body>` with the webhook secret, at most 5 minutes old.
 */
export function verifyWebhook(rawBody: string, header: string | null, now = Date.now()): boolean {
  const secret = process.env.WAVECANVAS_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const i = p.indexOf('=');
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const t = Number(parts.t);
  if (!Number.isFinite(t) || Math.abs(now / 1000 - t) > 300 || !parts.v1) return false;
  const expected = createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(parts.v1, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

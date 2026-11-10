/**
 * lib/tiktok-maker/stock.ts — Pexels / Unsplash photo search for the TikTok
 * maker, tuned to the Grateful Today look ("Cinematic Melancholic
 * Minimalism": foggy black-and-white fine-art photography, lone silhouettes,
 * heavy negative space, low contrast, soft grain).
 */
import { authHeaders } from './bulk';

export type StockSource = 'pexels' | 'unsplash';

export interface StockPhoto {
  id: string;
  source: StockSource;
  thumb: string;
  /** 1080×1920 portrait crop, hotlinked from the provider's CDN. */
  full: string;
  width: number;
  height: number;
  /** Provider's average / dominant colour, e.g. "#7A7A7A". */
  color: string | null;
  alt: string;
  photographer: string;
  photographerUrl: string;
  pageUrl: string;
  /** Unsplash only: ping this when the photo is used (API guideline). */
  downloadLocation?: string;
}

/** Search phrases that land on the look; one is run per click. */
export const MELANCHOLIC_QUERIES = [
  'lone silhouette in fog black and white',
  'person walking into fog',
  'misty empty road monochrome',
  'foggy beach lone figure',
  'silhouette behind frosted glass',
  'empty street fog night black and white',
  'lone tree in mist minimal',
  'figure standing in mist field',
  'foggy pier black and white',
  'fog landscape negative space monochrome',
  'blurred person through rainy window black and white',
  'solitary figure overcast sky minimal',
];

/** Saturation (0–1) of a hex colour — the provider's average colour stands in for the photo. */
export function colourSaturation(hex: string | null): number | null {
  if (!hex || !/^#?[0-9a-f]{6}$/i.test(hex)) return null;
  const n = parseInt(hex.replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  const l = (max + min) / 2;
  return max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
}

/** Close to black-and-white (by average colour). Unknown colour counts as a pass. */
export function looksMonochrome(photo: StockPhoto): boolean {
  const s = colourSaturation(photo.color);
  return s === null || s < 0.18;
}

export async function searchStockPhotos(
  query: string,
  sources: StockSource[],
  page = 1,
): Promise<{ photos: StockPhoto[]; errors: string[] }> {
  const params = new URLSearchParams({ query, sources: sources.join(','), page: String(page) });
  const res = await fetch(`/api/tiktok-maker/stock?${params}`, { headers: await authHeaders() });
  const body = (await res.json().catch(() => null)) as { photos?: StockPhoto[]; errors?: string[]; error?: string } | null;
  if (!res.ok) throw new Error(body?.error ?? `Search failed (${res.status}).`);
  return { photos: body?.photos ?? [], errors: body?.errors ?? [] };
}

/** Unsplash asks for a "download" ping whenever a photo is actually used. */
export async function trackStockUse(photo: StockPhoto): Promise<void> {
  if (!photo.downloadLocation) return;
  await fetch('/api/tiktok-maker/stock', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ downloadLocation: photo.downloadLocation }),
  }).catch(() => undefined);
}

export function creditLine(photo: StockPhoto): string {
  return `Photo by ${photo.photographer} on ${photo.source === 'pexels' ? 'Pexels' : 'Unsplash'}`;
}

import { NextRequest, NextResponse } from 'next/server';
import { rejectNonAdmin } from '@/lib/tiktok-maker/admin-auth';
import type { StockPhoto, StockSource } from '@/lib/tiktok-maker/stock';

const PER_PAGE = 30;

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  alt: string;
  avg_color: string | null;
  photographer: string;
  photographer_url: string;
  src: { original: string; medium: string; portrait: string };
}

interface UnsplashPhoto {
  id: string;
  width: number;
  height: number;
  color: string | null;
  alt_description: string | null;
  description: string | null;
  urls: { raw: string; small: string };
  links: { html: string; download_location: string };
  user: { name: string; links: { html: string } };
}

async function searchPexels(query: string, page: number): Promise<StockPhoto[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error('PEXELS_API_KEY is not set.');
  const url = `https://api.pexels.com/v1/search?${new URLSearchParams({
    query,
    orientation: 'portrait',
    per_page: String(PER_PAGE),
    page: String(page),
  })}`;
  const res = await fetch(url, { headers: { Authorization: key } });
  if (!res.ok) throw new Error(`Pexels error ${res.status}`);
  const data = (await res.json()) as { photos: PexelsPhoto[] };
  return data.photos.map((p) => ({
    id: `pexels-${p.id}`,
    source: 'pexels',
    thumb: p.src.medium,
    // Same 1080×1920 crop the aesthetic pools use.
    full: `${p.src.original}?auto=compress&cs=tinysrgb&fit=crop&w=1080&h=1920`,
    width: p.width,
    height: p.height,
    color: p.avg_color,
    alt: p.alt ?? '',
    photographer: p.photographer,
    photographerUrl: p.photographer_url,
    pageUrl: p.url,
  }));
}

async function searchUnsplash(query: string, page: number): Promise<StockPhoto[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) throw new Error('UNSPLASH_ACCESS_KEY is not set.');
  const url = `https://api.unsplash.com/search/photos?${new URLSearchParams({
    query,
    orientation: 'portrait',
    per_page: String(PER_PAGE),
    page: String(page),
    content_filter: 'high',
  })}`;
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' } });
  if (!res.ok) throw new Error(`Unsplash error ${res.status}`);
  const data = (await res.json()) as { results: UnsplashPhoto[] };
  const ref = 'utm_source=grateful_today&utm_medium=referral';
  return data.results.map((p) => ({
    id: `unsplash-${p.id}`,
    source: 'unsplash',
    thumb: p.urls.small,
    // Hotlinked, as Unsplash requires; imgix crops it to the TikTok frame.
    full: `${p.urls.raw}&w=1080&h=1920&fit=crop&crop=entropy&q=85&fm=jpg`,
    width: p.width,
    height: p.height,
    color: p.color,
    alt: p.alt_description ?? p.description ?? '',
    photographer: p.user.name,
    photographerUrl: `${p.user.links.html}?${ref}`,
    pageUrl: `${p.links.html}?${ref}`,
    downloadLocation: p.links.download_location,
  }));
}

/** GET ?query=…&sources=pexels,unsplash&page=1 → { photos, errors } */
export async function GET(req: NextRequest) {
  const rejected = await rejectNonAdmin(req);
  if (rejected) return rejected;

  const params = req.nextUrl.searchParams;
  const query = (params.get('query') ?? '').trim().slice(0, 200);
  if (!query) return NextResponse.json({ error: 'Query is required.' }, { status: 400 });
  const page = Math.max(1, Math.min(20, Number(params.get('page')) || 1));
  const sources = (params.get('sources') ?? 'pexels,unsplash')
    .split(',')
    .filter((s): s is StockSource => s === 'pexels' || s === 'unsplash');

  const results = await Promise.allSettled(
    sources.map((s) => (s === 'pexels' ? searchPexels(query, page) : searchUnsplash(query, page))),
  );
  const lists: StockPhoto[][] = [];
  const errors: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') lists.push(r.value);
    else errors.push(`${sources[i]}: ${r.reason instanceof Error ? r.reason.message : 'failed'}`);
  });
  // Interleave sources so one doesn't bury the other.
  const photos: StockPhoto[] = [];
  for (let i = 0; i < PER_PAGE; i++) for (const list of lists) if (list[i]) photos.push(list[i]);
  return NextResponse.json({ photos, errors });
}

/** POST { downloadLocation } — Unsplash's required "download" ping when a photo is used. */
export async function POST(req: NextRequest) {
  const rejected = await rejectNonAdmin(req);
  if (rejected) return rejected;
  const { downloadLocation } = (await req.json().catch(() => ({}))) as { downloadLocation?: string };
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key || !downloadLocation?.startsWith('https://api.unsplash.com/')) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const res = await fetch(downloadLocation, { headers: { Authorization: `Client-ID ${key}` } });
  return NextResponse.json({ ok: res.ok });
}

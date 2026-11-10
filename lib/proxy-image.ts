/**
 * Helpers to route external media through same-origin proxy endpoints so
 * browser renderer previews and exports can load them without CORS errors.
 */

export const PROXYABLE_MEDIA_PREFIXES = [
  'https://firebasestorage.googleapis.com/',
  'https://storage.googleapis.com/',
  'https://images.unsplash.com/',
  'https://images.pexels.com/',
  'https://videos.pexels.com/',
  'https://v3.fal.media/',
  'https://via.placeholder.com/',
  'https://funeralcollage.com/',
  'https://staging.funeralcollage.com/',
];

function shouldProxyImage(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('/') && !url.startsWith('//')) return false;
  if (url.startsWith('data:')) return false;
  return PROXYABLE_MEDIA_PREFIXES.some((origin) => url.startsWith(origin));
}

export function proxyImageUrl<T extends string | null | undefined>(
  url: T,
  enabled: boolean
): T {
  if (!enabled || !url || typeof url !== 'string') return url;
  if (!shouldProxyImage(url)) return url as T;
  return `/api/proxy-image?url=${encodeURIComponent(url)}` as T;
}

export function proxyImageUrls(
  urls: string[] | null | undefined,
  enabled: boolean
): string[] | undefined {
  if (!enabled || !urls || urls.length === 0) return urls ?? undefined;
  return urls.map((url) => proxyImageUrl(url, enabled));
}

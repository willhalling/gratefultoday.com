import { NextRequest, NextResponse } from 'next/server';
import { PROXYABLE_MEDIA_PREFIXES } from '@/lib/proxy-image';

async function handler(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
  }

  if (!PROXYABLE_MEDIA_PREFIXES.some((prefix) => imageUrl.startsWith(prefix))) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
  }

  try {
    const method = request.method === 'HEAD' ? 'HEAD' : 'GET';
    const upstream = await fetch(imageUrl, { method });

    if (!upstream.ok) {
      // Return the REAL upstream status. Masking 404s as a transparent 1×1
      // GIF made dead CDN URLs fail silently (SafeImg "loaded" an invisible
      // pixel, Three.js scenes textured a 1×1 plane). Client-side consumers
      // now handle real errors gracefully: SafeImg falls back / renders null,
      // the Three.js scenes render nothing on texture failure, and the depth
      // gallery filters dead URLs at preload time.
      console.warn('[proxy-image] upstream', upstream.status, ':', imageUrl);
      return NextResponse.json(
        { error: `Upstream error: ${upstream.status}` },
        { status: upstream.status },
      );
    }

    const responseHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      // CDN image paths are versioned by their filename, so they can be cached
      // immutably for a year.
      'Cache-Control': 'public, max-age=31536000, immutable',
    };

    for (const key of ['content-type', 'content-length', 'etag', 'cache-control']) {
      const val = upstream.headers.get(key);
      if (val) responseHeaders[key] = val;
    }
    if (!responseHeaders['content-type']) responseHeaders['content-type'] = 'image/jpeg';

    if (method === 'HEAD') {
      return new NextResponse(null, { status: upstream.status, headers: responseHeaders });
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy failed' },
      { status: 500 },
    );
  }
}

export const GET = handler;
export const HEAD = handler;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
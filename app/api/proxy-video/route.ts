import { NextRequest, NextResponse } from 'next/server';
import { PROXYABLE_MEDIA_PREFIXES } from '@/lib/proxy-image';

async function handler(request: NextRequest) {
  const videoUrl = request.nextUrl.searchParams.get('url');

  if (!videoUrl) {
    return NextResponse.json({ error: 'Missing video URL' }, { status: 400 });
  }

  if (!PROXYABLE_MEDIA_PREFIXES.some((prefix) => videoUrl.startsWith(prefix))) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
  }

  try {
    const upstreamHeaders: Record<string, string> = {};
    const range = request.headers.get('range');
    if (range) upstreamHeaders['Range'] = range;

    // mediabunny sends HEAD to get Content-Length — forward it
    const method = request.method === 'HEAD' ? 'HEAD' : 'GET';
    const upstream = await fetch(videoUrl, { method, headers: upstreamHeaders });

    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json(
        { error: `Upstream error: ${upstream.status}` },
        { status: upstream.status }
      );
    }

    const responseHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
      'Cache-Control': 'public, max-age=86400',
    };

    for (const key of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
      const val = upstream.headers.get(key);
      if (val) responseHeaders[key] = val;
    }
    if (!responseHeaders['accept-ranges']) responseHeaders['accept-ranges'] = 'bytes';
    if (!responseHeaders['content-type']) responseHeaders['content-type'] = 'video/mp4';

    // HEAD: return headers only, no body
    if (method === 'HEAD') {
      return new NextResponse(null, { status: upstream.status, headers: responseHeaders });
    }

    // Stream the body directly — no buffering
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Video proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy failed' },
      { status: 500 }
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
      'Access-Control-Allow-Headers': 'Range',
    },
  });
}

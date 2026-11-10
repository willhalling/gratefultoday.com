import { NextRequest, NextResponse } from 'next/server';
import dns from 'node:dns/promises';

const MAX_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB — WAVs are uncompressed and commonly exceed 50 MB

const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.aac', '.mp4'];
const BLOCKED_HOSTNAMES = ['localhost', '0.0.0.0', '::1', 'metadata.google.internal'];

function isPrivateIP(ip: string): boolean {
  return (
    /^127\./.test(ip) ||
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip) ||
    /^169\.254\./.test(ip) ||
    /^0\.0\.0\.0$/.test(ip) ||
    /^::1$/.test(ip) ||
    /^fc00:/i.test(ip) ||
    /^fe80:/i.test(ip)
  );
}

export async function GET(request: NextRequest) {
  try {
    const rawUrl = request.nextUrl.searchParams.get('url');

    if (!rawUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // Validate URL structure
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return NextResponse.json(
        { error: 'Only http and https URLs are supported' },
        { status: 400 }
      );
    }

    const hostname = parsed.hostname;

    // Block well-known reserved hostnames
    if (BLOCKED_HOSTNAMES.includes(hostname.toLowerCase())) {
      return NextResponse.json({ error: 'URL not allowed' }, { status: 400 });
    }

    // SSRF protection: resolve hostname and reject private/internal IPs
    try {
      const { address } = await dns.lookup(hostname);
      if (isPrivateIP(address)) {
        return NextResponse.json({ error: 'URL not allowed' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Could not resolve hostname' }, { status: 400 });
    }

    // HEAD first to reject obviously oversized files without streaming.
    try {
      const headRes = await fetch(rawUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10_000),
      });
      const contentLength = headRes.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File too large (max ${MAX_SIZE_BYTES / 1024 / 1024} MB)` },
          { status: 413 }
        );
      }
    } catch {
      // HEAD not supported by all servers — proceed with GET
    }

    const response = await fetch(rawUrl, { signal: AbortSignal.timeout(120_000) });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL (${response.status})` },
        { status: 502 }
      );
    }

    const resolvedContentType =
      response.headers.get('content-type') ?? 'application/octet-stream';
    const mimeType = resolvedContentType.split(';')[0].trim();

    // Validate the response is audio — allow application/octet-stream if extension matches
    const isAudioMime = mimeType.startsWith('audio/');
    const hasAudioExt = AUDIO_EXTENSIONS.some((ext) =>
      parsed.pathname.toLowerCase().endsWith(ext)
    );
    if (!isAudioMime && !hasAudioExt) {
      return NextResponse.json(
        { error: 'URL does not point to a supported audio file (MP3, WAV, M4A, AAC)' },
        { status: 415 }
      );
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_SIZE_BYTES / 1024 / 1024} MB)` },
        { status: 413 }
      );
    }

    // Stream the response body through instead of buffering it on the server.
    // WAVs from cloud storage can be 100 MB+ and this keeps proxy memory flat.
    return new NextResponse(response.body ?? undefined, {
      headers: {
        'Content-Type': isAudioMime ? mimeType : 'audio/mpeg',
        // No caching — user is actively importing this file
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('❌ Audio proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy failed' },
      { status: 500 }
    );
  }
}

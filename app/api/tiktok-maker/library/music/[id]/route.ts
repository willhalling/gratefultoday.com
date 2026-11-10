import { Readable } from 'stream';
import { NextRequest, NextResponse } from 'next/server';
import { rejectNonAdmin } from '@/lib/tiktok-maker/admin-auth';
import { getMusic, musicReadStream } from '@/lib/tiktok-maker/library-server';

export const runtime = 'nodejs';

/** Streams a saved background-sound file (streamed, so its size isn't capped). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rejected = await rejectNonAdmin(req);
  if (rejected) return rejected;
  const { id } = await params;
  const music = await getMusic(id).catch(() => null);
  if (!music) return NextResponse.json({ error: 'Music not found.' }, { status: 404 });
  const stream = Readable.toWeb(musicReadStream(music) as Readable) as ReadableStream<Uint8Array>;
  return new NextResponse(stream, {
    headers: {
      'Content-Type': music.contentType,
      'Content-Length': String(music.bytes),
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
}

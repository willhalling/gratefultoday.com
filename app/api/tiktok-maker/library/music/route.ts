import { NextRequest, NextResponse } from 'next/server';
import { rejectNonAdmin } from '@/lib/tiktok-maker/admin-auth';
import { finalizeMusic } from '@/lib/tiktok-maker/library-server';

/** POST { id, storagePath, name, contentType } — record a background-sound file the browser uploaded. */
export async function POST(req: NextRequest) {
  const rejected = await rejectNonAdmin(req);
  if (rejected) return rejected;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const str = (k: string) => (typeof b[k] === 'string' ? (b[k] as string) : '');
  if (!str('id') || !str('storagePath')) return NextResponse.json({ error: 'id and storagePath are required.' }, { status: 400 });
  try {
    const music = await finalizeMusic({
      id: str('id'),
      storagePath: str('storagePath'),
      name: str('name') || 'music',
      contentType: str('contentType') || 'audio/mpeg',
    });
    return NextResponse.json({ music });
  } catch (error) {
    console.error('[tiktok-maker/library/music] failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save the music.' }, { status: 500 });
  }
}

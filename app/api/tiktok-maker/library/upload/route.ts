import { NextRequest, NextResponse } from 'next/server';
import { rejectNonAdmin } from '@/lib/tiktok-maker/admin-auth';
import { createUploadSession } from '@/lib/tiktok-maker/library-server';

/**
 * POST { kind: 'image' | 'render' | 'music', contentType?, scriptId? } → { id, storagePath, uploadUrl, contentType }.
 * The browser PUTs the file to uploadUrl (straight to Storage), then finalizes
 * it through /library/images, /library/renders or /library/music.
 */
export async function POST(req: NextRequest) {
  const rejected = await rejectNonAdmin(req);
  if (rejected) return rejected;
  const body = (await req.json().catch(() => ({}))) as { kind?: string; contentType?: string; scriptId?: string };
  const kind = body.kind === 'render' || body.kind === 'image' || body.kind === 'music' ? body.kind : null;
  if (!kind) return NextResponse.json({ error: 'kind must be image, render or music.' }, { status: 400 });
  const audioType = typeof body.contentType === 'string' && /^audio\/[a-z0-9.+-]{1,40}$/i.test(body.contentType) ? body.contentType : 'audio/mpeg';
  const contentType = kind === 'render' ? 'video/mp4' : kind === 'image' ? 'image/jpeg' : audioType;
  const extension = kind === 'music' ? (audioType.split('/')[1].replace(/^x-/, '').replace('mpeg', 'mp3').slice(0, 8) || 'mp3') : undefined;
  const scriptId = typeof body.scriptId === 'string' && /^[A-Za-z0-9]{1,64}$/.test(body.scriptId) ? body.scriptId : undefined;
  try {
    const session = await createUploadSession({
      kind,
      contentType,
      origin: req.headers.get('origin') ?? req.nextUrl.origin,
      scriptId,
      extension,
    });
    return NextResponse.json({ ...session, contentType });
  } catch (error) {
    console.error('[tiktok-maker/library/upload] session failed:', error);
    return NextResponse.json({ error: 'Could not start the upload.' }, { status: 500 });
  }
}

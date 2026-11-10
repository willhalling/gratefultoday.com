import { NextRequest, NextResponse } from 'next/server';
import { rejectNonAdmin } from '@/lib/tiktok-maker/admin-auth';
import { finalizeRender, renderDownloadUrl } from '@/lib/tiktok-maker/library-server';

/**
 * POST { id, storagePath, scriptId, voiceoverId, imageId, fileName, durationSec, settings }
 * — record an MP4 the browser has uploaded; returns it with a signed download link.
 */
export async function POST(req: NextRequest) {
  const rejected = await rejectNonAdmin(req);
  if (rejected) return rejected;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const str = (k: string) => (typeof b[k] === 'string' ? (b[k] as string) : null);
  const id = str('id');
  const storagePath = str('storagePath');
  const scriptId = str('scriptId');
  if (!id || !storagePath || !scriptId) {
    return NextResponse.json({ error: 'id, storagePath and scriptId are required.' }, { status: 400 });
  }
  try {
    const record = await finalizeRender({
      id,
      storagePath,
      scriptId,
      voiceoverId: str('voiceoverId'),
      imageId: str('imageId'),
      fileName: (str('fileName') ?? 'tiktok.mp4').slice(0, 200),
      durationSec: Number(b.durationSec) || 0,
      settings: b.settings && typeof b.settings === 'object' ? (b.settings as Record<string, unknown>) : {},
    });
    return NextResponse.json({ render: { ...record, downloadUrl: await renderDownloadUrl(record) } });
  } catch (error) {
    console.error('[tiktok-maker/library/renders] failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save the render.' }, { status: 500 });
  }
}

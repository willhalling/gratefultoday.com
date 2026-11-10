import { NextRequest, NextResponse } from 'next/server';
import { rejectNonAdmin } from '@/lib/tiktok-maker/admin-auth';
import { finalizeImageUpload, listImages, saveStockImage, setImageArchived } from '@/lib/tiktok-maker/library-server';

const ALLOWED_STOCK_HOSTS = ['https://images.pexels.com/', 'https://images.unsplash.com/'];

/**
 * POST { action: 'finalize', id, storagePath, name }   — record an uploaded image
 * POST { action: 'stock', name, url, thumb, source, … } — record a Pexels/Unsplash pick
 * Both return the record with a `displayUrl`.
 */
export async function POST(req: NextRequest) {
  const rejected = await rejectNonAdmin(req);
  if (rejected) return rejected;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const str = (k: string) => (typeof body[k] === 'string' ? (body[k] as string) : '');
  try {
    let id: string;
    if (body.action === 'finalize') {
      id = (await finalizeImageUpload({ id: str('id'), storagePath: str('storagePath'), name: str('name') || 'image' })).id;
    } else if (body.action === 'stock') {
      const url = str('url');
      const thumb = str('thumb');
      const source = body.source === 'pexels' || body.source === 'unsplash' ? body.source : null;
      if (!source || !ALLOWED_STOCK_HOSTS.some((h) => url.startsWith(h) && thumb.startsWith(h))) {
        return NextResponse.json({ error: 'Not a Pexels or Unsplash photo.' }, { status: 400 });
      }
      id = (
        await saveStockImage({
          name: str('name').slice(0, 200),
          url,
          thumb,
          source,
          pageUrl: str('pageUrl'),
          photographerUrl: str('photographerUrl'),
          stockId: str('stockId').slice(0, 100),
        })
      ).id;
    } else {
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }
    const image = (await listImages()).find((i) => i.id === id);
    return NextResponse.json({ image });
  } catch (error) {
    console.error('[tiktok-maker/library/images] failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save the image.' }, { status: 500 });
  }
}

/** PATCH { id, archived } — images leave the pool by being archived, never deleted. */
export async function PATCH(req: NextRequest) {
  const rejected = await rejectNonAdmin(req);
  if (rejected) return rejected;
  const { id, archived } = (await req.json().catch(() => ({}))) as { id?: string; archived?: boolean };
  if (!id || typeof archived !== 'boolean') return NextResponse.json({ error: 'id and archived are required.' }, { status: 400 });
  try {
    await setImageArchived(id, archived);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[tiktok-maker/library/images] archive failed:', error);
    return NextResponse.json({ error: 'Could not update the image.' }, { status: 500 });
  }
}

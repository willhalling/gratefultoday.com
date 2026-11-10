import { NextRequest, NextResponse } from 'next/server';
import { rejectNonAdmin } from '@/lib/tiktok-maker/admin-auth';
import { getMusic, getSettings, saveSettings } from '@/lib/tiktok-maker/library-server';

/** GET → { settings, music } — the shared style and its background-sound record. */
export async function GET(req: NextRequest) {
  const rejected = await rejectNonAdmin(req);
  if (rejected) return rejected;
  try {
    const settings = await getSettings();
    const musicId = typeof settings?.musicId === 'string' ? settings.musicId : null;
    return NextResponse.json({ settings, music: musicId ? await getMusic(musicId) : null });
  } catch (error) {
    console.error('[tiktok-maker/library/settings] read failed:', error);
    return NextResponse.json({ error: 'Could not load the saved style.' }, { status: 500 });
  }
}

/** PUT { typewriter, background, sound, musicId } — the previous version is kept in history. */
export async function PUT(req: NextRequest) {
  const rejected = await rejectNonAdmin(req);
  if (rejected) return rejected;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.typewriter !== 'object' || typeof body.background !== 'object' || typeof body.sound !== 'object') {
    return NextResponse.json({ error: 'typewriter, background and sound are required.' }, { status: 400 });
  }
  if (JSON.stringify(body).length > 50_000) return NextResponse.json({ error: 'Settings too large.' }, { status: 400 });
  try {
    await saveSettings({
      typewriter: body.typewriter,
      background: body.background,
      sound: body.sound,
      musicId: typeof body.musicId === 'string' ? body.musicId : null,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[tiktok-maker/library/settings] save failed:', error);
    return NextResponse.json({ error: 'Could not save the style.' }, { status: 500 });
  }
}

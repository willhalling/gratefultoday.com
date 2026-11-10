import { NextRequest, NextResponse } from 'next/server';
import { rejectNonAdmin } from '@/lib/tiktok-maker/admin-auth';
import {
  listImages,
  listRenders,
  listScripts,
  listVoiceovers,
  saveScripts,
  updateScript,
} from '@/lib/tiktok-maker/library-server';

/** GET → every script (archived included), voiceover take, image and render. */
export async function GET(req: NextRequest) {
  const rejected = await rejectNonAdmin(req);
  if (rejected) return rejected;
  try {
    const [scripts, voiceovers, images, renders] = await Promise.all([
      listScripts(),
      listVoiceovers(),
      listImages(),
      listRenders(),
    ]);
    return NextResponse.json({ scripts, voiceovers, images, renders });
  } catch (error) {
    console.error('[tiktok-maker/library] list failed:', error);
    return NextResponse.json({ error: 'Could not load the script library.' }, { status: 500 });
  }
}

/** POST { scripts: [{day,title,script}] } → saves pasted scripts. */
export async function POST(req: NextRequest) {
  const rejected = await rejectNonAdmin(req);
  if (rejected) return rejected;
  const body = (await req.json().catch(() => ({}))) as { scripts?: { day: number; title: string; script: string }[] };
  const scripts = (body.scripts ?? [])
    .filter((s) => typeof s?.script === 'string' && s.script.trim())
    .slice(0, 100)
    .map((s) => ({ day: Math.max(1, Math.floor(Number(s.day) || 1)), title: String(s.title ?? '').slice(0, 80), script: s.script.slice(0, 3000) }));
  if (scripts.length === 0) return NextResponse.json({ error: 'No scripts to save.' }, { status: 400 });
  try {
    return NextResponse.json({ scripts: await saveScripts(scripts, { source: 'pasted' }) });
  } catch (error) {
    console.error('[tiktok-maker/library] save failed:', error);
    return NextResponse.json({ error: 'Could not save the scripts.' }, { status: 500 });
  }
}

/** PATCH { id, day?, title?, script?, archived?, imageId?, lineImageIds? } — the old version is kept as a revision. */
export async function PATCH(req: NextRequest) {
  const rejected = await rejectNonAdmin(req);
  if (rejected) return rejected;
  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    day?: number;
    title?: string;
    script?: string;
    archived?: boolean;
    imageId?: string | null;
    lineImageIds?: unknown;
  };
  if (!body.id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });
  const patch: Parameters<typeof updateScript>[1] = {};
  if (body.day !== undefined) patch.day = Math.max(1, Math.floor(Number(body.day) || 1));
  if (typeof body.title === 'string') patch.title = body.title.slice(0, 80);
  if (typeof body.script === 'string') patch.script = body.script.slice(0, 3000);
  if (typeof body.archived === 'boolean') patch.archived = body.archived;
  if (body.imageId === null || typeof body.imageId === 'string') patch.imageId = body.imageId;
  if (body.lineImageIds === null) patch.lineImageIds = null;
  else if (Array.isArray(body.lineImageIds)) {
    patch.lineImageIds = body.lineImageIds
      .slice(0, 6)
      .map((id) => (typeof id === 'string' && /^[A-Za-z0-9]{1,64}$/.test(id) ? id : null));
  }
  try {
    await updateScript(body.id, patch);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[tiktok-maker/library] update failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Update failed.' }, { status: 500 });
  }
}

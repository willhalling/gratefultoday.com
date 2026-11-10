import { NextRequest, NextResponse } from 'next/server';
import { rejectNonAdmin } from '@/lib/tiktok-maker/admin-auth';
import { cancelQueuedJobs, enqueueJobs, listJobs, updateJob, type JobStatus } from '@/lib/tiktok-maker/library-server';

const STATUSES: JobStatus[] = ['queued', 'rendering', 'done', 'failed', 'cancelled'];

/** GET → { jobs } — open jobs plus recent finished ones, oldest first. */
export async function GET(req: NextRequest) {
  const rejected = await rejectNonAdmin(req);
  if (rejected) return rejected;
  try {
    return NextResponse.json({ jobs: await listJobs() });
  } catch (error) {
    console.error('[tiktok-maker/library/jobs] list failed:', error);
    return NextResponse.json({ error: 'Could not load the render queue.' }, { status: 500 });
  }
}

/**
 * POST { scriptIds } → queue them (skipping any already queued).
 * POST { action: 'cancel-queued' } → cancel everything not yet started.
 */
export async function POST(req: NextRequest) {
  const rejected = await rejectNonAdmin(req);
  if (rejected) return rejected;
  const body = (await req.json().catch(() => ({}))) as { scriptIds?: unknown; action?: string };
  try {
    if (body.action === 'cancel-queued') return NextResponse.json({ cancelled: await cancelQueuedJobs() });
    const ids = Array.isArray(body.scriptIds)
      ? body.scriptIds.filter((id): id is string => typeof id === 'string' && /^[A-Za-z0-9]{1,64}$/.test(id)).slice(0, 2000)
      : [];
    if (ids.length === 0) return NextResponse.json({ error: 'scriptIds are required.' }, { status: 400 });
    return NextResponse.json({ jobs: await enqueueJobs(ids) });
  } catch (error) {
    console.error('[tiktok-maker/library/jobs] enqueue failed:', error);
    return NextResponse.json({ error: 'Could not queue the renders.' }, { status: 500 });
  }
}

/** PATCH { id, status, error?, renderId?, attempt? } */
export async function PATCH(req: NextRequest) {
  const rejected = await rejectNonAdmin(req);
  if (rejected) return rejected;
  const b = (await req.json().catch(() => ({}))) as {
    id?: string;
    status?: JobStatus;
    error?: string | null;
    renderId?: string | null;
    attempt?: boolean;
  };
  if (!b.id || (b.status && !STATUSES.includes(b.status))) {
    return NextResponse.json({ error: 'id and a valid status are required.' }, { status: 400 });
  }
  try {
    await updateJob(b.id, {
      ...(b.status ? { status: b.status } : {}),
      ...(b.error !== undefined ? { error: b.error ? String(b.error).slice(0, 500) : null } : {}),
      ...(b.renderId !== undefined ? { renderId: b.renderId } : {}),
      attempt: !!b.attempt,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[tiktok-maker/library/jobs] update failed:', error);
    return NextResponse.json({ error: 'Could not update the job.' }, { status: 500 });
  }
}

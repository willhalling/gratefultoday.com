/**
 * PUT /api/advisor/memory: replace what the advisor remembers (edit or delete notes).
 * Admin only.
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { error, handle, json, readBody } from '@/lib/orders/http';
import { adminUid } from '@/lib/advisor/auth';
import { MAX_NOTES, setNotes } from '@/lib/advisor/store';

const MemoryRequest = z.object({ notes: z.array(z.string().trim().max(500)).max(MAX_NOTES) });

export async function PUT(req: NextRequest) {
  return handle(async () => {
    const uid = await adminUid(req);
    if (!uid) return error(401, 'Sign in as an admin.');
    const body = await readBody(req, MemoryRequest);
    if (!body.ok) return body.response;
    return json({ notes: await setNotes(uid, body.data.notes) });
  });
}

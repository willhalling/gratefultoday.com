/**
 * POST   /api/advisor/saved: save a passage to the commonplace book (with an optional note).
 * DELETE /api/advisor/saved?chunkId=...: remove it.
 * Admin only.
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { error, handle, json, readBody } from '@/lib/orders/http';
import { adminUid } from '@/lib/advisor/auth';
import { getChunk, quoteAppearsIn } from '@/lib/advisor/library';
import { passageFromChunk, savePassage, unsavePassage } from '@/lib/advisor/store';

const SaveRequest = z.object({
  chunkId: z.string().min(1),
  quote: z.string().trim().min(1).max(4000),
  why: z.string().trim().max(2000).default(''),
  note: z.string().trim().max(4000).default(''),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const uid = await adminUid(req);
    if (!uid) return error(401, 'Sign in as an admin.');
    const body = await readBody(req, SaveRequest);
    if (!body.ok) return body.response;
    const { chunkId, quote, why, note } = body.data;
    const chunk = getChunk(chunkId);
    if (!chunk) return error(404, 'That passage isn’t in the library.');
    if (!quoteAppearsIn(quote, chunk.text)) return error(400, 'That quote doesn’t match the passage.');
    return json(await savePassage(uid, passageFromChunk(chunk, quote, why), note));
  });
}

export async function DELETE(req: NextRequest) {
  return handle(async () => {
    const uid = await adminUid(req);
    if (!uid) return error(401, 'Sign in as an admin.');
    const chunkId = req.nextUrl.searchParams.get('chunkId');
    if (!chunkId) return error(400, 'Which passage?');
    await unsavePassage(uid, chunkId);
    return json({ ok: true });
  });
}

/**
 * GET  /api/advisor: voices, recent entries, memory notes and saved passages.
 * POST /api/advisor: write an entry and get the advisor's reply.
 * Admin only.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { error, handle, json, readBody } from '@/lib/orders/http';
import { advise } from '@/lib/advisor/advise';
import { adminUid } from '@/lib/advisor/auth';
import { getNotes, listSaved, recentEntries } from '@/lib/advisor/store';
import { DEFAULT_VOICE, publicVoices } from '@/lib/advisor/voices';

// Searching the library and writing the reply takes a few model turns.
export const maxDuration = 300;

const AdviseRequest = z.object({
  entry: z.string().trim().min(1, 'Write something first.').max(8000, 'That’s a lot. Try a shorter entry.'),
  voice: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return handle(async () => {
    const uid = await adminUid(req);
    if (!uid) return error(401, 'Sign in as an admin.');
    const [entries, notes, saved] = await Promise.all([recentEntries(uid, 30), getNotes(uid), listSaved(uid)]);
    return json({ voices: publicVoices(), defaultVoice: DEFAULT_VOICE, entries, notes, saved });
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const uid = await adminUid(req);
    if (!uid) return error(401, 'Sign in as an admin.');
    const body = await readBody(req, AdviseRequest);
    if (!body.ok) return body.response;
    try {
      return json(await advise(uid, body.data.entry, body.data.voice));
    } catch (e) {
      // This page is only for the admin, so show the API's own reason
      // (spending limit, bad key, overloaded) rather than a generic error.
      if (e instanceof Anthropic.APIError) {
        console.error(e);
        const reason = (e.error as { error?: { message?: string } } | undefined)?.error?.message ?? e.message;
        return error(502, `Anthropic API: ${reason}`);
      }
      throw e;
    }
  });
}

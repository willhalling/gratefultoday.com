/**
 * GET  /api/advisor: voices, recent entries, memory notes and saved passages.
 * POST /api/advisor: write an entry and get the advisor's reply.
 * Admin only.
 */
import Anthropic from '@anthropic-ai/sdk';
import { NextResponse, type NextRequest } from 'next/server';
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

/**
 * Streams newline-delimited JSON so the page can show progress:
 *   {"type":"search","queries":[...],"found":8}   (zero or more)
 *   {"type":"done", ...AdviceResult}  or  {"type":"error","message":"..."}
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const uid = await adminUid(req);
    if (!uid) return error(401, 'Sign in as an admin.');
    const body = await readBody(req, AdviseRequest);
    if (!body.ok) return body.response;
    const { entry, voice } = body.data;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: object) => controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
        try {
          const result = await advise(uid, entry, voice, send);
          send({ type: 'done', ...result });
        } catch (e) {
          console.error(e);
          send({ type: 'error', message: errorMessage(e) });
        } finally {
          controller.close();
        }
      },
    });
    return new NextResponse(stream, {
      headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  });
}

/** This page is only for the admin, so show the real reason (spending limit, bad key, overloaded). */
function errorMessage(e: unknown): string {
  if (e instanceof Anthropic.APIError) {
    const reason = (e.error as { error?: { message?: string } } | undefined)?.error?.message ?? e.message;
    return `Anthropic API: ${reason}`;
  }
  return e instanceof Error ? e.message : 'Something went wrong.';
}

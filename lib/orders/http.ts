import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

export const error = (status: number, message: string) => json({ error: message }, status);

export function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

/** Parses a JSON body with a zod schema, or returns a 400 with the first problem. */
export async function readBody<T extends z.ZodType>(
  req: NextRequest,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: error(400, 'The request wasn’t valid JSON.') };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: error(400, parsed.error.issues[0]?.message ?? 'Some answers aren’t valid.') };
  }
  return { ok: true, data: parsed.data };
}

/** Wraps a handler so unexpected errors are logged and returned as a friendly 500. */
export async function handle(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (e) {
    console.error(e);
    return error(500, 'Something went wrong on our side. Please try again in a moment.');
  }
}

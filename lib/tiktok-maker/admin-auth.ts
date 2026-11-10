import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

/**
 * Server-side admin check for the TikTok maker API routes: the client sends
 * its Firebase ID token as `Authorization: Bearer <token>`. Returns a 401/403
 * response to send back, or null when the caller is an admin.
 */
export async function rejectNonAdmin(req: NextRequest): Promise<NextResponse | null> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  try {
    const decoded = await getFirebaseAdmin().auth.verifyIdToken(token);
    if (!isAdmin(decoded.uid)) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    return null;
  } catch {
    return NextResponse.json({ error: 'Invalid or expired sign-in.' }, { status: 401 });
  }
}

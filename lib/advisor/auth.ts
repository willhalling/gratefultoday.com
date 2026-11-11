import 'server-only';
import type { NextRequest } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

/**
 * The signed-in admin's uid, from the Firebase ID token in the Authorization
 * header, or null if the caller isn't signed in as an admin.
 */
export async function adminUid(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return null;
  try {
    const { uid } = await getFirebaseAdmin().auth.verifyIdToken(token);
    return isAdmin(uid) ? uid : null;
  } catch {
    return null;
  }
}

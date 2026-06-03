'use server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export async function createWeekJourneyToken(email: string): Promise<string> {
  const { auth: adminAuth } = getFirebaseAdmin();
  
  // Create or get user by email
  let user;
  try {
    user = await adminAuth.getUserByEmail(email);
  } catch (error) {
    user = await adminAuth.createUser({
      email,
      emailVerified: true,
    });
  }

  // Create custom token
  const customToken = await adminAuth.createCustomToken(user.uid, {
    weekJourney: true,
    email,
  });

  return customToken;
}

export async function setWeekJourneySession(token: string) {
  const cookieStore = await cookies();
  
  // Set session cookie that expires in 8 days (enough for full journey)
  cookieStore.set('week-journey-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 8, // 8 days
    path: '/',
  });
}

export async function getWeekJourneySession(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('week-journey-token')?.value || null;
}

export async function verifyWeekJourneyToken(token: string): Promise<string | null> {
  try {
    const { auth: adminAuth } = getFirebaseAdmin();
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

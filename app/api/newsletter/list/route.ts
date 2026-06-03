/**
 * API route for fetching newsletters from Firestore
 */

import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import type { NewsletterEmail } from '@/types/newsletter';

export async function GET() {
  try {
    const { db } = getFirebaseAdmin();

    // Get all newsletters without ordering (to avoid index requirement)
    const snapshot = await db.collection('newsletter').get();

    const newsletters: NewsletterEmail[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      newsletters.push({
        dayOfYear: data.dayOfYear,
        subject: data.subject,
        greeting: data.greeting,
        body: data.body,
        signoff: data.signoff,
        ps: data.ps || undefined,
      });
    });

    // Sort in JavaScript instead
    newsletters.sort((a, b) => a.dayOfYear - b.dayOfYear);

    return NextResponse.json({ newsletters });
  } catch (error) {
    console.error('Error fetching newsletters:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch newsletters' 
    }, { status: 500 });
  }
}

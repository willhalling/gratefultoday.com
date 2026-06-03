/**
 * API route for saving Daily Gratitude Reflection newsletter emails to Firestore
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import type { NewsletterEmail } from '@/types/newsletter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, dayOfYear } = body as { email: NewsletterEmail; dayOfYear: number };

    if (!email || dayOfYear === undefined) {
      return NextResponse.json({ error: 'Missing email or dayOfYear' }, { status: 400 });
    }

    // Get Firebase Admin instance
    const { db } = getFirebaseAdmin();

    // Save to newsletter collection with day number as document ID
    await db
      .collection('newsletter')
      .doc(`day-${dayOfYear}`)
      .set({
        dayOfYear,
        subject: email.subject,
        greeting: email.greeting,
        body: email.body,
        signoff: email.signoff,
        ps: email.ps || null,
        metadata: email.metadata || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    return NextResponse.json({
      success: true,
      documentId: `day-${dayOfYear}`,
      message: `Saved email for day ${dayOfYear}`,
    });
  } catch (error) {
    console.error('Error saving newsletter:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to save newsletter email',
      },
      { status: 500 }
    );
  }
}

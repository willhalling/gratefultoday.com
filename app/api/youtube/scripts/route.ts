import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitCount = parseInt(searchParams.get('limit') || '50');

    const { db } = getFirebaseAdmin();

    const snapshot = await db
      .collection('youtubeScripts')
      .orderBy('createdAt', 'desc')
      .limit(limitCount)
      .get();
    const scripts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate().toISOString(),
    }));

    return NextResponse.json({ scripts });
  } catch (error) {
    console.error('Failed to fetch scripts:', error);
    return NextResponse.json({ error: 'Failed to fetch scripts' }, { status: 500 });
  }
}

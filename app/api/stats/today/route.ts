import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

export const revalidate = 30; // Cache for 30 seconds

export async function GET() {
  try {
    const { db } = getFirebaseAdmin();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get recent posts ordered by createdAt (no where clause to avoid index requirement)
    const postsRef = db.collection('gratitudePosts');
    const snapshot = await postsRef
      .orderBy('createdAt', 'desc')
      .limit(100) // Get recent 100 posts
      .get();

    // Count posts from today that are not archived
    let count = 0;
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Skip archived posts
      if (data.isArchived === true) {
        return;
      }
      
      let createdAt;
      
      // Handle Firestore Timestamp or Date object
      if (data.createdAt?._seconds) {
        createdAt = new Date(data.createdAt._seconds * 1000);
      } else if (data.createdAt?.toDate) {
        createdAt = data.createdAt.toDate();
      } else if (data.createdAt) {
        createdAt = new Date(data.createdAt);
      }
      
      if (createdAt && createdAt >= today) {
        count++;
      }
    });

    console.log('Today stats:', { count, today: today.toISOString(), totalDocs: snapshot.docs.length });

    return NextResponse.json({ 
      count,
      date: today.toISOString()
    });
  } catch (error) {
    console.error('Error fetching today stats:', error);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}

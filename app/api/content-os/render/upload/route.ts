import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Allow up to ~500 MB body (browser-rendered 9:16 videos can be large)
export const maxDuration = 60;

const COLLECTION = 'contentOsPosts';

export async function POST(request: NextRequest) {
  let postId: string | undefined;
  let videoBuffer: Buffer;

  try {
    const formData = await request.formData();
    postId = (formData.get('postId') as string | null)?.trim() || undefined;
    const file = formData.get('video') as File | null;

    if (!postId) {
      return NextResponse.json({ error: 'postId is required.' }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: 'video file is required.' }, { status: 400 });
    }

    videoBuffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  try {
    const { db, storage } = getFirebaseAdmin();

    // Verify the post exists before uploading.
    const postRef = db.collection(COLLECTION).doc(postId);
    const snapshot = await postRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    // Upload to Storage — fixed filename so re-renders replace the previous file.
    const bucket = storage.bucket('grateful-today-761f2.appspot.com');
    const destination = `content-os-renders/${postId}/latest.mp4`;
    const fileRef = bucket.file(destination);

    await fileRef.save(videoBuffer, {
      contentType: 'video/mp4',
      metadata: { cacheControl: 'public, max-age=0, must-revalidate' },
    });
    await fileRef.makePublic();

    const renderedAt = new Date().toISOString();
    const renderUrl = `https://storage.googleapis.com/${bucket.name}/${destination}?v=${encodeURIComponent(renderedAt)}`;

    await postRef.update({
      status: 'rendered',
      renderUrl,
      renderedAt,
      updatedAt: renderedAt,
    });

    return NextResponse.json({ renderUrl, renderedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

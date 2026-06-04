import { NextRequest, NextResponse } from 'next/server';
import { getRenderProgress } from '@remotion/lambda/client';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import type { AwsRegion } from '@remotion/lambda/client';
import type { ContentOsPost } from '@/types/content-os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PostWithLambda extends ContentOsPost {
  lambdaRenderId?: string;
  lambdaBucketName?: string;
  lambdaRegion?: string;
  lambdaFunctionName?: string;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ postId: string }> }
) {
  const { postId } = await context.params;
  const { db } = getFirebaseAdmin();
  const postRef = db.collection('contentOsPosts').doc(postId);
  const snapshot = await postRef.get();
  if (!snapshot.exists) {
    return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
  }
  const post = { id: snapshot.id, ...snapshot.data() } as PostWithLambda;

  if (!post.lambdaRenderId || !post.lambdaBucketName || !post.lambdaRegion || !post.lambdaFunctionName) {
    return NextResponse.json({ error: 'No active Lambda render for this post.' }, { status: 404 });
  }

  try {
    const progress = await getRenderProgress({
      renderId: post.lambdaRenderId,
      bucketName: post.lambdaBucketName,
      functionName: post.lambdaFunctionName,
      region: post.lambdaRegion as AwsRegion,
    });

    if (progress.fatalErrorEncountered) {
      const message = progress.errors[0]?.message || 'Lambda render failed.';
      await postRef.update({ status: 'render_failed', updatedAt: new Date().toISOString() });
      return NextResponse.json({ done: true, error: message, progress: progress.overallProgress });
    }

    if (progress.done && progress.outputFile) {
      const renderedAt = new Date().toISOString();
      await postRef.update({
        status: 'rendered',
        renderUrl: progress.outputFile,
        renderedAt,
        updatedAt: renderedAt,
      });
      return NextResponse.json({ done: true, renderUrl: progress.outputFile, progress: 1 });
    }

    return NextResponse.json({
      done: false,
      progress: progress.overallProgress,
      framesEncoded: progress.encodingStatus?.framesEncoded ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Progress check failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { renderMediaOnLambda } from '@remotion/lambda/client';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { computeDurationInFrames } from '@/remotion/gratitude/constants';
import { backgroundKind } from '@/lib/content-os/backgroundKind';
import type { ContentOsPost } from '@/types/content-os';
import type { GratitudePostProps } from '@/remotion/gratitude/constants';
import type { AwsRegion } from '@remotion/lambda/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function postToInputProps(post: ContentOsPost): GratitudePostProps {
  const beats = [post.beat1, post.beat2, post.beat3, post.beat4]
    .map((b) => (b ?? '').trim())
    .filter(Boolean);
  const props: GratitudePostProps = { beats };
  if (post.headlineWord?.trim()) props.headlineWord = post.headlineWord.trim();
  if (post.background) {
    const url = post.background.trim();
    props.background = { url, kind: backgroundKind(url) };
  }
  if (post.music) props.music = { url: post.music.trim() };
  return props;
}

function getLambdaConfig() {
  const region = process.env.REMOTION_AWS_REGION as AwsRegion | undefined;
  const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME;
  const serveUrl = process.env.REMOTION_SITE_URL;
  if (!region || !functionName || !serveUrl) {
    throw new Error(
      'Missing Remotion Lambda env: REMOTION_AWS_REGION, REMOTION_LAMBDA_FUNCTION_NAME, REMOTION_SITE_URL.'
    );
  }
  return { region, functionName, serveUrl };
}

export async function POST(request: NextRequest) {
  let body: { postId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!body.postId) {
    return NextResponse.json({ error: 'postId is required.' }, { status: 400 });
  }

  let config;
  try {
    config = getLambdaConfig();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  const { db } = getFirebaseAdmin();
  const postRef = db.collection('contentOsPosts').doc(body.postId);
  const snapshot = await postRef.get();
  if (!snapshot.exists) {
    return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
  }
  const post = { id: snapshot.id, ...snapshot.data() } as ContentOsPost;

  const inputProps = postToInputProps(post);
  if (!inputProps.beats.length) {
    return NextResponse.json({ error: 'Post has no beats to render.' }, { status: 400 });
  }

  try {
    const result = await renderMediaOnLambda({
      region: config.region,
      functionName: config.functionName,
      serveUrl: config.serveUrl,
      composition: 'GratitudePost',
      inputProps,
      codec: 'h264',
      privacy: 'public',
      forceDurationInFrames: computeDurationInFrames(inputProps.beats, inputProps.headlineWord),
      downloadBehavior: { type: 'play-in-browser' },
    });

    const renderRecord = {
      lambdaRenderId: result.renderId,
      lambdaBucketName: result.bucketName,
      lambdaRegion: config.region,
      lambdaFunctionName: config.functionName,
      lambdaCloudWatchLogs: result.cloudWatchLogs ?? null,
    };

    await postRef.update({
      status: 'rendering',
      ...renderRecord,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json(renderRecord);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lambda render failed.';
    await postRef.update({ status: 'render_failed', updatedAt: new Date().toISOString() });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { getAdminApp } from '@/lib/firebase-admin';
import { computeDurationInFrames } from '@/remotion/gratitude/constants';
import type { ContentOsPost } from '@/types/content-os';
import type { GratitudePostProps } from '@/remotion/gratitude/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

let bundlePromise: Promise<string> | null = null;

function getBundle(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = bundle({
      entryPoint: path.join(process.cwd(), 'remotion', 'index.tsx'),
      // Skip webpack overrides — keep default config so it picks up tsconfig paths.
      webpackOverride: (config) => config,
    });
  }
  return bundlePromise;
}

function postToInputProps(post: ContentOsPost): GratitudePostProps {
  const beats = [post.beat1, post.beat2, post.beat3, post.beat4]
    .map((b) => (b ?? '').trim())
    .filter(Boolean);

  const props: GratitudePostProps = { beats };

  if (post.background) {
    const url = post.background.trim();
    const isVideo = /\.(mp4|mov|m4v|webm|mkv)$/i.test(url);
    props.background = { url, kind: isVideo ? 'video' : 'image' };
  }

  if (post.music) {
    props.music = { url: post.music.trim() };
  }

  return props;
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

  const { db, storage } = getAdminApp();
  const postRef = db.collection('content_os_posts').doc(body.postId);
  const snapshot = await postRef.get();
  if (!snapshot.exists) {
    return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
  }
  const post = { id: snapshot.id, ...snapshot.data() } as ContentOsPost;

  const inputProps = postToInputProps(post);
  if (!inputProps.beats.length) {
    return NextResponse.json({ error: 'Post has no beats to render.' }, { status: 400 });
  }

  await postRef.update({ status: 'rendering', updatedAt: new Date().toISOString() });

  const tmpFile = path.join(os.tmpdir(), `gratitude-${randomUUID()}.mp4`);
  try {
    const serveUrl = await getBundle();
    const composition = await selectComposition({
      serveUrl,
      id: 'GratitudePost',
      inputProps,
    });

    await renderMedia({
      composition: {
        ...composition,
        durationInFrames: computeDurationInFrames(inputProps.beats),
      },
      serveUrl,
      codec: 'h264',
      outputLocation: tmpFile,
      inputProps,
    });

    const bucket = storage.bucket();
    const destination = `content-os-renders/${post.id}/${Date.now()}.mp4`;
    await bucket.upload(tmpFile, {
      destination,
      contentType: 'video/mp4',
      metadata: { cacheControl: 'public, max-age=3600' },
    });

    const file = bucket.file(destination);
    await file.makePublic();
    const renderUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;

    const renderedAt = new Date().toISOString();
    await postRef.update({
      status: 'rendered',
      renderUrl,
      renderedAt,
      updatedAt: renderedAt,
    });

    return NextResponse.json({ renderUrl, renderedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Render failed.';
    await postRef.update({ status: 'render_failed', updatedAt: new Date().toISOString() });
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    fs.unlink(tmpFile).catch(() => undefined);
  }
}

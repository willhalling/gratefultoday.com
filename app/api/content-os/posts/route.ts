import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import {
  CONTENT_OS_CATEGORIES,
  CONTENT_OS_STATUS,
  CONTENT_OS_TOPICS,
  type ContentOsPost,
  type ContentOsPostInput,
} from '@/types/content-os';

const COLLECTION = 'contentOsPosts';

function isCategory(value: string): boolean {
  return (CONTENT_OS_CATEGORIES as readonly string[]).includes(value);
}

function isTopic(value: string): boolean {
  return (CONTENT_OS_TOPICS as readonly string[]).includes(value);
}

function isStatus(value: string): boolean {
  return (CONTENT_OS_STATUS as readonly string[]).includes(value);
}

function validatePostInput(input: Partial<ContentOsPostInput>): string[] {
  const errors: string[] = [];

  if (!input.name?.trim()) errors.push('name is required');
  if (!input.category || !isCategory(input.category)) errors.push('category is invalid');
  if (!input.mainTopic || !isTopic(input.mainTopic)) errors.push('mainTopic is invalid');
  if (!input.secondaryTopic || !isTopic(input.secondaryTopic)) {
    errors.push('secondaryTopic is invalid');
  }
  if (!input.beat1?.trim()) errors.push('beat1 is required');
  if (!input.beat2?.trim()) errors.push('beat2 is required');
  if (!input.status || !isStatus(input.status)) errors.push('status is invalid');
  if (typeof input.score !== 'number' || Number.isNaN(input.score)) errors.push('score is invalid');

  const beats = [input.beat1, input.beat2, input.beat3, input.beat4]
    .map((v) => (v || '').trim())
    .filter(Boolean);
  if (beats.length < 2 || beats.length > 4) {
    errors.push('beats must contain 2-4 non-empty values');
  }

  return errors;
}

function normalizePost(raw: admin.firestore.DocumentData, id: string): ContentOsPost {
  const createdAt = raw.createdAt?.toDate?.() ?? new Date();
  const updatedAt = raw.updatedAt?.toDate?.() ?? new Date();
  return {
    id,
    name: raw.name || '',
    category: raw.category,
    mainTopic: raw.mainTopic,
    secondaryTopic: raw.secondaryTopic,
    beat1: raw.beat1 || '',
    beat2: raw.beat2 || '',
    beat3: raw.beat3 || '',
    beat4: raw.beat4 || '',
    description: raw.description || '',
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    status: raw.status,
    score: Number(raw.score || 0),
    notes: raw.notes || '',
    background: raw.background || '',
    music: raw.music || '',
    renderUrl: raw.renderUrl || undefined,
    renderedAt: raw.renderedAt || undefined,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { db } = getFirebaseAdmin();
    const { searchParams } = new URL(request.url);

    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const category = (searchParams.get('category') || '').trim();
    const topic = (searchParams.get('topic') || '').trim();
    const status = (searchParams.get('status') || '').trim();
    const sort = (searchParams.get('sort') || 'created').trim();

    const orderField = sort === 'updated' ? 'updatedAt' : 'createdAt';
    const snapshot = await db.collection(COLLECTION).orderBy(orderField, 'desc').limit(500).get();

    let posts = snapshot.docs.map((doc) => normalizePost(doc.data(), doc.id));

    if (category && isCategory(category)) {
      posts = posts.filter((post) => post.category === category);
    }
    if (topic && isTopic(topic)) {
      posts = posts.filter((post) => post.mainTopic === topic || post.secondaryTopic === topic);
    }
    if (status && isStatus(status)) {
      posts = posts.filter((post) => post.status === status);
    }
    if (search) {
      posts = posts.filter((post) => {
        const haystack = [post.name, post.beat1, post.beat2, post.beat3 || '', post.beat4 || '']
          .join(' ')
          .toLowerCase();
        return haystack.includes(search);
      });
    }

    if (sort === 'score') {
      posts = [...posts].sort((a, b) => b.score - a.score);
    } else if (sort === 'updated') {
      posts = [...posts].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    } else {
      posts = [...posts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Content OS list error:', error);
    return NextResponse.json({ error: 'Failed to list posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as Partial<ContentOsPostInput>;
    const errors = validatePostInput(payload);
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    const { db } = getFirebaseAdmin();
    const now = admin.firestore.FieldValue.serverTimestamp();

    const docRef = await db.collection(COLLECTION).add({
      name: payload.name?.trim(),
      category: payload.category,
      mainTopic: payload.mainTopic,
      secondaryTopic: payload.secondaryTopic,
      beat1: payload.beat1?.trim(),
      beat2: payload.beat2?.trim(),
      beat3: payload.beat3?.trim() || '',
      beat4: payload.beat4?.trim() || '',
      description: payload.description?.trim() || '',
      tags: (payload.tags || []).map((tag) => tag.trim()).filter(Boolean),
      status: payload.status,
      score: Number(payload.score || 0),
      notes: payload.notes?.trim() || '',
      background: payload.background?.trim() || '',
      music: payload.music?.trim() || '',
      createdAt: now,
      updatedAt: now,
    });

    const created = await docRef.get();
    return NextResponse.json({ post: normalizePost(created.data(), created.id) }, { status: 201 });
  } catch (error) {
    console.error('Content OS create error:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}

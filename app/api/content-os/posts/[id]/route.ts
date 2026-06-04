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

function validatePatch(payload: Partial<ContentOsPostInput>) {
  const errors: string[] = [];
  if (payload.category && !isCategory(payload.category)) errors.push('category is invalid');
  if (payload.mainTopic && !isTopic(payload.mainTopic)) errors.push('mainTopic is invalid');
  if (payload.secondaryTopic && !isTopic(payload.secondaryTopic)) errors.push('secondaryTopic is invalid');
  if (payload.status && !isStatus(payload.status)) errors.push('status is invalid');
  if (payload.score !== undefined && (typeof payload.score !== 'number' || Number.isNaN(payload.score))) {
    errors.push('score is invalid');
  }
  return errors;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = getFirebaseAdmin();
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    return NextResponse.json({ post: normalizePost(doc.data(), doc.id) });
  } catch (error) {
    console.error('Content OS get error:', error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = (await request.json()) as Partial<ContentOsPostInput>;
    const errors = validatePatch(payload);
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    const { db } = getFirebaseAdmin();
    const docRef = db.collection(COLLECTION).doc(id);
    const existing = await docRef.get();
    if (!existing.exists) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const updatable: Array<keyof ContentOsPostInput> = [
      'name',
      'category',
      'mainTopic',
      'secondaryTopic',
      'beat1',
      'beat2',
      'beat3',
      'beat4',
      'description',
      'status',
      'score',
      'notes',
      'background',
      'music',
    ];

    for (const key of updatable) {
      const value = payload[key];
      if (value !== undefined) {
        if (typeof value === 'string') {
          updateData[key] = value.trim();
        } else {
          updateData[key] = value;
        }
      }
    }

    if (payload.tags !== undefined) {
      updateData.tags = (payload.tags || []).map((tag) => tag.trim()).filter(Boolean);
    }

    // renderUrl / renderedAt may be written directly by the client-side render path.
    const body = payload as Record<string, unknown>;
    if (typeof body.renderUrl === 'string' && body.renderUrl.trim()) {
      updateData.renderUrl = body.renderUrl.trim();
      updateData.renderedAt = new Date().toISOString();
    }

    await docRef.update(updateData);
    const updated = await docRef.get();

    return NextResponse.json({ post: normalizePost(updated.data(), updated.id) });
  } catch (error) {
    console.error('Content OS update error:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = getFirebaseAdmin();
    await db.collection(COLLECTION).doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Content OS delete error:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}

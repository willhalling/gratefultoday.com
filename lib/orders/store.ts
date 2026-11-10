import 'server-only';
import { createHash } from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import type { Occasion } from '@/lib/product';
import type { OrderStatus, RecoveryAnswers, Script, ThanksAnswers } from './types';

const ORDERS = 'videoOrders';
const RATE_LIMITS = 'rateLimits';

export interface OrderDoc {
  occasion: Occasion;
  status: OrderStatus;
  email: string;
  answers: ThanksAnswers | RecoveryAnswers;
  /** The model's latest script. */
  generated: Script | null;
  /** What the buyer approved (may be edited). */
  approved: Script | null;
  /** Why the order is held or declined (internal). */
  reviewReason: string | null;
  generations: number;
  /** Production (production.ts). */
  narrationPath?: string | null;
  narrationSeconds?: number | null;
  renderId?: string | null;
  renderProgress?: number | null;
  videoPath?: string | null;
  productionError?: string | null;
  readyAt?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  approvedAt: Timestamp | null;
}

/** What the buyer's browser may see. No email, no internal reasons. */
export interface PublicOrder {
  id: string;
  occasion: Occasion;
  status: OrderStatus;
  recipientName: string;
  script: Script | null;
  generationsLeft: number;
  /** 0–100 while WaveCanvas renders. */
  renderProgress: number | null;
}

const db = () => getFirebaseAdmin().db;

export async function createOrder(data: Omit<OrderDoc, 'createdAt' | 'updatedAt' | 'approvedAt'>): Promise<string> {
  const ref = await db()
    .collection(ORDERS)
    .add({ ...data, approvedAt: null, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  return ref.id;
}

export async function getOrder(id: string): Promise<OrderDoc | null> {
  if (!/^[A-Za-z0-9]{20}$/.test(id)) return null;
  const snap = await db().collection(ORDERS).doc(id).get();
  return snap.exists ? (snap.data() as OrderDoc) : null;
}

export async function updateOrder(id: string, data: Partial<Omit<OrderDoc, 'createdAt' | 'updatedAt'>>) {
  await db()
    .collection(ORDERS)
    .doc(id)
    .update({ ...data, updatedAt: FieldValue.serverTimestamp() });
}

export function toPublic(id: string, order: OrderDoc, maxGenerations: number): PublicOrder {
  return {
    id,
    occasion: order.occasion,
    status: order.status,
    recipientName: order.answers.address_as || order.answers.recipient_name,
    script: order.status === 'script_ready' ? order.generated : order.approved,
    generationsLeft: Math.max(0, maxGenerations - order.generations),
    renderProgress: order.status === 'rendering' ? (order.renderProgress ?? null) : null,
  };
}

const bucket = () => getFirebaseAdmin().storage.bucket();

export async function saveFile(path: string, data: Buffer, contentType: string) {
  await bucket().file(path).save(data, { contentType, resumable: false, metadata: { cacheControl: 'private, max-age=0' } });
}

/** A time-limited link to a private file in our bucket. */
export async function signedUrl(path: string, hours = 24 * 7, download?: string): Promise<string> {
  const [url] = await bucket()
    .file(path)
    .getSignedUrl({
      action: 'read',
      expires: Date.now() + hours * 3_600_000,
      ...(download ? { responseDisposition: `attachment; filename="${download}"` } : {}),
    });
  return url;
}

/**
 * Fixed-window limit per key (e.g. IP or email) per hour or day, stored in
 * Firestore so it holds across serverless instances. Keys are hashed; no raw
 * IPs or emails are stored.
 */
export async function withinRateLimit(key: string, limit: number, window: 'hour' | 'day'): Promise<boolean> {
  const size = window === 'hour' ? 3_600_000 : 86_400_000;
  const slot = Math.floor(Date.now() / size);
  const id = createHash('sha256').update(`${key}:${window}:${slot}`).digest('hex').slice(0, 32);
  const ref = db().collection(RATE_LIMITS).doc(id);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = (snap.data()?.count as number | undefined) ?? 0;
    if (count >= limit) return false;
    tx.set(ref, { count: count + 1, expiresAt: Timestamp.fromMillis((slot + 2) * size) }, { merge: true });
    return true;
  });
}

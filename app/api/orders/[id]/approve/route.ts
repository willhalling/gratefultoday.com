/**
 * POST /api/orders/:id/approve: the buyer approves the script, with any edits.
 * Edited scripts are checked before they can be narrated.
 */
import type { NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { error, handle, json, readBody } from '@/lib/orders/http';
import { checkEditedScript } from '@/lib/orders/script';
import { getOrder, toPublic, updateOrder, type OrderDoc } from '@/lib/orders/store';
import { ApproveRequest, MAX_GENERATIONS, MAX_WORDS, wordCount } from '@/lib/orders/types';

export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const body = await readBody(req, ApproveRequest);
    if (!body.ok) return body.response;
    const { title, lines } = body.data;

    const order = await getOrder(id);
    if (!order) return error(404, 'We couldn’t find that order.');
    if (order.status !== 'script_ready' || !order.generated) return error(409, 'This script can’t be approved now.');
    if (wordCount(lines) > MAX_WORDS) {
      return error(400, `That’s a little long for a video. Please keep it under ${MAX_WORDS} words.`);
    }

    const edited =
      title !== order.generated.title ||
      lines.length !== order.generated.lines.length ||
      lines.some((l, i) => l !== order.generated!.lines[i]);

    let update: Partial<OrderDoc>;
    if (edited) {
      const check = await checkEditedScript(order.occasion, order.answers.recipient_name, title, lines);
      if (check.status !== 'ok') {
        update = { status: check.status, reviewReason: `Edited script: ${check.reason}`, approved: { ...order.generated, title, lines } };
        await updateOrder(id, update);
        console.warn(`Order ${id} ${check.status} after edit: ${check.reason}`);
        return json(toPublic(id, { ...order, ...update }, MAX_GENERATIONS));
      }
    }

    update = { status: 'approved', approved: { ...order.generated, title, lines }, approvedAt: Timestamp.now() };
    await updateOrder(id, update);
    return json(toPublic(id, { ...order, ...update }, MAX_GENERATIONS));
  });
}

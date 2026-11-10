/** POST /api/orders/:id/regenerate: write a new version, optionally following the buyer's note. */
import type { NextRequest } from 'next/server';
import { error, handle, json, readBody } from '@/lib/orders/http';
import { writeScript } from '@/lib/orders/script';
import { getOrder, toPublic, updateOrder, type OrderDoc } from '@/lib/orders/store';
import { MAX_GENERATIONS, RegenerateRequest } from '@/lib/orders/types';

export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const body = await readBody(req, RegenerateRequest);
    if (!body.ok) return body.response;

    const order = await getOrder(id);
    if (!order) return error(404, 'We couldn’t find that order.');
    if (order.status !== 'script_ready') return error(409, 'This script can’t be changed any more.');
    if (order.generations >= MAX_GENERATIONS) {
      return error(429, 'You’ve used all your new versions. You can still edit the lines yourself.');
    }

    const outcome = await writeScript(order.occasion, order.answers, { changeRequest: body.data.note || undefined });
    const update: Partial<OrderDoc> =
      outcome.status === 'ok'
        ? { generated: outcome.script, generations: order.generations + 1 }
        : { status: outcome.status, reviewReason: outcome.reason, generations: order.generations + 1 };
    await updateOrder(id, update);
    if (outcome.status !== 'ok') console.warn(`Order ${id} ${outcome.status} on regenerate: ${outcome.reason}`);

    return json(toPublic(id, { ...order, ...update }, MAX_GENERATIONS));
  });
}

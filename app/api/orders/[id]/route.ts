/** GET /api/orders/:id: the order as the buyer may see it. */
import type { NextRequest } from 'next/server';
import { error, handle, json } from '@/lib/orders/http';
import { getOrder, toPublic } from '@/lib/orders/store';
import { MAX_GENERATIONS } from '@/lib/orders/types';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const order = await getOrder(id);
    if (!order) return error(404, 'We couldn’t find that order.');
    return json(toPublic(id, order, MAX_GENERATIONS));
  });
}

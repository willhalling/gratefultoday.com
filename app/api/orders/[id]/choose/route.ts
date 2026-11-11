/** POST /api/orders/:id/choose: the buyer picks the look for their video. */
import { after, type NextRequest } from 'next/server';
import { isLook } from '@/lib/looks';
import { chooseLook } from '@/lib/orders/production';
import { error, handle, json, readBody } from '@/lib/orders/http';
import { getOrder, toPublic } from '@/lib/orders/store';
import { ChooseRequest, MAX_GENERATIONS } from '@/lib/orders/types';

// Covers starting the full render.
export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const body = await readBody(req, ChooseRequest);
    if (!body.ok) return body.response;
    if (!isLook(body.data.look)) return error(400, 'That look isn’t one of the choices.');
    if (!(await getOrder(id))) return error(404, 'We couldn’t find that order.');
    const start = await chooseLook(id, body.data.look);
    if (!start) return error(409, 'That look can’t be chosen now.');
    after(start);
    return json(toPublic(id, (await getOrder(id))!, MAX_GENERATIONS));
  });
}

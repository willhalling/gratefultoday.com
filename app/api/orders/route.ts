/** POST /api/orders: save the buyer's answers and write the first script. */
import type { NextRequest } from 'next/server';
import { clientIp, error, handle, json, readBody } from '@/lib/orders/http';
import { writeScript } from '@/lib/orders/script';
import { createOrder, toPublic, withinRateLimit, type OrderDoc } from '@/lib/orders/store';
import { MAX_GENERATIONS, NewOrderRequest } from '@/lib/orders/types';
import { FREE_VIDEOS_PER_EMAIL_PER_DAY, isFree } from '@/lib/product';

export const maxDuration = 60;

const ORDERS_PER_IP_PER_HOUR = 8;

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = await readBody(req, NewOrderRequest);
    if (!body.ok) return body.response;
    const { occasion, answers } = body.data;

    if (!(await withinRateLimit(`order:${clientIp(req)}`, ORDERS_PER_IP_PER_HOUR, 'hour'))) {
      return error(429, 'You’ve started a lot of videos in the last hour. Please try again a little later.');
    }
    if (
      isFree() &&
      !(await withinRateLimit(`email:${answers.email.toLowerCase()}`, FREE_VIDEOS_PER_EMAIL_PER_DAY, 'day'))
    ) {
      return error(
        429,
        `While videos are free, each email address can make ${FREE_VIDEOS_PER_EMAIL_PER_DAY} a day. Please come back tomorrow.`,
      );
    }

    const outcome = await writeScript(occasion, answers);

    const order: Omit<OrderDoc, 'createdAt' | 'updatedAt' | 'approvedAt'> = {
      occasion,
      email: answers.email,
      answers,
      generations: 1,
      approved: null,
      ...(outcome.status === 'ok'
        ? { status: 'script_ready', generated: outcome.script, reviewReason: null }
        : { status: outcome.status, generated: null, reviewReason: outcome.reason }),
    };
    const id = await createOrder(order);
    if (outcome.status !== 'ok') console.warn(`Order ${id} ${outcome.status}: ${outcome.reason}`);

    return json(toPublic(id, order as OrderDoc, MAX_GENERATIONS), 201);
  });
}

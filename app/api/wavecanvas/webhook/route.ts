/** POST /api/wavecanvas/webhook: WaveCanvas tells us a render finished. */
import type { NextRequest } from 'next/server';
import { error, json } from '@/lib/orders/http';
import { applyRender } from '@/lib/orders/production';
import { verifyWebhook, type Render } from '@/lib/wavecanvas';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyWebhook(raw, req.headers.get('wavecanvas-signature'))) return error(401, 'Bad signature.');

  const event = JSON.parse(raw) as { type?: string; data?: Render };
  const orderId = event.data?.metadata?.orderId;
  if (event.type === 'test' || !event.data || !orderId) return json({ received: true });

  try {
    await applyRender(orderId, event.data);
  } catch (err) {
    console.error('[wavecanvas webhook]', err);
    // A 5xx makes WaveCanvas retry; the order page polls as a fallback too.
    return error(500, 'Could not process the render.');
  }
  return json({ received: true });
}

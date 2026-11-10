import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { narrate } from '@/lib/narration';
import { createRender, getRender, templateFor, type Render } from '@/lib/wavecanvas';
import { getOrder, saveFile, signedUrl, updateOrder } from './store';

/**
 * Turns an approved order into a video:
 *   approved → narrating (ElevenLabs) → rendering (WaveCanvas) → ready | failed
 * WaveCanvas reports back by webhook (/api/wavecanvas/webhook); the order
 * page also polls it via syncRender, so local dev (no public webhook) works.
 */

const fail = async (id: string, step: string, err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[production] order ${id} failed at ${step}:`, message);
  await updateOrder(id, { status: 'failed', productionError: `${step}: ${message}`.slice(0, 1000) });
};

export async function startProduction(id: string, origin: string): Promise<void> {
  const order = await getOrder(id);
  if (!order || order.status !== 'approved' || !order.approved) return;
  const script = order.approved;
  await updateOrder(id, { status: 'narrating', productionError: null });

  let narrationPath: string;
  let song: { audioUrl: string; duration: number; words: { word: string; start: number; end: number }[]; lines: string[] };
  try {
    const narration = await narrate(script.lines, {
      names: [order.answers.recipient_name, order.answers.address_as].filter(Boolean),
      sayAs: order.answers.name_pronunciation || undefined,
    });
    narrationPath = `orders/${id}/narration.mp3`;
    await saveFile(narrationPath, narration.audio, 'audio/mpeg');
    song = {
      // WaveCanvas copies it when the render is created, so a short link is enough.
      audioUrl: await signedUrl(narrationPath, 2),
      duration: narration.duration,
      words: narration.words,
      lines: script.lines,
    };
    await updateOrder(id, { narrationPath, narrationSeconds: narration.duration });
  } catch (err) {
    return fail(id, 'narration', err);
  }

  try {
    const render = await createRender({
      videoId: templateFor(script.visualMood),
      title: script.title,
      song,
      // WaveCanvas only calls public https URLs; locally the order page polls instead.
      ...(origin.startsWith('https://') ? { webhookUrl: `${origin}/api/wavecanvas/webhook` } : {}),
      metadata: { orderId: id, occasion: order.occasion },
    });
    await updateOrder(id, { status: 'rendering', renderId: render.id, renderProgress: render.progress ?? 0 });
  } catch (err) {
    return fail(id, 'render', err);
  }
}

/** Brings an order up to date with its WaveCanvas render (from the webhook or a poll). */
export async function applyRender(id: string, render: Render): Promise<void> {
  const order = await getOrder(id);
  if (!order || order.status !== 'rendering' || order.renderId !== render.id) return;

  if (render.status === 'queued' || render.status === 'rendering') {
    if ((render.progress ?? 0) !== (order.renderProgress ?? 0)) await updateOrder(id, { renderProgress: render.progress ?? 0 });
    return;
  }
  if (render.status === 'failed' || !render.url) {
    return fail(id, 'render', render.error ?? 'WaveCanvas reported a failed render.');
  }

  // WaveCanvas doesn't keep renders for long: copy the MP4 to our storage.
  try {
    const res = await fetch(render.url, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`Downloading the MP4 returned ${res.status}.`);
    const videoPath = `orders/${id}/video.mp4`;
    await saveFile(videoPath, Buffer.from(await res.arrayBuffer()), 'video/mp4');
    await updateOrder(id, { status: 'ready', videoPath, renderProgress: 100, readyAt: FieldValue.serverTimestamp() as never });
  } catch (err) {
    return fail(id, 'saving the video', err);
  }
}

/** Polls WaveCanvas for an order that's rendering. Safe to call often. */
export async function syncRender(id: string): Promise<void> {
  const order = await getOrder(id);
  if (!order || order.status !== 'rendering' || !order.renderId) return;
  try {
    await applyRender(id, await getRender(order.renderId));
  } catch (err) {
    console.error(`[production] polling render for order ${id}:`, err);
  }
}

import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { narrate } from '@/lib/narration';
import { baseVideo, lookChanges, lookChoices, type LookName } from '@/lib/looks';
import { createRender, getRender, type Render, type RenderSong } from '@/lib/wavecanvas';
import { getOrder, saveFile, signedUrl, updateOrder, updateOrderTx, type OrderDoc } from './store';
import type { Preview } from './types';

/**
 * Turns an approved order into a video:
 *   approved → narrating (ElevenLabs)
 *   → previewing (WaveCanvas renders a short clip in each of four looks)
 *   → choosing (the buyer picks one; they may pick as soon as it's ready)
 *   → rendering (the full video in that look) → ready | failed
 * WaveCanvas reports back by webhook (/api/wavecanvas/webhook); the order
 * page also polls it via syncRender, so local dev (no public webhook) works.
 */

/** Seconds of each preview clip, ending just after the closing line. */
const CLIP_SECONDS = 6;

const fail = async (id: string, step: string, err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[production] order ${id} failed at ${step}:`, message);
  await updateOrder(id, { status: 'failed', productionError: `${step}: ${message}`.slice(0, 1000) });
};

/** WaveCanvas only calls public https URLs; locally the order page polls instead. */
const webhook = (origin: string) => (origin.startsWith('https://') ? { webhookUrl: `${origin}/api/wavecanvas/webhook` } : {});

async function songFor(order: OrderDoc): Promise<RenderSong> {
  if (!order.narrationPath || !order.narrationWords || !order.narrationSeconds || !order.approved) {
    throw new Error('The order has no narration yet.');
  }
  return {
    // WaveCanvas copies it when the render is created, so a short link is enough.
    audioUrl: await signedUrl(order.narrationPath, 2),
    duration: order.narrationSeconds,
    words: order.narrationWords,
    lines: order.approved.lines,
  };
}

/** The part of the video each preview shows: the run-up to and the closing line. */
export function clipWindow(song: Pick<RenderSong, 'words' | 'lines' | 'duration'>): { start: number; end: number } {
  if (song.duration <= CLIP_SECONDS) return { start: 0, end: song.duration };
  const lastLineWords = song.lines[song.lines.length - 1].trim().split(/\s+/).length;
  const lastLineStart = song.words[Math.max(0, song.words.length - lastLineWords)]?.start ?? 0;
  const start = Math.min(Math.max(0, lastLineStart - 1.5), song.duration - CLIP_SECONDS);
  return { start, end: start + CLIP_SECONDS };
}

const renderInput = (order: OrderDoc, look: LookName, song: RenderSong) => ({
  videoId: baseVideo(look),
  title: order.approved!.title,
  subtitle: `From ${order.answers.sender_name}`,
  changes: lookChanges(look, song.lines.length),
  song,
});

export async function startProduction(id: string, origin: string): Promise<void> {
  let order = await getOrder(id);
  if (!order || order.status !== 'approved' || !order.approved) return;
  const script = order.approved;
  await updateOrder(id, { status: 'narrating', productionError: null, origin });

  try {
    const narration = await narrate(script.lines, {
      names: [order.answers.recipient_name, order.answers.address_as].filter(Boolean),
      sayAs: order.answers.name_pronunciation || undefined,
    });
    const narrationPath = `orders/${id}/narration.mp3`;
    await saveFile(narrationPath, narration.audio, 'audio/mpeg');
    const saved = { narrationPath, narrationSeconds: narration.duration, narrationWords: narration.words };
    await updateOrder(id, saved);
    order = { ...order, ...saved };
  } catch (err) {
    return fail(id, 'narration', err);
  }

  // A short clip in each look, all at once.
  const narrated = order;
  const looks = lookChoices(order.occasion, script);
  let previews: Preview[] = [];
  try {
    const song = await songFor(narrated);
    const { start, end } = clipWindow(song);
    const results = await Promise.allSettled(
      looks.map((look) =>
        createRender({
          ...renderInput(narrated, look, song),
          start,
          end,
          ...webhook(origin),
          metadata: { orderId: id, kind: 'preview', look },
        }),
      ),
    );
    previews = results.flatMap((r, i) => {
      if (r.status === 'fulfilled') return [{ look: looks[i], renderId: r.value.id, status: 'rendering' as const, clipPath: null }];
      console.error(`[production] order ${id}: preview in ${looks[i]} didn't start:`, r.reason);
      return [];
    });
  } catch (err) {
    console.error(`[production] order ${id}: previews didn't start:`, err);
  }

  // No previews means no choice to make: go straight to the best-guess look.
  if (!previews.length) return renderFinal(id, looks[0], origin);
  await updateOrder(id, { status: 'previewing', previews });
}

/** Renders the full video in a look. The order must already be marked 'rendering' with that look. */
async function renderFinal(id: string, look: LookName, origin: string): Promise<void> {
  try {
    const order = await getOrder(id);
    if (!order) return;
    const render = await createRender({
      ...renderInput(order, look, await songFor(order)),
      ...webhook(origin),
      metadata: { orderId: id, occasion: order.occasion, look },
    });
    await updateOrder(id, { status: 'rendering', look, renderId: render.id, renderProgress: render.progress ?? 0 });
  } catch (err) {
    return fail(id, 'render', err);
  }
}

/**
 * The buyer picked a look: claims it, then returns the work that starts the
 * full render (for after()), or null if it can't be chosen (not on offer,
 * not ready, or a look was already chosen).
 */
export async function chooseLook(id: string, look: LookName): Promise<(() => Promise<void>) | null> {
  let ok = false;
  const order = await updateOrderTx(id, (o) => {
    const ready = o.previews?.some((p) => p.look === look && p.status === 'ready');
    if (!ready || (o.status !== 'previewing' && o.status !== 'choosing')) return null;
    ok = true;
    return { status: 'rendering', look, renderId: null, renderProgress: 0 };
  });
  return ok && order ? () => renderFinal(id, look, order.origin ?? '') : null;
}

/** A preview render moved on: save the clip, and open the choice once they've all finished. */
async function applyPreview(id: string, render: Render): Promise<void> {
  if (render.status === 'queued' || render.status === 'rendering') return;

  let clipPath: string | null = null;
  if (render.status === 'succeeded' && render.url) {
    try {
      const res = await fetch(render.url, { signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Error(`Downloading the clip returned ${res.status}.`);
      clipPath = `orders/${id}/previews/${render.id}.mp4`;
      await saveFile(clipPath, Buffer.from(await res.arrayBuffer()), 'video/mp4');
    } catch (err) {
      console.error(`[production] order ${id}: saving preview ${render.id}:`, err);
      clipPath = null;
    }
  } else {
    console.error(`[production] order ${id}: preview ${render.id} failed:`, render.error);
  }

  let fallback: LookName | null = null;
  const order = await updateOrderTx(id, (o) => {
    const previews = o.previews ?? [];
    const i = previews.findIndex((p) => p.renderId === render.id);
    if (i < 0 || previews[i].status !== 'rendering') return null;
    const next = previews.map((p, j) =>
      j === i ? { ...p, status: clipPath ? ('ready' as const) : ('failed' as const), clipPath } : p,
    );
    if (o.status !== 'previewing') return { previews: next };
    const settled = next.every((p) => p.status !== 'rendering');
    if (!settled) return { previews: next };
    if (next.some((p) => p.status === 'ready')) return { previews: next, status: 'choosing' };
    // Every preview failed: make the video in the best-guess look anyway.
    fallback = next[0].look;
    return { previews: next, status: 'rendering', look: fallback, renderId: null, renderProgress: 0 };
  });
  if (fallback && order) await renderFinal(id, fallback, order.origin ?? '');
}

/** Brings an order up to date with a WaveCanvas render (from the webhook or a poll). */
export async function applyRender(id: string, render: Render): Promise<void> {
  const order = await getOrder(id);
  if (!order) return;
  if (order.previews?.some((p) => p.renderId === render.id)) return applyPreview(id, render);
  if (order.status !== 'rendering' || order.renderId !== render.id) return;

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

/** Polls WaveCanvas for an order's renders in flight. Safe to call often. */
export async function syncRender(id: string): Promise<void> {
  const order = await getOrder(id);
  if (!order) return;
  const ids =
    order.status === 'previewing'
      ? (order.previews ?? []).filter((p) => p.status === 'rendering').map((p) => p.renderId)
      : order.status === 'rendering' && order.renderId
        ? [order.renderId]
        : [];
  await Promise.all(
    ids.map(async (renderId) => {
      try {
        await applyRender(id, await getRender(renderId));
      } catch (err) {
        console.error(`[production] polling render ${renderId} for order ${id}:`, err);
      }
    }),
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AutoRefresh from '@/components/order/auto-refresh';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { syncRender } from '@/lib/orders/production';
import { getOrder, signedUrl, toPublic } from '@/lib/orders/store';
import { IN_PRODUCTION, MAX_GENERATIONS, type OrderStatus } from '@/lib/orders/types';

export const metadata: Metadata = { title: 'Your video — GratefulToday', robots: { index: false } };
export const dynamic = 'force-dynamic';

const STATUS_COPY: Record<OrderStatus, { heading: string; body: string }> = {
  approved: { heading: 'Making your video', body: 'Getting the narrator ready…' },
  narrating: { heading: 'Making your video', body: 'The narrator is reading your script…' },
  rendering: { heading: 'Making your video', body: 'Putting the words on screen in time with the voice…' },
  ready: { heading: 'Your video is ready', body: 'Watch it, download it, and send it whenever you’re ready.' },
  failed: {
    heading: 'Something went wrong',
    body: 'We couldn’t finish your video. We’ve been told, and we’ll email you when it’s fixed.',
  },
  script_ready: { heading: 'Your script is waiting', body: 'You haven’t approved this script yet.' },
  needs_review: {
    heading: 'We’re taking a look',
    body: 'A person on our team is reading this message before we make the video. We’ll email you, usually within a day.',
  },
  declined: {
    heading: 'We can’t make this one',
    body: 'GratefulToday videos are for sincere thank-yous and recovery celebrations, and this request doesn’t fit.',
  },
};

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getOrder(id))) notFound();
  // Catch up with WaveCanvas in case its webhook hasn't arrived (or can't, locally).
  await syncRender(id);
  const doc = (await getOrder(id))!;
  const order = toPublic(id, doc, MAX_GENERATIONS);
  const copy = STATUS_COPY[order.status];
  const working = IN_PRODUCTION.includes(order.status);

  const fileName = `${(order.script?.title ?? 'thank-you').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase()}.mp4`;
  const [videoUrl, downloadUrl] =
    order.status === 'ready' && doc.videoPath
      ? await Promise.all([signedUrl(doc.videoPath), signedUrl(doc.videoPath, 24 * 7, fileName)])
      : [null, null];

  return (
    <>
      <SiteHeader />
      {working && <AutoRefresh />}
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-ember">
          {order.occasion === 'recovery' ? 'Recovery video' : 'Thank-you video'} for {order.recipientName}
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-pine sm:text-4xl">{copy.heading}</h1>
        <p className="mt-3 text-lg text-muted">{copy.body}</p>

        {working && (
          <div className="mt-8">
            <div className="h-2 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-pine transition-all duration-700"
                style={{
                  width: `${order.status === 'rendering' ? Math.max(15, order.renderProgress ?? 15) : order.status === 'narrating' ? 8 : 3}%`,
                }}
              />
            </div>
            <p className="mt-2 text-sm text-muted">
              Usually a couple of minutes. You can leave this page open, or come back to this link later.
            </p>
          </div>
        )}

        {videoUrl && (
          <section className="mt-10">
            <video
              src={videoUrl}
              controls
              playsInline
              preload="metadata"
              className="mx-auto aspect-[9/16] w-full max-w-sm rounded-2xl bg-ink shadow-xl"
            />
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a
                href={downloadUrl!}
                className="rounded-full bg-pine px-7 py-3.5 font-semibold text-white transition hover:bg-pine-dark"
              >
                Download the video
              </a>
            </div>
          </section>
        )}

        {order.script && order.status !== 'script_ready' && order.status !== 'ready' && (
          <section className="mt-10 rounded-2xl border border-line bg-paper p-6 sm:p-8">
            <h2 className="text-xl font-semibold">{order.script.title}</h2>
            <div className="mt-5 space-y-1.5 font-serif text-lg leading-relaxed">
              {order.script.lines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </section>
        )}

        {order.status === 'script_ready' && (
          <p className="mt-8 text-muted">
            The review screen only lives in the browser tab where you started.{' '}
            <Link href="/create" className="font-semibold text-pine underline underline-offset-4">
              Start a new video
            </Link>
          </p>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

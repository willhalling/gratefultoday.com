import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { getOrder, toPublic } from '@/lib/orders/store';
import { MAX_GENERATIONS } from '@/lib/orders/types';

export const metadata: Metadata = { title: 'Your video — GratefulToday', robots: { index: false } };
export const dynamic = 'force-dynamic';

const STATUS_COPY = {
  approved: {
    heading: 'Script approved',
    body: 'Thank you. We’re getting your video ready and will email you the link as soon as it’s made.',
  },
  script_ready: {
    heading: 'Your script is waiting',
    body: 'You haven’t approved this script yet.',
  },
  needs_review: {
    heading: 'We’re taking a look',
    body: 'A person on our team is reading this message before we make the video. We’ll email you, usually within a day.',
  },
  declined: {
    heading: 'We can’t make this one',
    body: 'GratefulToday videos are for sincere thank-yous and recovery celebrations, and this request doesn’t fit.',
  },
} as const;

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await getOrder(id);
  if (!doc) notFound();
  const order = toPublic(id, doc, MAX_GENERATIONS);
  const copy = STATUS_COPY[order.status];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-ember">
          {order.occasion === 'recovery' ? 'Recovery video' : 'Thank-you video'} for {order.recipientName}
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-pine sm:text-4xl">{copy.heading}</h1>
        <p className="mt-3 text-lg text-muted">{copy.body}</p>

        {order.script && order.status === 'approved' && (
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

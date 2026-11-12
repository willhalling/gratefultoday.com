import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import {
  LAST_CHRISTMAS_ORDER,
  OCCASIONS,
  RECIPIENTS,
  RECOVERY_MILESTONES,
  VIDEO_LENGTH,
  formatPrice,
  isFree,
  isOffered,
} from '@/lib/product';

const SAMPLE_LINES = [
  'Mrs Patel,',
  'this year you learned',
  'every child’s name by Friday.',
  'Amara still talks about',
  'the day you let her',
  'read to the whole class.',
  'Have a restful Christmas.',
  'With love, everyone in Year 4.',
];

const STEPS = [
  {
    title: 'Tell us about them',
    body: 'Who it’s for, why you’re grateful, and a moment or habit only they would recognise. Two minutes, on your phone.',
  },
  {
    title: 'Approve every word',
    body: 'We write a short script from your answers. Change anything you like. Nothing is made until you’re happy with it.',
  },
  {
    title: 'Send it',
    body: 'A warm voice reads it while each line appears on screen. You get a private link to share, plus a download.',
  },
];

const FAQS = [
  ...(isFree()
    ? [
        {
          q: 'Is it really free?',
          a: 'Yes, while we’re launching. No card, no account. We just ask for an email address so we can send you the video.',
        },
      ]
    : []),
  {
    q: 'How long is the video?',
    a: `${VIDEO_LENGTH}. Long enough to say something real, short enough to watch again.`,
  },
  {
    q: 'Can I change the script?',
    a: 'Yes. You see the full script before anything is made, and you can edit any line.',
  },
  {
    q: 'Whose voice is it?',
    a: 'A warm, natural-sounding AI narrator reads your words on your behalf. It never pretends to be you.',
  },
  {
    q: 'Can a whole class or team send one?',
    a: 'Yes. Sign it from “everyone in Year 4” or list the names, and we’ll include them at the end.',
  },
  {
    q: 'When do I need to order for Christmas?',
    a: `By ${LAST_CHRISTMAS_ORDER}. Videos are usually ready within minutes of approving the script.`,
  },
];

function PhonePreview() {
  return (
    <div className="relative mx-auto aspect-[9/16] w-64 overflow-hidden rounded-[2.25rem] border-[10px] border-ink bg-pine-dark shadow-2xl sm:w-72">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_85%,#d9a85b55,transparent_45%),radial-gradient(circle_at_75%_70%,#c8553d40,transparent_40%)]" />
      <div className="snowfall absolute inset-0" />
      <div className="relative flex h-full flex-col justify-center gap-1.5 px-6 text-center">
        {SAMPLE_LINES.map((line, i) => (
          <p
            key={line}
            className="kinetic-line font-serif text-lg leading-snug text-cream"
            style={{ animationDelay: `${i * 0.9}s` }}
          >
            {line}
          </p>
        ))}
      </div>
      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        <div className="flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1 text-[10px] uppercase tracking-widest text-cream/80">
          <span className="h-1.5 w-1.5 rounded-full bg-ember" /> Narrated
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 md:grid-cols-[1.1fr_1fr] md:py-24">
          <div>
            <p className="mb-4 inline-block rounded-full bg-paper px-3 py-1 text-sm font-medium text-ember ring-1 ring-line">
              Order by {LAST_CHRISTMAS_ORDER} for Christmas
            </p>
            <h1 className="text-4xl font-semibold leading-[1.1] text-pine sm:text-5xl md:text-6xl">
              A thank-you they’ll watch again and again.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted">
              A short narrated video, written from your own words, for the teacher, nurse or carer who made
              this year better. You approve every line before it’s made.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/create"
                className="rounded-full bg-pine px-7 py-3.5 text-center text-base font-semibold text-white shadow-sm transition hover:bg-pine-dark"
              >
                Make your video
              </Link>
              <p className="text-sm text-muted">
                {isFree() ? 'Free while we launch' : formatPrice()} · ready in minutes · no account needed
              </p>
            </div>
          </div>
          <PhonePreview />
        </section>

        {/* How it works */}
        <section className="border-y border-line bg-paper">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
            <h2 className="text-3xl font-semibold text-pine md:text-4xl">How it works</h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title}>
                  <span className="font-serif text-4xl text-gold">{i + 1}</span>
                  <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
                  <p className="mt-2 text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Who it's for */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <h2 className="text-3xl font-semibold text-pine md:text-4xl">Who will you thank?</h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RECIPIENTS.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/create?for=${r.slug}`}
                  className="block h-full rounded-2xl border border-line bg-paper p-6 transition hover:-translate-y-0.5 hover:border-pine/40 hover:shadow-md"
                >
                  <p className="font-serif text-xl font-semibold">{r.label}</p>
                  <p className="mt-1 text-muted">{r.line}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Recovery (only when offered: lib/product.ts OFFERED_OCCASIONS) */}
        {isOffered('recovery') && (
        <section className="border-y border-line bg-paper">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-20">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-ember">Recovery videos</p>
              <h2 className="mt-3 text-3xl font-semibold text-pine md:text-4xl">Every day counts. Tell them you noticed.</h2>
              <p className="mt-4 text-lg text-muted">
                {OCCASIONS.recovery.pitch} A short, private video from the people who love them, read in a calm
                voice, with every word approved by you.
              </p>
              <Link
                href={`/create?type=${OCCASIONS.recovery.slug}`}
                className="mt-8 inline-block rounded-full border border-pine px-6 py-3 font-semibold text-pine transition hover:bg-pine hover:text-white"
              >
                Make a recovery video
              </Link>
            </div>
            <ul className="flex flex-wrap gap-2">
              {RECOVERY_MILESTONES.filter((m) => m !== 'Another milestone').map((m) => (
                <li key={m} className="rounded-full bg-cream px-4 py-2 font-serif text-lg text-pine ring-1 ring-line">
                  {m}
                </li>
              ))}
            </ul>
          </div>
        </section>
        )}

        {/* Price */}
        <section className="bg-pine text-cream">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-3xl font-semibold md:text-4xl">
                {isFree() ? 'Free while we launch.' : 'One video, one price.'}
              </h2>
              <p className="mt-3 max-w-xl text-cream/80">
                {isFree()
                  ? `Make a ${VIDEO_LENGTH} narrated video, with a private link to share and an MP4 to keep. No card, no account.`
                  : `${formatPrice()} for a ${VIDEO_LENGTH} narrated video, a private link to share, and an MP4 to keep. No subscription.`}
              </p>
            </div>
            <Link
              href="/create"
              className="rounded-full bg-cream px-7 py-3.5 font-semibold text-pine transition hover:bg-white"
            >
              Start yours
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-20">
          <h2 className="text-3xl font-semibold text-pine md:text-4xl">Questions</h2>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {FAQS.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                  {f.q}
                  <span className="text-xl text-muted transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

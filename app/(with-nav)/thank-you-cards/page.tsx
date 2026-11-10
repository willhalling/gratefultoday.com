import type { Metadata } from 'next';
import Link from 'next/link';
import CardsSearchFilter from '@/components/sobriety-cards/cards-search-filter';

const title = 'Thank You Cards - Free Thank You Cards to Send Online | Grateful Today';
const description =
  'Send a free thank you card to a teacher, mum, friend, colleague or wedding guest. Bright photos and crayon stripes, or quiet black-and-white ones. Your own message, a link to share. No account, no email.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/thank-you-cards' },
  openGraph: {
    title,
    description,
    type: 'website',
    url: '/thank-you-cards',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Thank You Cards - Free Thank You Cards to Send Online',
    description,
  },
};

export default function ThankYouCardsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-neutral-900 mb-6 leading-tight">
            Thank You Cards
          </h1>
          <p className="text-xl text-neutral-600 max-w-4xl mx-auto mb-4 leading-relaxed">
            For the thank-you that might otherwise go unsaid. A teacher, your mum, a friend who
            showed up, or everyone who came to the wedding.
          </p>
          <p className="text-xl text-neutral-600 max-w-4xl mx-auto mb-4 leading-relaxed">
            Pick a card, make it yours, and send a link. It&apos;s free.
          </p>
        </div>

        <CardsSearchFilter collection="thank-you" />

        <div className="max-w-4xl mx-auto mt-16 space-y-12">
          <section className="bg-white/60 backdrop-blur-sm p-8 rounded-xl border border-neutral-200 shadow-sm">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">How it works</h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>
                Choose a card. Swap the photo, pick a lettering style, change the words on the
                front, or go for hand-drawn crayon stripes instead. Every card comes in two looks:
                colourful, or quiet black and white.
              </p>
              <p>
                Add who it&apos;s for and who it&apos;s from. Each card comes with a suggested
                message inside. Keep it, tweak it, or write your own.
              </p>
              <p>
                Then send the link by text, email or chat, or download the card as an image to
                print or post. When they open it, the card opens to your message.
              </p>
              <p>No account needed. No email to confirm.</p>
            </div>
          </section>

          <section className="bg-white/60 backdrop-blur-sm p-8 rounded-xl border border-neutral-200 shadow-sm">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Why say thank you</h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>
                Gratitude is what this whole site is about. A thank-you takes a minute to write and
                people remember it for years. The more specific, the better: name the thing they
                did and what it meant.
              </p>
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 mt-4">
                <p className="font-medium text-neutral-900 mb-2">Privacy matters:</p>
                <ul className="space-y-1 text-sm text-neutral-700">
                  <li>We don&apos;t track you.</li>
                  <li>We don&apos;t email you.</li>
                  <li>Your card is private unless you share the link.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="bg-white/60 backdrop-blur-sm p-8 rounded-xl border border-neutral-200 shadow-sm">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Celebrating a milestone?</h2>
            <p className="text-neutral-700 leading-relaxed">
              For recovery milestones, from 24 hours to 50 years, see our{' '}
              <Link
                href="/sobriety-cards"
                className="font-semibold text-neutral-900 underline underline-offset-4 hover:text-neutral-600 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                sobriety cards
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

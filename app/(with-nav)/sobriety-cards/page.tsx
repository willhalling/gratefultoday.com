import type { Metadata } from 'next';
import Link from 'next/link';
import CardsSearchFilter from '@/components/sobriety-cards/cards-search-filter';

const title = 'Sobriety Cards - Free Recovery Milestone Cards to Send | Grateful Today';
const description =
  'Send a free sobriety card for 24 hours, 30 days, 1 year and every milestone in between. Bright photos and crayon stripes, or quiet black-and-white ones. Your own message, a private link. No account, no email.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/sobriety-cards' },
  openGraph: {
    title,
    description,
    type: 'website',
    url: '/sobriety-cards',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sobriety Cards - Free Recovery Milestone Cards to Send',
    description,
  },
};

export default function SobrietyCardsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-neutral-900 mb-6 leading-tight">
            Sobriety Cards
          </h1>
          <p className="text-xl text-neutral-600 max-w-4xl mx-auto mb-4 leading-relaxed">
            A card for the days that count. Send one to a friend in fellowship, your sponsor, or
            someone you love who just hit a milestone.
          </p>
          <p className="text-xl text-neutral-600 max-w-4xl mx-auto mb-4 leading-relaxed">
            Add their name, write what you want to say, and send a link. That&apos;s it.
          </p>
        </div>

        <CardsSearchFilter />

        <div className="max-w-4xl mx-auto mt-16 space-y-12">
          <section className="bg-white/60 backdrop-blur-sm p-8 rounded-xl border border-neutral-200 shadow-sm">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">How it works</h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>
                Pick the card that fits. 24 hours. 90 days. Ten years. Or one of the everyday ones,
                like a thank you for your sponsor, or a card for starting over. Day one counts too.
              </p>
              <p>
                Add who it&apos;s for, and who it&apos;s from if you want. Each card comes with a
                suggested message inside. Keep it, change it, or write your own. Pick a photo and a
                lettering style, change the words on the front, or go for hand-drawn crayon
                stripes instead. Every card comes in two looks: colourful, or quiet black and white.
              </p>
              <p>
                When you&apos;re done, you get a link. Text it, email it, or download the card as an
                image. When they open it, the card opens to your message.
              </p>
              <p>
                The whole thing is free. No account needed. No email to confirm.
              </p>
            </div>
          </section>

          <section className="bg-white/60 backdrop-blur-sm p-8 rounded-xl border border-neutral-200 shadow-sm">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Who sees it</h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>
                Every card gets its own link. Nobody can find it unless you give it to them. The
                link doesn&apos;t say anything about sobriety, and search engines are asked not to
                index it.
              </p>
              <p>
                Recovery is personal, and a text preview can pop up on a lock screen where anyone
                can see it. So discreet previews are on by default: the preview just says
                &ldquo;Sam sent you a card&rdquo; with plain stripes. The milestone and your message
                only show once they open it. You can turn this off if they&apos;d love the full
                card in the preview.
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
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Want a coin instead?</h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>
                If you&apos;ve been to a meeting, you know about chips. Our{' '}
                <Link
                  href="/sobriety-chips"
                  className="font-semibold text-neutral-900 underline underline-offset-4 hover:text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  virtual sobriety chips
                </Link>{' '}
                mark the same milestones. Every milestone card links to its matching chip, so you
                can send both.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

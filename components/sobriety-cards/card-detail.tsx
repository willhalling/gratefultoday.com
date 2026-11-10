import type { Metadata } from "next";
import Link from "next/link";
import MilestoneFooter, {
  type MilestoneLink,
} from "@/components/milestone/milestone-footer";
import CardStudio from "@/components/sobriety-cards/card-studio";
import CardThumb from "@/components/sobriety-cards/card-thumb";
import {
  cardHref,
  getCardForMilestone,
  getCardSeoDescription,
  getCardSeoTitle,
  getCollection,
  getRelatedCards,
  getWritingTips,
  type SobrietyCard,
} from "@/lib/sobriety-card-data";
import {
  getMilestoneNeighbors,
  type SobrietyChip,
} from "@/lib/sobriety-milestones";

export function cardDetailMetadata(card: SobrietyCard | undefined): Metadata {
  if (!card) return { title: "Card Not Found | Grateful Today" };
  const title = getCardSeoTitle(card);
  const description = getCardSeoDescription(card);
  const url = cardHref(card);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, type: "website", url },
    twitter: { card: "summary_large_image", title, description },
  };
}

function nearbyCard(chip: SobrietyChip | null): MilestoneLink | null {
  if (!chip) return null;
  const card = getCardForMilestone(chip.id);
  return card ? { href: cardHref(card), title: card.title } : null;
}

export default function CardDetail({ card }: { card: SobrietyCard }) {
  const collection = getCollection(card);
  const writing = getWritingTips(card);
  const neighbors = card.milestone
    ? getMilestoneNeighbors(card.milestone)
    : { previous: null, next: null };
  const related = card.milestone ? [] : getRelatedCards(card);

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href={collection.basePath}
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-primary-800"
        >
          ← Back to all {collection.name.toLowerCase()}
        </Link>
        <header className="mb-8 mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">
            {collection.name}
          </p>
          <h1 className="mt-2 text-4xl font-bold text-neutral-900">
            {card.title}
          </h1>
          <p className="mt-2 text-lg text-neutral-600">
            Make it colourful, make it personal, then send the link.
          </p>
        </header>

        <CardStudio card={card} />

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-primary-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-neutral-900">
              Sending this to someone?
            </h2>
            <p className="mt-3 leading-relaxed text-neutral-700">
              {writing.intro}
            </p>
            <ul className="mt-4 space-y-2">
              {writing.tips.map((tip) => (
                <li
                  key={tip}
                  className="flex items-start gap-2 text-neutral-700"
                >
                  <span className="text-primary-700" aria-hidden="true">
                    •
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
            {card.milestone && (
              <Link
                href={`/sobriety-chips/${card.milestone}`}
                className="mt-5 inline-block font-semibold text-primary-800 underline underline-offset-4"
              >
                Make the matching chip →
              </Link>
            )}
          </section>

          <section className="rounded-xl border border-primary-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-neutral-900">Who sees it</h2>
            <p className="mt-3 leading-relaxed text-neutral-700">
              Only the people you send the link to. Discreet previews keep the
              milestone and message off a lock screen until they open it.
            </p>
            <ul className="mt-4 space-y-1 text-sm text-neutral-600">
              <li>No account needed.</li>
              <li>No email required.</li>
              <li>Your card is private unless you share the link.</li>
            </ul>
          </section>
        </div>

        {card.milestone && (
          <MilestoneFooter
            previous={nearbyCard(neighbors.previous)}
            next={nearbyCard(neighbors.next)}
          />
        )}

        {related.length > 0 && (
          <section className="mt-16" aria-labelledby="related-cards">
            <h2
              id="related-cards"
              className="mb-6 text-2xl font-bold text-neutral-900"
            >
              More cards for any day
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
              {related.map((relatedCard) => (
                <CardThumb key={relatedCard.slug} card={relatedCard} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

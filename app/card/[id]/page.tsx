import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCardBySlug, SITE_URL } from '@/lib/sobriety-card-data';
import { cardFrontText, savedCardDesign } from '@/lib/sobriety-card-design';
import { getCard } from '@/lib/sobriety-cards';
import CardDisplayPage from './card-display';
import { getSharedCardSender } from './shared-card';

interface SharedCardPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: SharedCardPageProps): Promise<Metadata> {
  const { id } = await params;
  const saved = await getCard(id);
  const card = saved ? getCardBySlug(saved.cardSlug) : undefined;

  // Personalized links are never indexed.
  const robots = { index: false, follow: false, googleBot: { index: false, follow: false } };

  if (!saved || !card) {
    return { title: 'Card Not Found - Grateful Today', robots, keywords: null };
  }

  const sender = getSharedCardSender(saved);
  // Discreet (the default): nothing in the title, description or image
  // mentions sobriety or the milestone, so lock-screen previews stay private.
  const title = saved.discreet !== false
    ? `${sender} sent you a card`
    : `${sender} sent you a card: ${cardFrontText(savedCardDesign(card, saved))}`;
  const description = saved.discreet !== false
    ? 'Open it when you have a quiet moment.'
    : `A ${card.title.toLowerCase()} from Grateful Today.`;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    robots,
    // Drop the root layout's site-wide keywords (they mention sobriety/recovery).
    keywords: null,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `/card/${id}`,
      siteName: 'Grateful Today',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function SharedCardPage({ params }: SharedCardPageProps) {
  const { id } = await params;
  const saved = await getCard(id);
  const card = saved ? getCardBySlug(saved.cardSlug) : undefined;

  if (!saved || !card) {
    notFound();
  }

  return <CardDisplayPage saved={saved} card={card} />;
}

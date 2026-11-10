import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CardDetail, { cardDetailMetadata } from '@/components/sobriety-cards/card-detail';
import { getCollectionCard, SOBRIETY_CARDS } from '@/lib/sobriety-card-data';

interface CardPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Generate static params for all cards
export async function generateStaticParams() {
  return SOBRIETY_CARDS.map((card) => ({
    slug: card.slug,
  }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: CardPageProps): Promise<Metadata> {
  const { slug } = await params;
  return cardDetailMetadata(getCollectionCard('sobriety', slug));
}

export default async function CardPage({ params }: CardPageProps) {
  const { slug } = await params;
  const card = getCollectionCard('sobriety', slug);

  if (!card) {
    notFound();
  }

  return <CardDetail card={card} />;
}

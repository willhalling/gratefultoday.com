import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getChip } from '@/lib/sobriety-chips';
import ChipDisplayPage from './chip-display';

interface ChipPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: ChipPageProps): Promise<Metadata> {
  const { id } = await params;
  const chip = await getChip(id);

  if (!chip) {
    return {
      title: 'Moment Not Found - Grateful Today',
    };
  }

  const name = chip.recipientName || 'Someone';
  const title = `${name}'s moment - Grateful Today`;
  const description = chip.customText || 'A moment marked';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function ChipPage({ params }: ChipPageProps) {
  const { id } = await params;
  const chip = await getChip(id);

  if (!chip) {
    notFound();
  }

  return <ChipDisplayPage chip={chip} />;
}

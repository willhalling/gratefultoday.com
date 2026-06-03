import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getChip } from '@/lib/sobriety-chips';
import ChipDisplayPage from './chip-display';

interface ChipPageProps {
  params: Promise<{
    slug: string;
    id: string;
  }>;
}

export async function generateMetadata({ params }: ChipPageProps): Promise<Metadata> {
  const { slug, id } = await params;
  const chip = await getChip(id);

  if (!chip) {
    return {
      title: 'Chip Not Found - Grateful Today',
    };
  }

  const name = chip.recipientName || 'Someone';
  const title = `${name}'s ${chip.chipNumber} ${chip.chipText} - Grateful Today`;
  const description = chip.customText || `${chip.chipNumber} ${chip.chipText} marked`;

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
  const { slug, id } = await params;
  const chip = await getChip(id);

  if (!chip) {
    notFound();
  }

  return <ChipDisplayPage chip={chip} />;
}

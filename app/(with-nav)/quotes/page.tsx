import type { Metadata } from 'next';
import QuotesWall from '@/components/quotes-wall';

export const metadata: Metadata = {
  title: 'Wall of Gratitude Quotes - Grateful Today',
  description: 'Explore our beautiful collection of gratitude quotes and inspirational messages. Find motivation and positivity to brighten your day.',
  metadataBase: new URL('https://grateful.today/quotes'),
};

export default function QuotesPage() {
  return <QuotesWall />;
}

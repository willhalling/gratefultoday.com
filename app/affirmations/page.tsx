import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {

  return {
    title: 'Virtual Sobriety Chips - Grateful Today',
    description: 'Celebrate your sobriety milestones with our virtual Sobriety Chips. Share and download personalized chips to mark your journey towards recovery.',
    metadataBase: new URL('https://gateful.today/sobriety-chips'),
  };
}

export default function QuotesPage() {
  return (
    <>
      QuotesPage
    </>
  );
}

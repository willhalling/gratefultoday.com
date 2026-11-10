import { getCollectionCard, THANK_YOU_CARDS } from '@/lib/sobriety-card-data';
import { defaultCardDesign } from '@/lib/sobriety-card-design';
import { CARD_OG_SIZE, renderDesignOgImage } from '@/lib/sobriety-card-og';

export const size = CARD_OG_SIZE;
export const contentType = 'image/png';
export const alt = 'A thank you card with a short, warm message';

export function generateStaticParams() {
  return THANK_YOU_CARDS.map((card) => ({ slug: card.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = getCollectionCard('thank-you', slug) ?? THANK_YOU_CARDS[0];
  return renderDesignOgImage(defaultCardDesign(card));
}

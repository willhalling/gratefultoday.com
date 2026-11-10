import { getCardBySlug, SOBRIETY_CARDS } from '@/lib/sobriety-card-data';
import { defaultCardDesign } from '@/lib/sobriety-card-design';
import { CARD_OG_SIZE, renderDesignOgImage } from '@/lib/sobriety-card-og';

export const size = CARD_OG_SIZE;
export const contentType = 'image/png';
export const alt = 'A sobriety card with a short, warm message';

export function generateStaticParams() {
  return SOBRIETY_CARDS.map((card) => ({ slug: card.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = getCardBySlug(slug) ?? SOBRIETY_CARDS[0];
  return renderDesignOgImage(defaultCardDesign(card));
}

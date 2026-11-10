import { getCardBySlug, SOBRIETY_CARDS } from "@/lib/sobriety-card-data";
import { savedCardDesign, stripesDesign } from "@/lib/sobriety-card-design";
import { CARD_OG_SIZE, renderDesignOgImage } from "@/lib/sobriety-card-og";
import { getCard } from "@/lib/sobriety-cards";
import { getSharedCardSender } from "./shared-card";

export const size = CARD_OG_SIZE;
export const contentType = "image/png";
export const alt = "A colourful personalised card";

/**
 * Discreet cards: the same art with only "{From} sent you a card" on it.
 * Otherwise: the full card front.
 */
export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const saved = await getCard(id);
  const card = (saved && getCardBySlug(saved.cardSlug)) ?? SOBRIETY_CARDS[0];
  const discreet = !saved || saved.discreet !== false;
  const design = saved ? savedCardDesign(card, saved) : stripesDesign(card);
  return renderDesignOgImage(
    design,
    discreet ? `${getSharedCardSender(saved)} sent you a card` : null,
  );
}

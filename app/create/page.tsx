import type { Metadata } from 'next';
import OrderFlow from '@/components/order/order-flow';
import { THANKS_RELATIONSHIPS } from '@/lib/orders/types';
import { OCCASIONS, OFFERED_OCCASIONS, type Occasion } from '@/lib/product';

export const metadata: Metadata = {
  title: 'Make a video — GratefulToday',
  robots: { index: false },
};

type SearchParams = Promise<{ type?: string; for?: string }>;

export default async function CreatePage({ searchParams }: { searchParams: SearchParams }) {
  const { type, for: recipient } = await searchParams;
  const occasion: Occasion = type === OCCASIONS.recovery.slug ? 'recovery' : 'thanks';
  // /create?for=teaching-assistant → "teaching assistant"
  const relationship = recipient?.replace(/-/g, ' ');
  const initialRelationship =
    occasion === 'thanks' && (THANKS_RELATIONSHIPS as readonly string[]).includes(relationship ?? '') ? relationship : undefined;

  // Full screen, no site header or footer: the flow is the whole page.
  return (
    <OrderFlow
      initialOccasion={occasion}
      // With only one occasion on offer there's nothing to choose.
      occasionChosen={Boolean(type) || Boolean(initialRelationship) || OFFERED_OCCASIONS.length === 1}
      initialRelationship={initialRelationship}
    />
  );
}

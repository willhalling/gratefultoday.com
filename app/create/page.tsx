import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import OrderFlow from '@/components/order/order-flow';
import { THANKS_RELATIONSHIPS } from '@/lib/orders/types';
import { OCCASIONS, type Occasion } from '@/lib/product';

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
  const initialRelationship = (THANKS_RELATIONSHIPS as readonly string[]).includes(relationship ?? '')
    ? relationship
    : undefined;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <OrderFlow initialOccasion={occasion} initialRelationship={initialRelationship} />
      </main>
      <SiteFooter />
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';

export const metadata: Metadata = {
  title: 'Make a thank-you video — GratefulToday',
  robots: { index: false },
};

// Placeholder until the order form (questions → script → approval) is built.
export default function CreatePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-4xl font-semibold text-pine">Opening very soon</h1>
        <p className="mt-4 text-lg text-muted">
          We’re putting the finishing touches to the order form. Check back shortly.
        </p>
        <Link href="/" className="mt-8 inline-block font-semibold text-pine underline underline-offset-4">
          Back to the home page
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}

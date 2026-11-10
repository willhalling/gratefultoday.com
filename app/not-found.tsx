import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-4xl font-semibold text-pine">We couldn’t find that page</h1>
        <p className="mt-4 text-lg text-muted">It may have moved, or the link may be incomplete.</p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-pine px-6 py-3 font-semibold text-white transition hover:bg-pine-dark"
        >
          Go to the home page
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}

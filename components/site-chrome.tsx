import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="border-b border-line/70 bg-cream/90 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="font-serif text-xl font-semibold text-pine">
          GratefulToday
        </Link>
        <Link
          href="/create"
          className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine-dark"
        >
          Make a video
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          <span className="font-serif font-semibold text-pine">GratefulToday</span> · Thank-you and recovery videos, made with care.
        </p>
        <p>© {new Date().getFullYear()} Grateful Today Limited</p>
      </div>
    </footer>
  );
}

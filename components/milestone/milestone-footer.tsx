import Link from "next/link";

export interface MilestoneLink {
  href: string;
  title: string;
}

export default function MilestoneFooter({
  previous,
  next,
}: {
  previous: MilestoneLink | null;
  next: MilestoneLink | null;
}) {
  return (
    <div className="mt-14 border-t border-primary-100 pt-8">
      <nav className="grid gap-4 sm:grid-cols-2" aria-label="Nearby milestones">
        {previous ? (
          <Link
            href={previous.href}
            className="rounded-xl border border-primary-100 bg-white p-4 text-sm text-neutral-600 hover:bg-primary-50"
          >
            ← Previous milestone
            <span className="mt-1 block font-semibold text-neutral-900">
              {previous.title}
            </span>
          </Link>
        ) : (
          <span className="hidden sm:block" />
        )}
        {next && (
          <Link
            href={next.href}
            className="rounded-xl border border-primary-100 bg-white p-4 text-sm text-neutral-600 hover:bg-primary-50 sm:text-right"
          >
            Next milestone →
            <span className="mt-1 block font-semibold text-neutral-900">
              {next.title}
            </span>
          </Link>
        )}
      </nav>
      <p className="mt-8 text-center text-sm text-neutral-600">
        having a hard time today? you don&apos;t have to do it alone →{" "}
        <Link
          href="/support"
          className="font-semibold text-primary-800 underline underline-offset-4"
        >
          Support
        </Link>
      </p>
    </div>
  );
}

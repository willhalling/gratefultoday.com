import type { Metadata } from "next";
import Link from "next/link";
import ChipsSearchFilter from "@/components/sobriety-chips/chips-search-filter";

export const metadata: Metadata = {
  title: "Sobriety Chips | Grateful Today",
  description:
    "Make a free personal sobriety chip for 24 hours, 30 days, one year, and every milestone in between.",
  alternates: { canonical: "/sobriety-chips" },
  openGraph: {
    title: "Sobriety Chips | Grateful Today",
    description: "Personal digital chips for the recovery days that count.",
    type: "website",
  },
};

export default function SobrietyChipsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <header className="mx-auto mb-12 max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">
            One milestone at a time
          </p>
          <h1 className="mt-3 text-4xl font-bold text-neutral-900 md:text-5xl">
            Sobriety Chips
          </h1>
          <p className="mt-5 text-xl leading-relaxed text-neutral-600">
            Choose a milestone, add a name or message, and make a chip to keep
            or share. No account needed.
          </p>
          <Link
            href="/sobriety-counter"
            className="mt-5 inline-block text-sm font-semibold text-primary-800 underline underline-offset-4"
          >
            Not sure which chip? Enter your sobriety date →
          </Link>
        </header>

        <ChipsSearchFilter />

        <section className="mx-auto mt-16 max-w-3xl rounded-2xl border border-primary-100 bg-white p-6 text-center">
          <h2 className="text-2xl font-bold text-neutral-900">
            Want to send a card too?
          </h2>
          <p className="mt-3 leading-relaxed text-neutral-600">
            Every milestone chip has a matching colourful card. Add your own
            message and send both, or choose just one.
          </p>
          <Link
            href="/sobriety-cards"
            className="mt-4 inline-block font-semibold text-primary-800 underline underline-offset-4"
          >
            See sobriety cards →
          </Link>
        </section>
      </div>
    </main>
  );
}

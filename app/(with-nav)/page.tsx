import type { Metadata } from "next";
import Link from "next/link";
import HomeWallPreview from "@/components/home/home-wall-preview";
import TodaySection from "@/components/home/today-section";
import { NewsletterSignupBar } from "@/components/newsletter/NewsletterSignupBar";
import SobrietyCounter from "@/components/sobriety-counter/sobriety-counter";
import { GratitudePostForm } from "@/components/wall/GratitudePostForm";

export const metadata: Metadata = {
  title: "Grateful Today — One day. One thing.",
  description:
    "What is one thing you are grateful for today? Share it, make a milestone chip or card, and read the Gratitude Wall.",
  alternates: { canonical: "/" },
};

export default function GratefulTodayPage() {
  return (
    <main className="bg-primary-100">
      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-700">
          One day. One thing.
        </p>
        <h1 className="mt-5 text-4xl font-bold leading-tight text-neutral-900 sm:text-5xl">
          What&apos;s one thing you&apos;re grateful for today?
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-600">
          It can be small. Especially today.
        </p>
        <div className="mx-auto mt-8 max-w-2xl text-left">
          <GratitudePostForm compact />
        </div>
      </section>

      <TodaySection />

      <section className="bg-secondary">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-800">
              Celebrating a milestone?
            </p>
            <h2 className="mt-3 text-3xl font-bold text-neutral-900">
              Make the day feel like yours
            </h2>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/sobriety-chips"
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-50 transition-colors hover:bg-primary-500"
              >
                Make a sobriety chip
              </Link>
              <Link
                href="/sobriety-cards"
                className="rounded-full border border-primary-800 bg-primary-50 px-6 py-3 text-sm font-semibold text-primary-800 transition-colors hover:bg-primary-100"
              >
                Send a sobriety card
              </Link>
            </div>
          </div>
          <div className="mx-auto mt-9 max-w-2xl">
            <SobrietyCounter compact />
          </div>
        </div>
      </section>

      <div className="border-y border-neutral-700 bg-neutral">
        <HomeWallPreview />
      </div>

      <section className="bg-secondary-50">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">
            A little gratitude in your inbox
          </p>
          <h2 className="mt-3 text-3xl font-bold text-neutral-900">
            One thought each morning.
          </h2>
          <p className="mb-6 mt-2 text-neutral-600">
            Free. No spam. Just one small thing to notice.
          </p>
          <NewsletterSignupBar />
        </div>
      </section>
    </main>
  );
}

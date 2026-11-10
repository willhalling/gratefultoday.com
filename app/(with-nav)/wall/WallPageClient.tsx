"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { GratitudePostForm } from "@/components/wall/GratitudePostForm";
import { GratitudeWall } from "@/components/wall/GratitudeWall";

const GratitudeVideoStudio = dynamic(
  () => import("@/components/wall/gratitude-video-studio"),
  { ssr: false },
);

export default function WallPageClient() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">
            One day. One thing.
          </p>
          <h1 className="mt-3 text-4xl font-bold text-neutral-900 md:text-5xl">
            Gratitude Wall
          </h1>
          <p className="mt-4 text-lg text-neutral-600">
            Small good things, shared by people who get it.
          </p>
        </header>

        <div className="mb-12 grid items-start gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-primary-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-2xl font-bold text-neutral-900">
              Share your gratitude
            </h2>
            <p className="mb-5 mt-1 text-sm text-neutral-600">
              What is one thing you are grateful for today?
            </p>
            <GratitudePostForm
              onPostCreated={() => setRefreshTrigger((value) => value + 1)}
            />
          </section>
          <section className="rounded-2xl border border-primary-100 bg-primary-50 p-5 sm:p-6">
            <h2 className="text-2xl font-bold text-neutral-900">
              Make a gratitude video
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              Record a 15-second clip with an empty-frame opening hook, add the
              wave and typewriter style, then download or share it from your
              device.
            </p>
            <button
              type="button"
              onClick={() => setVideoOpen((open) => !open)}
              className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-50 transition-colors hover:bg-primary-500"
              aria-expanded={videoOpen}
            >
              {videoOpen ? "Close video maker" : "Open video maker"}
            </button>
          </section>
        </div>

        {videoOpen && (
          <div className="mb-12">
            <GratitudeVideoStudio />
          </div>
        )}

        <section aria-label="Community gratitude posts">
          <GratitudeWall refreshTrigger={refreshTrigger} />
        </section>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import prompts from "@/constants/rewritten-prompts.json";
import TodayVideo, { type TodayPrompt } from "@/components/home/today-video";

const dailyPrompts = prompts as TodayPrompt[];

function currentDayOfYear() {
  const now = new Date();
  return Math.floor(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
      Date.UTC(now.getFullYear(), 0, 0)) /
      86400000,
  );
}

export default function TodaySection() {
  const [today, setToday] = useState({ day: 1, prompt: dailyPrompts[0] });

  useEffect(() => {
    const day = currentDayOfYear();
    setToday({ day, prompt: dailyPrompts[(day - 1) % dailyPrompts.length] });
  }, []);

  return (
    <section className="border-y border-primary-700 bg-primary">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
            Today · Day {today.day}
          </p>
          <h2 className="mt-4 text-3xl font-bold text-primary-50 md:text-4xl">
            {today.prompt.subject}
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-primary-100">
            {today.prompt.intro}
          </p>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-primary-50">
            {today.prompt.prompt}
          </p>
          <Link
            href="/wall"
            className="mt-6 inline-block text-sm font-semibold text-secondary underline underline-offset-4"
          >
            share yours on the wall →
          </Link>
        </div>
        <TodayVideo prompt={today.prompt} />
      </div>
    </section>
  );
}

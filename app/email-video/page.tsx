import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EmailVideoExport from "@/components/newsletter/email-video-export";
import { getPromptForDay } from "@/functions/src/constants/dailyPrompts";
import { isValidIssueDate } from "@/lib/newsletter-issues";

export const metadata: Metadata = {
  title: "Daily signature video | Grateful Today",
  robots: { index: false, follow: false },
};

function dayOfYear(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Math.floor(
    (Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 0)) / 86400000,
  );
}

export default async function EmailVideoPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const { date: requested } = await searchParams;
  const date =
    (Array.isArray(requested) ? requested[0] : requested) ??
    new Date().toISOString().slice(0, 10);
  if (!isValidIssueDate(date)) notFound();
  const prompt = getPromptForDay(dayOfYear(date));

  return (
    <main className="min-h-screen bg-primary-100 px-4 py-10 text-neutral-900">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">
          One day. One thing.
        </p>
        <h1 className="mt-3 text-3xl font-bold">Daily signature video</h1>
        <p className="mt-2 text-neutral-600">{date}</p>
        <div className="mt-8 flex justify-center">
          <EmailVideoExport prompt={prompt} date={date} />
        </div>
      </div>
    </main>
  );
}

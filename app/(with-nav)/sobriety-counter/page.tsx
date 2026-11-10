import type { Metadata } from "next";
import SobrietyCounter from "@/components/sobriety-counter/sobriety-counter";

export const metadata: Metadata = {
  title: "Sobriety Counter | Grateful Today",
  description:
    "Enter your sobriety date to see your time, your latest chip, and the next milestone.",
};

export default async function SobrietyCounterPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const { date } = await searchParams;
  const initialDate = Array.isArray(date) ? date[0] : date;

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">
            One day at a time
          </p>
          <h1 className="mt-3 text-4xl font-bold text-neutral-900 md:text-5xl">
            Sobriety counter
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600">
            Enter your date to see how far you have come and the chip for your
            latest milestone.
          </p>
        </div>
        <SobrietyCounter initialDate={initialDate ?? ""} />
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  getSobrietyProgress,
  parseDateInput,
  toDateInput,
  type SobrietyChip,
} from "@/lib/sobriety-milestones";

function ChipLink({ chip, label }: { chip: SobrietyChip; label: string }) {
  return (
    <Link
      href={`/sobriety-chips/${chip.id}`}
      className="block rounded-xl border border-primary-200 bg-white p-5 transition-colors hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
    >
      <span className="block text-xs font-semibold uppercase tracking-wider text-primary-700">
        {label}
      </span>
      <span className="mt-1 block text-xl font-bold text-neutral-900">
        {chip.title}
      </span>
      <span className="mt-2 block text-sm font-medium text-primary-800">
        See this chip →
      </span>
    </Link>
  );
}

export default function SobrietyCounter({
  initialDate = "",
  compact = false,
}: {
  initialDate?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [date, setDate] = useState(initialDate);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ReturnType<
    typeof getSobrietyProgress
  > | null>(() => {
    if (!initialDate) return null;
    const parsed = parseDateInput(initialDate);
    if (!parsed || parsed > new Date()) return null;
    return getSobrietyProgress(parsed);
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const parsed = parseDateInput(date);
    if (!parsed) {
      setError("Choose a valid sobriety date.");
      return;
    }
    if (parsed > new Date()) {
      setError("Your sobriety date cannot be in the future.");
      return;
    }
    if (compact) {
      router.push(`/sobriety-counter?date=${date}`);
      return;
    }
    setResult(getSobrietyProgress(parsed));
  };

  return (
    <div className={compact ? "" : "mx-auto max-w-3xl"}>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <label className="flex-1 text-sm font-medium text-neutral-700">
          How long have you been sober?
          <input
            type="date"
            value={date}
            max={toDateInput(new Date())}
            onChange={(event) => setDate(event.target.value)}
            required
            className="mt-2 block w-full rounded-xl border border-primary-200 bg-white px-4 py-3 text-neutral-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-50 transition-colors hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-800"
        >
          See my chip
        </button>
      </form>
      {error && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {!compact && result && (
        <div className="mt-10" aria-live="polite">
          <div className="rounded-2xl bg-primary-100 p-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary-700">
              Today is day {result.dayNumber}
            </p>
            <p className="mt-2 font-heading text-5xl font-bold text-primary-900">
              {result.totalDays}
            </p>
            <p className="text-neutral-600">days sober</p>
            <p className="mt-3 text-sm text-neutral-700">
              {result.breakdown.years} years · {result.breakdown.months} months
              · {result.breakdown.days} days
            </p>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {result.current ? (
              <ChipLink chip={result.current} label="Your latest chip" />
            ) : (
              <div className="rounded-xl border border-dashed border-primary-300 p-5">
                <span className="block text-xs font-semibold uppercase tracking-wider text-primary-700">
                  Today counts
                </span>
                <span className="mt-1 block text-xl font-bold text-neutral-900">
                  Day one starts here
                </span>
              </div>
            )}
            {result.next && (
              <ChipLink
                chip={result.next.chip}
                label={`Next chip · ${result.next.daysRemaining} days to go`}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

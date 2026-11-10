'use client';

import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useState } from 'react';

interface Quote {
  id: number;
  quote?: string;
  author?: string;
}

// Longer quotes don't fit the homepage hero.
const MAX_QUOTE_LENGTH = 150;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Days since 1970-01-01 for the visitor's local calendar day, offset by `offset` days. */
function localDayNumber(offset: number): number {
  const now = new Date();
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / ONE_DAY_MS) + offset;
}

function formatDay(dayNumber: number): string {
  return new Date(dayNumber * ONE_DAY_MS).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

/** One quote per day from /quotes.json, with buttons to step back to earlier days. */
export default function DailyQuote({ className = '' }: { className?: string }) {
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  // 0 is today, -1 yesterday, and so on.
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    fetch('/quotes.json')
      .then((res) => res.json())
      .then((all: Quote[]) =>
        setQuotes(all.filter((q) => q.quote && q.quote.length <= MAX_QUOTE_LENGTH))
      )
      .catch(() => setQuotes([]));
  }, []);

  if (!quotes?.length) return null;

  const day = localDayNumber(offset);
  const quote = quotes[((day % quotes.length) + quotes.length) % quotes.length];
  const isToday = offset === 0;

  const buttonClass =
    'flex h-9 w-9 items-center justify-center rounded-full border border-white/40 text-white transition-colors hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent';

  return (
    <motion.figure
      className={`rounded-2xl bg-black/35 backdrop-blur-sm border border-white/15 p-4 md:p-5 text-white shadow-xl ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="flex items-center justify-between gap-3 mb-2 md:mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
          {isToday ? "Today's quote" : formatDay(day)}
        </p>
        <div className="flex items-center gap-2">
          {!isToday && (
            <button
              type="button"
              onClick={() => setOffset(0)}
              className="text-xs text-white/80 underline underline-offset-2 hover:text-white mr-1"
            >
              Today
            </button>
          )}
          <button
            type="button"
            onClick={() => setOffset((o) => o - 1)}
            className={buttonClass}
            aria-label="Previous day's quote"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setOffset((o) => Math.min(0, o + 1))}
            disabled={isToday}
            className={buttonClass}
            aria-label="Next day's quote"
          >
            →
          </button>
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={day}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <blockquote className="text-[15px] md:text-lg leading-snug">“{quote.quote}”</blockquote>
          {quote.author && (
            <figcaption className="mt-2 text-sm text-white/75">— {quote.author}</figcaption>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.figure>
  );
}

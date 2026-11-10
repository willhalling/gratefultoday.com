"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getNewsletterGifUrl } from "@/functions/src/utils/newsletterVideo";
import type { LandingPageSection } from "@/components/landing/LandingPageTemplate";
import { NewsletterForm } from "@/components/newsletter/NewsletterForm";
import type { NewsletterIssue } from "@/lib/newsletter-issues";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export interface IssueNavLink {
  href: string;
  label: string;
}

export interface NewsletterPageContentProps {
  /** The issue to show, or null when the requested day has none. */
  issue: NewsletterIssue | null;
  /** Link to the issue's email HTML, as subscribers received it. */
  emailHref: string | null;
  /** Human-readable date of the requested day. */
  dateLabel: string;
  isLatest: boolean;
  /** Why there is no issue, shown when issue is null. */
  missingMessage?: string;
  previous: IssueNavLink | null;
  next: IssueNavLink | null;
}

const navButtonClass =
  "inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors sm:px-4";
const navButtonDisabledClass =
  "inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-300 cursor-not-allowed sm:px-4";

function IssueNav({
  previous,
  next,
  dateLabel,
  isLatest,
  hasIssue,
}: Pick<
  NewsletterPageContentProps,
  "previous" | "next" | "dateLabel" | "isLatest"
> & { hasIssue: boolean }) {
  const label = isLatest
    ? "Today's issue"
    : hasIssue
      ? "Past issue"
      : "No issue";
  return (
    <nav
      aria-label="Newsletter issues"
      className="flex items-center justify-between gap-3 mb-6"
    >
      {previous ? (
        <Link
          href={previous.href}
          scroll={false}
          className={navButtonClass}
          aria-label={`Previous day: ${previous.label}`}
        >
          <span aria-hidden="true">←</span> Previous
        </Link>
      ) : (
        <span className={navButtonDisabledClass} aria-disabled="true">
          <span aria-hidden="true">←</span> Previous
        </span>
      )}

      <div className="text-center min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {label}
        </p>
        <p className="text-sm sm:text-base font-medium text-neutral-900">
          {dateLabel}
        </p>
      </div>

      {next ? (
        <Link
          href={next.href}
          scroll={false}
          className={navButtonClass}
          aria-label={`Next day: ${next.label}`}
        >
          Next <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <span className={navButtonDisabledClass} aria-disabled="true">
          Next <span aria-hidden="true">→</span>
        </span>
      )}
    </nav>
  );
}

function IssueCard({ issue }: { issue: NewsletterIssue }) {
  const [showGif, setShowGif] = useState(true);
  useEffect(() => setShowGif(true), [issue.date]);
  const gifUrl = getNewsletterGifUrl(issue.date);

  return (
    <article className="bg-white rounded-lg shadow-md overflow-hidden text-left">
      <header className="bg-[#9EADA0] px-6 py-8 sm:px-10 text-center">
        <h3 className="text-2xl sm:text-3xl font-bold text-white">
          {issue.subject}
        </h3>
      </header>
      <div className="px-6 py-8 sm:px-8 space-y-8">
        {showGif && (
          <a href={`/email-video?date=${issue.date}`} className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gifUrl}
              alt={`Signature video for ${issue.subject}`}
              className="mx-auto w-[360px] max-w-full rounded-lg"
              onError={() => setShowGif(false)}
            />
          </a>
        )}
        <p className="text-base text-neutral-700 leading-relaxed">
          {issue.intro}
        </p>
        <div className="p-5 bg-neutral-50 border-l-[3px] border-neutral-500 rounded">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
            Today&apos;s Prompt
          </p>
          <p className="text-base text-neutral-800 leading-relaxed mb-4">
            {issue.prompt}
          </p>
          <p className="text-sm italic text-neutral-600">
            (Or simply share whatever you feel grateful for today)
          </p>
        </div>
        <div className="text-center">
          <Link
            href="/wall"
            className="inline-block rounded-md bg-neutral-500 px-7 py-3.5 text-base font-medium text-white hover:bg-neutral-600 transition-colors"
          >
            Share Your Gratitude
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function NewsletterPageContent({
  issue,
  emailHref,
  dateLabel,
  isLatest,
  missingMessage,
  previous,
  next,
}: NewsletterPageContentProps) {
  const sections: LandingPageSection[] = [
    {
      id: "how-it-works",
      title: "Three Minutes Every Morning",
      backgroundColor: "white",
      textAlign: "center",
      padding: "lg",
      content: (
        <motion.div
          className="grid md:grid-cols-3 gap-8 mt-12"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div className="text-center" variants={fadeInUp}>
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-3">
              1. Receive Your Prompt
            </h3>
            <p className="text-neutral-600">
              A simple gratitude question arrives in your inbox each morning at
              7am.
            </p>
          </motion.div>

          <motion.div className="text-center" variants={fadeInUp}>
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-3">
              2. Reflect and Post
            </h3>
            <p className="text-neutral-600">
              Take a moment to think. Answer our prompt or share whatever you're
              grateful for today. Post anonymously to our community wall, or
              just reflect privately.
            </p>
          </motion.div>

          <motion.div className="text-center" variants={fadeInUp}>
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-3">
              3. Build the Habit
            </h3>
            <p className="text-neutral-600">
              Daily prompts help you notice the good, even on hard days.
              Especially on hard days.
            </p>
          </motion.div>
        </motion.div>
      ),
    },
    {
      id: "faqs",
      title: "FAQs",
      backgroundColor: "neutral-50",
      textAlign: "center",
      padding: "lg",
      content: (
        <motion.div
          className="max-w-3xl mx-auto space-y-8 text-left"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div variants={fadeInUp}>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              Can I change my frequency later?
            </h3>
            <p className="text-neutral-600">
              Yes! Update your preferences anytime from any email we send.
            </p>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              Will you spam me?
            </h3>
            <p className="text-neutral-600">
              Never. You'll only get the gratitude prompts you signed up for,
              daily or weekly. No promotional emails, no selling your info.
            </p>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              What if I miss a day?
            </h3>
            <p className="text-neutral-600">
              No guilt, no streaks to maintain. Just pick back up whenever
              you're ready. Recovery and gratitude aren't about perfection.
            </p>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              Is this only for people in recovery?
            </h3>
            <p className="text-neutral-600">
              Not at all. While many of our community members are in recovery,
              anyone can benefit from a daily gratitude practice.
            </p>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              What happens to what I post?
            </h3>
            <p className="text-neutral-600">
              If you choose to post your gratitude to our community wall, it's
              anonymous and visible to others for encouragement. You can also
              just reflect privately. Posting is always optional.
            </p>
          </motion.div>
        </motion.div>
      ),
    },
  ];

  return (
    <div>
      <section className="bg-neutral-50 py-10 md:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <header className="mb-8 md:mb-10 max-w-2xl">
            <h1 className="text-3xl md:text-5xl font-bold text-neutral-900 mb-3">
              Grateful Today Newsletter
            </h1>
            <p className="text-lg text-neutral-600">
              A simple gratitude prompt in your inbox every morning. Here&apos;s
              what subscribers get. Browse past days, then sign up to get the
              next one.
            </p>
          </header>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-10 lg:gap-12 items-start">
            <div id="issue" className="scroll-mt-24">
              <IssueNav
                previous={previous}
                next={next}
                dateLabel={dateLabel}
                isLatest={isLatest}
                hasIssue={issue !== null}
              />
              {issue ? (
                <>
                  <IssueCard issue={issue} />
                  {emailHref && (
                    <p className="mt-4 text-center text-sm">
                      <a
                        href={emailHref}
                        target="_blank"
                        rel="noopener"
                        className="font-medium text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
                      >
                        View the email as subscribers received it ↗
                      </a>
                    </p>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-lg shadow-md px-6 py-12 text-center">
                  <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                    No issue for this day
                  </h3>
                  <p className="text-neutral-600 mb-6 break-words">
                    {missingMessage}
                  </p>
                  <Link
                    href="/newsletter"
                    scroll={false}
                    className="inline-block rounded-md bg-neutral-500 px-6 py-3 text-base font-medium text-white hover:bg-neutral-600 transition-colors"
                  >
                    Read today&apos;s issue
                  </Link>
                </div>
              )}
            </div>

            <aside className="lg:sticky lg:top-8 bg-white rounded-xl shadow-xl p-6 sm:p-8 border-2 border-accent">
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                Sign Up
              </h2>
              <p className="text-neutral-600 mb-6">
                Choose daily or weekly reminders
              </p>
              <NewsletterForm />
            </aside>
          </div>
        </div>
      </section>

      {sections.map((section) => (
        <section
          key={section.id}
          className={`py-16 ${section.backgroundColor === "white" ? "bg-white" : "bg-neutral-50"}`}
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-neutral-900 mb-8">
              {section.title}
            </h2>
            {section.content}
          </div>
        </section>
      ))}
    </div>
  );
}

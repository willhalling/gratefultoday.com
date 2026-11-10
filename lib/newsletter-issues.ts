/**
 * Daily issues of the Grateful Today newsletter.
 *
 * The emailed newsletter (functions/src/sendNewsletter.ts) has no stored archive: each day's
 * issue is the prompt for that day of the year from functions/src/constants/dailyPrompts.ts,
 * sent at 7am UTC. This module rebuilds any day's issue from the same list so the site shows
 * exactly what subscribers received.
 */

import { getPromptForDay, type DailyPrompt } from '@/functions/src/constants/dailyPrompts';

/** The earliest day the archive will show. */
export const FIRST_ISSUE_DATE = '2026-01-01';

/** Hour (UTC) the daily email goes out. Before this, the latest issue is yesterday's. */
const SEND_HOUR_UTC = 7;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface NewsletterIssue extends DailyPrompt {
  date: string; // YYYY-MM-DD
  dayOfYear: number;
}

function toDateString(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

/** Parses a YYYY-MM-DD string to a UTC timestamp, or null if it isn't a real date. */
function parseDate(date: string): number | null {
  const match = DATE_PATTERN.exec(date);
  if (!match) return null;
  const time = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return toDateString(time) === date ? time : null;
}

export function isValidIssueDate(date: string): boolean {
  return parseDate(date) !== null;
}

/** The date of the most recent issue that has gone out. */
export function getLatestIssueDate(now: Date = new Date()): string {
  return toDateString(now.getTime() - SEND_HOUR_UTC * 60 * 60 * 1000);
}

export function shiftIssueDate(date: string, days: number): string {
  const time = parseDate(date);
  if (time === null) throw new Error(`Invalid issue date: ${date}`);
  return toDateString(time + days * ONE_DAY_MS);
}

/** Matches getDayOfYear in the sender, which runs in UTC. */
function getDayOfYear(time: number): number {
  const year = new Date(time).getUTCFullYear();
  return Math.floor((time - Date.UTC(year, 0, 0)) / ONE_DAY_MS);
}

/** The issue for a day, or null if that day is invalid, before the first issue, or not sent yet. */
export function getIssueForDate(date: string, now: Date = new Date()): NewsletterIssue | null {
  const time = parseDate(date);
  if (time === null) return null;
  if (date < FIRST_ISSUE_DATE || date > getLatestIssueDate(now)) return null;
  const dayOfYear = getDayOfYear(time);
  return { ...getPromptForDay(dayOfYear), date, dayOfYear };
}

export function formatIssueDate(date: string): string {
  const time = parseDate(date);
  if (time === null) return date;
  return new Date(time).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

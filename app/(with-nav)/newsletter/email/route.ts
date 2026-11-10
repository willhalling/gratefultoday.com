/**
 * The newsletter email exactly as subscribers receive it, for any day with an issue.
 * GET /newsletter/email?date=YYYY-MM-DD (defaults to the latest issue).
 */

import { NextRequest, NextResponse } from "next/server";
import { generateEmailHTML } from "@/functions/src/utils/emailTemplate";
import { findNewsletterGifUrl } from "@/functions/src/utils/newsletterVideoServer";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import {
  getIssueForDate,
  getLatestIssueDate,
  shiftIssueDate,
} from "@/lib/newsletter-issues";

export const dynamic = "force-dynamic";

const PREVIEW_EMAIL = "you@example.com";

/** Gratitude wall posts on the day before the issue, which the email reports as "Yesterday". */
async function countPostsDayBefore(date: string): Promise<number | undefined> {
  try {
    const { db } = getFirebaseAdmin();
    const start = new Date(`${shiftIssueDate(date, -1)}T00:00:00Z`);
    const end = new Date(`${date}T00:00:00Z`);
    const snapshot = await db
      .collection("gratitudePosts")
      .where("createdAt", ">=", start)
      .where("createdAt", "<", end)
      .get();
    return snapshot.docs.filter((doc) => doc.data().isArchived !== true).length;
  } catch (error) {
    console.error("Newsletter email preview: could not count posts", error);
    return undefined;
  }
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? getLatestIssueDate();
  if (!getIssueForDate(date)) {
    return new NextResponse("No newsletter issue for this day.", {
      status: 404,
    });
  }

  const html = generateEmailHTML({
    recipientEmail: PREVIEW_EMAIL,
    frequency: "daily",
    yesterdayCount: await countPostsDayBefore(date),
    gifUrl: await findNewsletterGifUrl(date),
    // Midday UTC so the sender's day-of-year maths lands on this date in any server timezone.
    date: new Date(`${date}T12:00:00Z`),
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}

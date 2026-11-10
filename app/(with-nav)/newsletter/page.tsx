import type { Metadata } from 'next';
import {
  FIRST_ISSUE_DATE,
  formatIssueDate,
  getIssueForDate,
  getLatestIssueDate,
  isValidIssueDate,
  shiftIssueDate,
} from '@/lib/newsletter-issues';
import NewsletterPageContent, { type IssueNavLink } from './newsletter-page-content';

const TITLE = 'Grateful Today Newsletter';
const DESCRIPTION =
  'A simple gratitude prompt in your inbox every morning. Read today’s issue of the Grateful Today Newsletter, browse past days, and sign up for daily or weekly reminders.';

interface NewsletterPageProps {
  searchParams: Promise<{ date?: string | string[] }>;
}

async function getRequestedDate(searchParams: NewsletterPageProps['searchParams']) {
  const { date } = await searchParams;
  const latest = getLatestIssueDate();
  const requested = (Array.isArray(date) ? date[0] : date) ?? latest;
  return { requested, latest };
}

function issueHref(date: string, latest: string): string {
  return date === latest ? '/newsletter' : `/newsletter?date=${date}`;
}

export async function generateMetadata({ searchParams }: NewsletterPageProps): Promise<Metadata> {
  const { requested, latest } = await getRequestedDate(searchParams);
  const issue = getIssueForDate(requested);
  const isPastIssue = issue !== null && requested !== latest;
  const title = isPastIssue ? `${TITLE}: ${formatIssueDate(requested)}` : TITLE;
  const description = isPastIssue ? `${issue.subject}. ${issue.prompt}` : DESCRIPTION;

  return {
    title,
    description,
    alternates: { canonical: issue ? issueHref(requested, latest) : '/newsletter' },
    robots: issue ? undefined : { index: false },
    openGraph: { title, description, url: `https://gratefultoday.com${issueHref(requested, latest)}` },
  };
}

export default async function NewsletterPage({ searchParams }: NewsletterPageProps) {
  const { requested, latest } = await getRequestedDate(searchParams);
  const valid = isValidIssueDate(requested);
  const issue = getIssueForDate(requested);

  // Step one day either way, clamped to the range of days that have an issue.
  let previous: IssueNavLink | null = null;
  let next: IssueNavLink | null = null;
  if (valid) {
    const before = shiftIssueDate(requested, -1);
    const prevDate = before > latest ? latest : before;
    if (prevDate >= FIRST_ISSUE_DATE) {
      previous = { href: issueHref(prevDate, latest), label: formatIssueDate(prevDate) };
    }
    const after = shiftIssueDate(requested, 1);
    const nextDate = after < FIRST_ISSUE_DATE ? FIRST_ISSUE_DATE : after;
    if (nextDate <= latest) {
      next = { href: issueHref(nextDate, latest), label: formatIssueDate(nextDate) };
    }
  }

  let missingMessage: string | undefined;
  if (!valid) {
    missingMessage = `“${requested}” isn’t a date we recognise. Dates look like ${latest}.`;
  } else if (requested > latest) {
    missingMessage = 'This issue hasn’t gone out yet. Sign up to get it in your inbox.';
  } else if (!issue) {
    missingMessage = `The archive starts on ${formatIssueDate(FIRST_ISSUE_DATE)}.`;
  }

  return (
    <NewsletterPageContent
      issue={issue}
      emailHref={issue ? `/newsletter/email?date=${requested}` : null}
      dateLabel={valid ? formatIssueDate(requested) : 'Unknown date'}
      isLatest={requested === latest}
      missingMessage={missingMessage}
      previous={previous}
      next={next}
    />
  );
}

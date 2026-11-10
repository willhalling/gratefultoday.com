import {
  getPromptForDay,
  getDayOfYear as getPromptDayOfYear,
} from "../constants/dailyPrompts";
import { getSobrietyMilestoneSlug } from "./sobrietyMilestones";

interface DailyPrompt {
  subject: string;
  intro: string;
  prompt: string;
  tags: string[];
}

export interface EmailTemplateData {
  recipientEmail: string;
  firstName?: string;
  frequency: "daily" | "weekly";
  isTest?: boolean;
  yesterdayCount?: number;
  date?: Date;
  sobrietyDate?: string;
  gifUrl?: string | null;
}

export function getSubjectLine(promptSubject: string, date: Date): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${promptSubject} | ${date.getDate()} ${months[date.getMonth()]}`;
}

export function generateEmailHTML(data: EmailTemplateData): string {
  const {
    recipientEmail,
    frequency,
    yesterdayCount,
    date = new Date(),
    sobrietyDate,
    gifUrl,
  } = data;
  const preferencesUrl = `https://gratefultoday.com/newsletter/preferences?email=${encodeURIComponent(recipientEmail)}`;
  const todayUrl = "https://gratefultoday.com/";
  const wallUrl = `https://gratefultoday.com/wall?email=${encodeURIComponent(recipientEmail)}`;
  const todaysPrompt = getPromptForDay(getPromptDayOfYear(date)) as DailyPrompt;
  const milestoneSlug = getSobrietyMilestoneSlug(sobrietyDate, date);
  const milestoneUrl = milestoneSlug
    ? `https://gratefultoday.com/sobriety-chips/${milestoneSlug}`
    : null;
  const subject = getSubjectLine(todaysPrompt.subject, date);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fafaf9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; max-width: 600px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #9EADA0; padding: 32px 40px 26px; text-align: center;">
              <p style="color: #1E1F21; margin: 0 0 10px; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">One day. One thing.</p>
              <h1 style="color: #1E1F21; margin: 0; font-size: 28px; font-weight: 700;">${todaysPrompt.subject}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              ${
                gifUrl
                  ? `
              <div style="margin-bottom: 28px; text-align: center;">
                <a href="${todayUrl}" style="text-decoration: none;">
                  <img src="${gifUrl}" width="360" alt="Today's signature video: ${todaysPrompt.subject}" style="display: block; width: 360px; max-width: 100%; height: auto; margin: 0 auto; border-radius: 8px;" />
                </a>
              </div>`
                  : ""
              }
              <div style="margin-bottom: 32px;">
                <p style="margin: 0; font-size: 16px; color: #44403c; line-height: 1.6;">${todaysPrompt.intro}</p>
              </div>
              <div style="margin-bottom: 28px; padding: 20px; background-color: #fafaf9; border-left: 3px solid #9EADA0; border-radius: 4px;">
                <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #565f58; text-transform: uppercase; letter-spacing: 0.5px;">Today's Prompt</p>
                <p style="margin: 0 0 16px; font-size: 16px; color: #292524; line-height: 1.6;">${todaysPrompt.prompt}</p>
                <p style="margin: 0; font-size: 14px; color: #57534e; line-height: 1.5; font-style: italic;">(Or simply share whatever you feel grateful for today)</p>
              </div>
              ${
                yesterdayCount
                  ? `
              <div style="margin-bottom: 24px; padding: 16px; background-color: #f5f5f4; border-radius: 6px; text-align: center;">
                <p style="margin: 0; font-size: 14px; color: #57534e; line-height: 1.5;">Yesterday, <strong style="color: #292524;">${yesterdayCount} ${yesterdayCount === 1 ? "person" : "people"}</strong> practiced gratitude</p>
              </div>`
                  : ""
              }
              <div style="margin-bottom: 24px; text-align: center;">
                <a href="${wallUrl}" style="display: inline-block; padding: 14px 28px; background-color: #9EADA0; color: #1E1F21; text-decoration: none; border-radius: 999px; font-size: 16px; font-weight: 600;">Share on the Gratitude Wall</a>
              </div>
              <p style="margin: 0 0 24px; text-align: center; font-size: 15px;">
                <a href="${todayUrl}" style="color: #565f58; text-decoration: underline;">Visit Today at Grateful Today</a>
              </p>
              ${
                milestoneUrl
                  ? `
              <div style="margin-bottom: 24px; padding: 20px; background-color: #f5f7f6; border-radius: 8px; text-align: center;">
                <p style="margin: 0 0 12px; font-size: 15px; color: #3c423d;">Today is your milestone. It counts.</p>
                <a href="${milestoneUrl}" style="display: inline-block; padding: 12px 24px; background-color: #565f58; color: #ffffff; text-decoration: none; border-radius: 999px; font-size: 15px; font-weight: 600;">Celebrate with a chip</a>
              </div>`
                  : ""
              }
              <div style="padding: 16px; background-color: #f5f5f4; border-radius: 6px;">
                <p style="margin: 0; font-size: 14px; color: #57534e; line-height: 1.5; text-align: center;">Read what others are grateful for, share your own, or make a 15-second gratitude video on your device.</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background-color: #fafaf9; border-top: 1px solid #e7e5e4;">
              <p style="margin: 0 0 12px; font-size: 13px; color: #78716c; line-height: 1.5;">You're receiving this at ${recipientEmail} because you opted in to ${frequency} gratitude reminders at gratefultoday.com.</p>
              <p style="margin: 0 0 8px; font-size: 13px; color: #78716c; line-height: 1.5;">You can change your email frequency or update your sobriety date anytime:</p>
              <p style="margin: 0; font-size: 12px; color: #a8a29e; line-height: 1.5;"><a href="${preferencesUrl}" style="color: #78716c; text-decoration: underline;">Manage all preferences</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

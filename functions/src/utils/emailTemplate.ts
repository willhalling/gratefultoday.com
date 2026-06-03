/**
 * Email template utilities for Grateful Today newsletter
 *
 * Simple, calm, recovery-aware gratitude reminders
 * No AI-generated content - just gentle daily/weekly reminders
 */

import { getTodaysPrompt, getDayOfYear as getPromptDayOfYear } from '../constants/dailyPrompts';

interface DailyPrompt {
  subject: string;
  intro: string;
  prompt: string;
  tags: string[];
}

export interface EmailTemplateData {
  recipientEmail: string;
  firstName?: string;
  frequency: 'daily' | 'weekly';
  isTest?: boolean;
  yesterdayCount?: number;
}

/**
 * Get subject line with prompt subject and formatted date
 */
export function getSubjectLine(promptSubject: string, date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  return `${promptSubject} | ${day} ${month}`;
}

/**
 * Generate the complete email HTML template
 */
export function generateEmailHTML(data: EmailTemplateData): string {
  const { recipientEmail, firstName, frequency, isTest = false, yesterdayCount } = data;
  const preferencesUrl = `https://gratefultoday.com/newsletter/preferences?email=${encodeURIComponent(recipientEmail)}`;
  const wallUrl = `https://gratefultoday.com/wall?email=${encodeURIComponent(recipientEmail)}`;

  // Get today's daily prompt
  const todaysPrompt = getTodaysPrompt() as DailyPrompt;
  
  // Get subject line with prompt subject and formatted date
  const subject = getSubjectLine(todaysPrompt.subject, new Date());

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
          
          <!-- Header -->
          <tr>
            <td style="background-color: #9EADA0; padding: 40px 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                ${todaysPrompt.subject}
              </h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px;">
              
              <!-- Intro -->
              <div style="margin-bottom: 32px;">
                <p style="margin: 0; font-size: 16px; color: #44403c; line-height: 1.6;">
                  ${todaysPrompt.intro}
                </p>
              </div>

              <!-- Today's Gratitude Prompt -->
              <div style="margin-bottom: 32px; padding: 20px; background-color: #fafaf9; border-left: 3px solid #78716c; border-radius: 4px;">
                <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #78716c; text-transform: uppercase; letter-spacing: 0.5px;">
                  Today's Prompt
                </p>
                <p style="margin: 0 0 16px 0; font-size: 16px; color: #292524; line-height: 1.6;">
                  ${todaysPrompt.prompt}
                </p>
                <p style="margin: 0; font-size: 14px; color: #57534e; line-height: 1.5; font-style: italic;">
                  (Or simply share whatever you feel grateful for today)
                </p>
              </div>

              ${yesterdayCount ? `
              <!-- Yesterday Stats -->
              <div style="margin-bottom: 24px; padding: 16px; background-color: #f5f5f4; border-radius: 6px; text-align: center;">
                <p style="margin: 0; font-size: 14px; color: #57534e; line-height: 1.5;">
                  Yesterday, <strong style="color: #292524;">${yesterdayCount} ${yesterdayCount === 1 ? 'person' : 'people'}</strong> practiced gratitude
                </p>
              </div>
              ` : ''}

              <!-- CTA Button -->
              <div style="margin-bottom: 24px; text-align: center;">
                <a href="${wallUrl}" style="display: inline-block; padding: 14px 28px; background-color: #78716c; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">
                  Share Your Gratitude
                </a>
              </div>

              <!-- Gratitude Wall Description -->
              <div style="margin-bottom: 32px; padding: 16px; background-color: #f5f5f4; border-radius: 6px;">
                <p style="margin: 0; font-size: 14px; color: #57534e; line-height: 1.5; text-align: center;">
                  This link will take you to the Gratitude Wall where you can see what others around the world are grateful for and share your own.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafaf9; border-radius: 0 0 8px 8px; border-top: 1px solid #e7e5e4;">
              <p style="margin: 0 0 12px 0; font-size: 13px; color: #78716c; line-height: 1.5;">
                You're receiving this at ${recipientEmail} because you opted in to ${frequency} gratitude reminders at gratefultoday.com.
              </p>
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #78716c; line-height: 1.5;">
                You can change your email frequency or update your sobriety date anytime:
              </p>
              <p style="margin: 0; font-size: 12px; color: #a8a29e; line-height: 1.5;">
                <a href="${preferencesUrl}" style="color: #78716c; text-decoration: underline;">Manage all preferences</a>
              </p>
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

/**
 * Get day of year (1-366)
 */
export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

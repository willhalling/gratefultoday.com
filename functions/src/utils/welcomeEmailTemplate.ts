/**
 * Welcome Email Template for new subscribers
 * Sent when someone first subscribes to the newsletter
 */

interface WelcomeEmailData {
  recipientEmail: string;
  firstName?: string;
  frequency: 'daily' | 'weekly';
}

/**
 * Generate welcome email HTML content
 */
export function generateWelcomeEmailHTML(data: WelcomeEmailData): string {
  const { recipientEmail, firstName, frequency } = data;
  const wallUrl = `https://gratefultoday.com/wall`;
  const preferencesUrl = `https://gratefultoday.com/newsletter/preferences?email=${encodeURIComponent(recipientEmail)}`;

  const greeting = firstName ? `Hi ${firstName}` : 'Hi there';
  const frequencyText = frequency === 'daily' ? 'every morning' : 'every Monday';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Grateful Today</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f4; line-height: 1.6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f4;">
    <tr>
      <td style="padding: 32px 16px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; background-color: #fafaf9; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #292524; line-height: 1.3;">
                Welcome to Grateful Today
              </h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">

              <!-- Welcome Message -->
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #292524; line-height: 1.6;">
                ${greeting},
              </p>

              <p style="margin: 0 0 24px 0; font-size: 16px; color: #292524; line-height: 1.6;">
                You're all set. ${frequencyText} you'll get a simple gratitude prompt in your inbox. No pressure, no perfection required.
              </p>

              <p style="margin: 0 0 24px 0; font-size: 16px; color: #292524; line-height: 1.6;">
                You can answer the prompt we send, or simply share whatever you feel grateful for today. There's no wrong way to do this.
              </p>

              <p style="margin: 0 0 24px 0; font-size: 16px; color: #292524; line-height: 1.6;">
                Sometimes it helps to notice what's working, even on days when it doesn't feel like much. That's what this is for.
              </p>

              <!-- What to Expect -->
              <div style="margin-bottom: 32px; padding: 20px; background-color: #fafaf9; border-left: 3px solid #78716c; border-radius: 4px;">
                <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #292524;">
                  What to expect:
                </p>
                <ul style="margin: 0; padding-left: 20px; font-size: 15px; color: #57534e; line-height: 1.6;">
                  <li style="margin-bottom: 8px;">A simple question ${frequencyText} to help you reflect</li>
                  <li style="margin-bottom: 8px;">Answer our prompt or share whatever you're grateful for</li>
                  <li style="margin-bottom: 8px;">No guilt if you miss one, just pick back up when you're ready</li>
                  <li style="margin-bottom: 8px;">Option to share anonymously on our community wall</li>
                  <li>Update your preferences anytime from any email</li>
                </ul>
              </div>

              <p style="margin: 0 0 32px 0; font-size: 16px; color: #292524; line-height: 1.6;">
                Want to see what others are grateful for? Check out the wall.
              </p>

              <!-- CTA Button -->
              <div style="margin-bottom: 24px; text-align: center;">
                <a href="${wallUrl}" style="display: inline-block; padding: 14px 28px; background-color: #78716c; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">
                  Visit the Gratitude Wall
                </a>
              </div>

              <!-- Wall Description -->
              <div style="margin-bottom: 32px; padding: 16px; background-color: #f5f5f4; border-radius: 6px;">
                <p style="margin: 0; font-size: 14px; color: #57534e; line-height: 1.5; text-align: center;">
                  The Gratitude Wall is where our community shares what they're thankful for. It's anonymous, real, and encouraging.
                </p>
              </div>

              <p style="margin: 0 0 8px 0; font-size: 16px; color: #292524; line-height: 1.6;">
                Glad you're here.
              </p>

              <p style="margin: 0; font-size: 16px; color: #78716c; line-height: 1.6;">
                - Grateful Today
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafaf9; border-radius: 0 0 8px 8px; border-top: 1px solid #e7e5e4;">
              <p style="margin: 0 0 12px 0; font-size: 13px; color: #78716c; line-height: 1.5;">
                You're receiving this at ${recipientEmail} because you just signed up for ${frequency} gratitude reminders.
              </p>
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #78716c; line-height: 1.5;">
                Change your frequency anytime:
              </p>
              <p style="margin: 0; font-size: 12px; color: #a8a29e; line-height: 1.5;">
                <a href="${preferencesUrl}" style="color: #78716c; text-decoration: underline;">Manage preferences</a>
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

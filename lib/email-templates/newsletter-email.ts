import { NewsletterContent } from '@/components/newsletter/NewsletterTemplate';

/**
 * Generate HTML email template for newsletter
 * Uses inline styles and table-based layout for email client compatibility
 */
export function generateNewsletterEmail(content: NewsletterContent): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Main Container -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; border-bottom: 1px solid #e5e5e5;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #737373;">${content.date}</p>
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #171717; line-height: 1.2;">
                ${content.title}
              </h1>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 40px 0 40px;">
              <p style="margin: 0; font-size: 16px; color: #262626; line-height: 1.6;">
                ${content.greeting}
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 20px 40px;">
              ${content.mainContent.map(paragraph => `
                <p style="margin: 0 0 16px 0; font-size: 16px; color: #262626; line-height: 1.6;">
                  ${paragraph.split('\n').join('<br>')}
                </p>
              `).join('')}
            </td>
          </tr>

          <!-- Closing Thought / Signature -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0; font-size: 16px; color: #262626; line-height: 1.6;">
                — ${content.closingThought}
              </p>
            </td>
          </tr>

          <!-- Call to Action -->
          ${content.callToAction ? `
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0; font-size: 16px; color: #262626; line-height: 1.6; font-style: italic;">
                ${content.callToAction.split('\n').join('<br>')}
              </p>
            </td>
          </tr>
          ` : ''}

          <!-- Links -->
          <tr>
            <td style="padding: 20px 40px 40px 40px;">
              <ul style="margin: 0; padding: 0; list-style: none; font-size: 16px; line-height: 1.6;">
                <li style="margin: 0 0 4px 0;">
                  <a href="https://iam.gratefultoday.com" style="color: #f59e0b; text-decoration: none;">Share Gratitude</a>
                </li>
                <li style="margin: 0 0 4px 0;">
                  <a href="https://gratefultoday.com" style="color: #737373; text-decoration: none;">Grateful Today Homepage</a>
                </li>
                <li style="margin: 0;">
                  <a href="https://www.youtube.com/@GratefulToday" style="color: #737373; text-decoration: none;">YouTube</a>
                </li>
              </ul>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #fafafa; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #737373; text-align: center;">
                GratefulToday
              </p>
              <p style="margin: 0; font-size: 12px; color: #a3a3a3; text-align: center;">
                <a href="{{unsubscribeUrl}}" style="color: #737373; text-decoration: underline;">Unsubscribe</a>
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

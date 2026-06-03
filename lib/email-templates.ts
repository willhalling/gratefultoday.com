// Grateful Today Email Templates
// Brand colors matching tailwind.config.js

export const BRAND_COLORS = {
  primary: '#9EADA0', // Muted Sage Green
  primaryDark: '#565f58', // Dark sage for text
  secondary: '#EFC98A', // Warm Sand
  accent: '#B1977C', // Warm Taupe
  neutral: '#1E1F21', // Charcoal
  neutralLight: '#F2F2EF', // Soft Off-White
  text: '#333333',
  textMuted: '#666666',
  background: '#f5f5f5',
  white: '#ffffff',
  border: '#e5e7eb',
};

interface EmailTemplateProps {
  name: string;
  content: string;
  buttonText?: string;
  buttonUrl?: string;
  afterContent?: string;
  footer?: string;
}

/**
 * Base email template wrapper with Grateful Today branding
 */
export function getEmailTemplate({
  name,
  content,
  buttonText,
  buttonUrl,
  afterContent,
  footer = 'Grateful Today | Supporting recovery through gratitude',
}: EmailTemplateProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Grateful Today</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${BRAND_COLORS.background};">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${BRAND_COLORS.background}; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: ${BRAND_COLORS.white}; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${BRAND_COLORS.primary}; padding: 40px 40px 30px; text-align: center;">
              <h1 style="color: ${BRAND_COLORS.white}; margin: 0; font-size: 28px; font-weight: 700;">Grateful Today</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Hi ${name},</p>
              
              ${content}
              
              ${
                buttonText && buttonUrl
                  ? `
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 30px 0;">
                    <a href="${buttonUrl}" style="display: inline-block; background-color: ${BRAND_COLORS.accent}; color: ${BRAND_COLORS.white}; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 18px; font-weight: 600;">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
              </table>
              `
                  : ''
              }

              ${afterContent ? afterContent : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: ${BRAND_COLORS.neutralLight}; padding: 30px 40px; text-align: center; border-top: 1px solid ${BRAND_COLORS.border};">
              <p style="color: ${BRAND_COLORS.textMuted}; font-size: 12px; line-height: 1.6; margin: 0;">
                ${footer}
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
 * Email template for gratitude challenge download with confirmation
 */
export function getDownloadEmailTemplate(name: string, downloadUrl: string, email: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://gratefultoday.com';
  const downloadLink = `${baseUrl}${downloadUrl}`;

  const content = `
    <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
      You're about to begin something beautiful. The <strong>7-Day Gratitude Challenge for Recovery</strong> is ready for you.
    </p>
    
    <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
      Click below to confirm your email and start your journey:
    </p>
  `;

  const footer = `
    <p style="color: ${BRAND_COLORS.textMuted}; font-size: 12px; line-height: 1.6; margin: 0 0 10px;">
      Grateful Today | Supporting recovery through gratitude
    </p>
    <p style="color: ${BRAND_COLORS.textMuted}; font-size: 12px; line-height: 1.6; margin: 0;">
      <a href="${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="color: ${BRAND_COLORS.primaryDark}; text-decoration: none;">Unsubscribe</a>
    </p>
  `;

  return getEmailTemplate({
    name,
    content,
    buttonText: 'Begin Your Challenge',
    buttonUrl: `${downloadLink}?verified=true`,
    footer,
  });
}

/**
 * Email template for subscription confirmation (no download)
 */
export function getConfirmationEmailTemplate(name: string, email: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://gratefultoday.com';

  const content = `
    <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
      Welcome to Grateful Today! We're glad you're here.
    </p>
    
    <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
      Please confirm your email to start receiving weekly recovery resources and gratitude prompts.
    </p>
  `;

  return getEmailTemplate({
    name,
    content,
    buttonText: 'Confirm Email',
    buttonUrl: `${baseUrl}/confirm?email=${encodeURIComponent(email)}`,
  });
}

/**
 * Email template for welcome message after confirmation
 */
export function getWelcomeEmailTemplate(name: string): string {
  const content = `
    <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
      Your email has been confirmed! 🎉
    </p>
    
    <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
      You'll start receiving weekly gratitude prompts and recovery resources. Each week, you'll get practical exercises to help you build a stronger gratitude practice.
    </p>
    
    <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0;">
      See you soon,<br>
      <strong>Grateful Today</strong>
    </p>
  `;

  return getEmailTemplate({
    name,
    content,
  });
}

/**
 * Email template for Week Journey daily prompt (Day 1–7)
 */
export function getWeekJourneyDayEmailTemplate(name: string, day: number, dayUrl: string): string {
  const content = `
    <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
      Your <strong>Day ${day}</strong> prompt is ready.
    </p>
    <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
      Tap the button below to open Day ${day}.
    </p>
  `;

  const afterContent = `
    <p style="color: ${BRAND_COLORS.textMuted}; font-size: 12px; line-height: 1.6; margin: 0;">
      If the button doesn’t work, copy this link into your browser:<br/>
      <span style="word-break: break-all;">${dayUrl}</span>
    </p>
  `;

  return getEmailTemplate({
    name,
    content,
    buttonText: `Open Day ${day}`,
    buttonUrl: dayUrl,
    afterContent,
  });
}

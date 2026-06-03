import { logger } from 'firebase-functions';
import { defineString } from 'firebase-functions/params';
import { onCall } from 'firebase-functions/v2/https';
import { fetch } from 'undici';
import { generateEmailHTML, getDayOfYear } from './utils/emailTemplate';
import { getTodaysPrompt } from './constants/dailyPrompts';

const BREVO_API_KEY = defineString('BREVO_API_KEY');
const SENDER_EMAIL = defineString('BREVO_SENDER_EMAIL');

/**
 * Callable function to test sending newsletter to a specific email
 * Usage: Call from Firebase Console or admin panel
 */
export const testSendNewsletter = onCall(
  {
    region: 'us-central1',
  },
  async (request) => {
    // Only allow admin users
    if (!request.auth) {
      throw new Error('Not authenticated');
    }

    const { email, frequency = 'daily' } = request.data as {
      email: string;
      frequency?: 'daily' | 'weekly';
    };

    if (!email) {
      throw new Error('Email is required');
    }

    const brevoKey = BREVO_API_KEY.value();
    const senderEmail = SENDER_EMAIL.value() || 'newsletter@mail.gratefultoday.com';

    if (!brevoKey) {
      throw new Error('BREVO_API_KEY not configured');
    }

    try {
      const now = new Date();
      const html = generateEmailHTML({
        recipientEmail: email,
        frequency,
        isTest: true,
      });

      const todaysPrompt = getTodaysPrompt();
      const dayNumber = getDayOfYear(new Date());
      const subject = `[TEST] ${todaysPrompt.subject} | day ${dayNumber}`;

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'api-key': brevoKey,
        },
        body: JSON.stringify({
          sender: { email: senderEmail, name: 'Grateful Today' },
          to: [{ email }],
          subject: subject,
          htmlContent: html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Failed to send test email:', errorText);
        throw new Error('Failed to send test email');
      }

      logger.info(`Test newsletter sent to ${email}`);
      return { success: true, message: `Test newsletter sent to ${email}` };
    } catch (error) {
      logger.error('Error sending test newsletter:', error);
      throw error;
    }
  }
);

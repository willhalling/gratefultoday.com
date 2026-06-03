import { logger } from 'firebase-functions';
import { defineString } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { fetch } from 'undici';
import { generateWelcomeEmailHTML } from './utils/welcomeEmailTemplate';

const BREVO_API_KEY = defineString('BREVO_API_KEY');
const SENDER_EMAIL = defineString('BREVO_SENDER_EMAIL');

/**
 * HTTP endpoint to send welcome email to new subscribers
 * Called when a new user subscribes to the newsletter
 */
export const sendWelcomeEmail = onRequest(
  {
    region: 'us-central1',
    cors: true,
  },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { email, firstName, frequency = 'daily' } = request.body as {
      email?: string;
      firstName?: string;
      frequency?: 'daily' | 'weekly';
    };

    if (!email) {
      response.status(400).json({ error: 'Email is required' });
      return;
    }

    const brevoKey = BREVO_API_KEY.value();
    const senderEmail = SENDER_EMAIL.value() || 'newsletter@mail.gratefultoday.com';

    if (!brevoKey) {
      response.status(500).json({ error: 'BREVO_API_KEY not configured' });
      return;
    }

    try {
      const html = generateWelcomeEmailHTML({
        recipientEmail: email,
        firstName,
        frequency,
      });

      const subject = 'welcome to grateful today';

      const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
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

      if (!brevoResponse.ok) {
        const errorText = await brevoResponse.text();
        logger.error('Failed to send welcome email:', errorText);
        response.status(500).json({ error: 'Failed to send welcome email' });
        return;
      }

      logger.info(`Welcome email sent to ${email}`);
      response.status(200).json({ success: true, message: `Welcome email sent to ${email}` });
    } catch (error) {
      logger.error('Error sending welcome email:', error);
      response.status(500).json({ error: 'Internal server error' });
    }
  }
);

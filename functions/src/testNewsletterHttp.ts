import { logger } from 'firebase-functions';
import { defineString } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { fetch } from 'undici';
import { generateEmailHTML, getDayOfYear } from './utils/emailTemplate';
import { getTodaysPrompt } from './constants/dailyPrompts';
import * as admin from 'firebase-admin';

const BREVO_API_KEY = defineString('BREVO_API_KEY');
const SENDER_EMAIL = defineString('BREVO_SENDER_EMAIL');

/**
 * HTTP endpoint to test sending newsletter
 * Usage: curl -X POST https://[function-url] -H "Content-Type: application/json" -d '{"email":"test@example.com","frequency":"daily"}'
 */
export const testNewsletterHttp = onRequest(
  {
    region: 'us-central1',
    cors: true,
  },
  async (request, response) => {
    // Only allow POST requests
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const {
      email,
      frequency = 'daily',
      firstName,
    } = request.body as {
      email?: string;
      frequency?: 'daily' | 'weekly';
      firstName?: string;
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
      // Fetch firstName from Brevo if not provided
      let actualFirstName = firstName;
      if (!actualFirstName) {
        try {
          const contactResponse = await fetch(
            `https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`,
            {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                'api-key': brevoKey,
              },
            }
          );

          if (contactResponse.ok) {
            const contactData = (await contactResponse.json()) as {
              attributes?: { FIRSTNAME?: string };
            };
            actualFirstName = contactData.attributes?.FIRSTNAME;
          }
        } catch (error) {
          logger.warn('Could not fetch contact info from Brevo:', error);
        }
      }

      // Get yesterday's post count
      const db = admin.firestore();
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);

      let yesterdayCount = 0;
      try {
        // Query without where clauses to avoid index requirement, filter in memory
        const snapshot = await db
          .collection('gratitudePosts')
          .orderBy('createdAt', 'desc')
          .limit(200)
          .get();
        
        // Count posts from yesterday that are not archived
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          
          // Skip archived posts
          if (data.isArchived === true) {
            return;
          }
          
          let createdAt;
          
          // Handle Firestore Timestamp
          if (data.createdAt?._seconds) {
            createdAt = new Date(data.createdAt._seconds * 1000);
          } else if (data.createdAt?.toDate) {
            createdAt = data.createdAt.toDate();
          } else if (data.createdAt) {
            createdAt = new Date(data.createdAt);
          }
          
          if (createdAt && createdAt >= yesterday && createdAt <= yesterdayEnd) {
            yesterdayCount++;
          }
        });
        
        logger.info(`Yesterday's post count: ${yesterdayCount}`);
      } catch (error) {
        logger.warn('Error counting yesterday posts:', error);
      }

      const html = generateEmailHTML({
        recipientEmail: email,
        firstName: actualFirstName,
        frequency,
        isTest: true,
        yesterdayCount,
      });

      const todaysPrompt = getTodaysPrompt();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateStr = `${now.getDate()} ${months[now.getMonth()]}`;
      const subject = `[TEST] ${todaysPrompt.subject} | ${dateStr}`;

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
        logger.error('Failed to send test email:', errorText);
        response.status(500).json({ error: 'Failed to send test email', details: errorText });
        return;
      }

      logger.info(`Test newsletter sent to ${email}`);
      response.status(200).json({ success: true, message: `Test newsletter sent to ${email}` });
    } catch (error) {
      logger.error('Error sending test newsletter:', error);
      response.status(500).json({ error: 'Internal server error' });
    }
  }
);

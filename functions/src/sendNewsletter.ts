import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { defineString } from 'firebase-functions/params';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { fetch } from 'undici';
import { generateEmailHTML, getDayOfYear } from './utils/emailTemplate';
import { getTodaysPrompt } from './constants/dailyPrompts';

// Runtime config
const BREVO_API_KEY = defineString('BREVO_API_KEY');
const BREVO_DAILY_LIST_ID = defineString('BREVO_DAILY_LIST_ID'); // List 2
const BREVO_WEEKLY_LIST_ID = defineString('BREVO_WEEKLY_LIST_ID'); // List 4
const SENDER_EMAIL = defineString('BREVO_SENDER_EMAIL');

/**
 * Scheduled function to send newsletter at 7am UTC
 * Sends to daily list (ID 2) every day
 * Sends to weekly list (ID 4) on Mondays only
 */
export const sendNewsletter = onSchedule(
  {
    region: 'us-central1',
    schedule: '0 7 * * *', // Every day at 7am UTC (cron format)
    timeZone: 'UTC',
  },
  async () => {
    const brevoKey = BREVO_API_KEY.value();
    const dailyListId = BREVO_DAILY_LIST_ID.value();
    const weeklyListId = BREVO_WEEKLY_LIST_ID.value();
    const senderEmail = SENDER_EMAIL.value() || 'newsletter@mail.gratefultoday.com';

    if (!brevoKey) {
      logger.error('BREVO_API_KEY not configured');
      return;
    }

    try {
      const db = admin.firestore();
      const now = new Date();
      const dayOfYear = getDayOfYear(now);
      const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
      const isMonday = dayOfWeek === 1;

      let totalSuccessCount = 0;
      let totalErrorCount = 0;

      // Send to daily subscribers (List 2)
      if (dailyListId) {
        const dailyContacts = await fetchBrevoListContacts(brevoKey, parseInt(dailyListId));
        logger.info(`Sending to ${dailyContacts.length} daily subscribers`);

        const { successCount, errorCount } = await sendToContacts(
          dailyContacts,
          'daily',
          now,
          brevoKey,
          senderEmail
        );

        totalSuccessCount += successCount;
        totalErrorCount += errorCount;
      }

      // Send to weekly subscribers (List 4) - only on Mondays
      if (weeklyListId && isMonday) {
        const weeklyContacts = await fetchBrevoListContacts(brevoKey, parseInt(weeklyListId));
        logger.info(`Sending to ${weeklyContacts.length} weekly subscribers (Monday)`);

        const { successCount, errorCount } = await sendToContacts(
          weeklyContacts,
          'weekly',
          now,
          brevoKey,
          senderEmail
        );

        totalSuccessCount += successCount;
        totalErrorCount += errorCount;
      } else if (weeklyListId) {
        logger.info('Skipping weekly list (not Monday)');
      }

      // Log sent record to Firestore
      await db.collection('newsletterSentLog').add({
        dayOfYear,
        date: now,
        dailySent: dailyListId ? totalSuccessCount : 0,
        weeklySent: isMonday && weeklyListId ? totalSuccessCount : 0,
        errors: totalErrorCount,
      });

      logger.info(
        `Newsletter sent for day ${dayOfYear}: ${totalSuccessCount} succeeded, ${totalErrorCount} failed`
      );
    } catch (error) {
      logger.error('Error in sendNewsletter:', error);
    }
  }
);

/**
 * Send emails to a list of contacts
 */
async function sendToContacts(
  contacts: Array<{ email: string; name?: string }>,
  frequency: 'daily' | 'weekly',
  date: Date,
  brevoKey: string,
  senderEmail: string
) {
  let successCount = 0;
  let errorCount = 0;

  // Get yesterday's post count
  const db = admin.firestore();
  const yesterday = new Date(date);
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
    logger.error('Error counting yesterday posts:', error);
  }

  for (const contact of contacts) {
    try {
      const html = generateEmailHTML({
        recipientEmail: contact.email,
        firstName: contact.name,
        frequency,
        isTest: false,
        yesterdayCount,
      });

      const todaysPrompt = getTodaysPrompt();
      const now = new Date();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateStr = `${now.getDate()} ${months[now.getMonth()]}`;
      const subject = `${todaysPrompt.subject} | ${dateStr}`;

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'api-key': brevoKey,
        },
        body: JSON.stringify({
          sender: { email: senderEmail, name: 'Grateful Today' },
          to: [{ email: contact.email, name: contact.name }],
          subject: subject,
          htmlContent: html,
        }),
      });

      if (response.ok) {
        successCount++;
      } else {
        const errorText = await response.text();
        logger.error(`Failed to send to ${contact.email}:`, errorText);
        errorCount++;
      }

      // Add small delay to avoid rate limiting
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      logger.error(`Error sending to ${contact.email}:`, error);
      errorCount++;
    }
  }

  return { successCount, errorCount };
}

/**
 * Fetch all contacts from a Brevo list
 */
async function fetchBrevoListContacts(
  apiKey: string,
  listId: number
): Promise<Array<{ email: string; name?: string }>> {
  try {
    const response = await fetch(
      `https://api.brevo.com/v3/contacts/lists/${listId}/contacts?limit=500`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'api-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      logger.error('Failed to fetch Brevo contacts:', await response.text());
      return [];
    }

    const data = (await response.json()) as {
      contacts: Array<{ email: string; attributes?: { FIRSTNAME?: string } }>;
    };

    return data.contacts.map((c) => ({
      email: c.email,
      name: c.attributes?.FIRSTNAME,
    }));
  } catch (error) {
    logger.error('Error fetching Brevo contacts:', error);
    return [];
  }
}

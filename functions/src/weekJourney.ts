import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { defineString } from 'firebase-functions/params';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
// Types are inferred from onDocumentCreated; explicit imports not needed
import { fetch } from 'undici';

// Initialize Admin SDK once
if (!admin.apps.length) {
  admin.initializeApp();
}

// Runtime config via Params (set in Firebase Functions config)
const BREVO_API_KEY = defineString('BREVO_API_KEY');
const APP_URL = defineString('APP_URL');
const SENDER_EMAIL = defineString('BREVO_SENDER_EMAIL');

// Template IDs no longer used; bypassing templates for direct HTML sends.

// Response submissions no longer trigger immediate next-day emails; scheduler handles cadence
export const onDayResponseSubmitted = onDocumentCreated(
  { region: 'us-central1', document: 'weekJourneyUsers/{userId}/responses/{dayDocId}' },
  async (event) => {
    const { userId, dayDocId } = event.params as unknown as {
      userId: string;
      dayDocId: string;
    };
    const match = /^day-(\d+)$/.exec(dayDocId);
    const day = match ? parseInt(match[1], 10) : NaN;

    if (Number.isNaN(day)) {
      logger.error('Invalid day doc id:', dayDocId);
      return;
    }

    try {
      await admin
        .firestore()
        .collection('weekJourneyUsers')
        .doc(userId)
        .update({ lastResponseAt: admin.firestore.FieldValue.serverTimestamp() });
      logger.info(`Recorded response for user ${userId}, day ${day}`);
    } catch (error) {
      logger.error('Error updating lastResponseAt:', error as Error);
    }
  }
);

function getLocalDateParts(tz: string, d: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value;
      return acc;
    }, {});
  const dateStr = `${parts.year}-${parts.month}-${parts.day}`;
  const hour = parseInt(parts.hour || '0', 10);
  return { dateStr, hour };
}

export const sendScheduledWeekJourneyEmails = onSchedule(
  {
    region: 'us-central1',
    schedule: 'every 15 minutes',
    timeZone: 'UTC',
  },
  async () => {
    const appUrl = APP_URL.value() || 'https://gratefultoday.com';
    const brevoKey = BREVO_API_KEY.value();
    const senderEmail = SENDER_EMAIL.value() || 'newsletter@mail.gratefultoday.com';

    if (!brevoKey) {
      logger.error('BREVO_API_KEY not configured; skipping scheduled emails');
      return;
    }

    const db = admin.firestore();
    const now = new Date();

    // Process in batches to avoid timeouts
    const snapshot = await db.collection('weekJourneyUsers').limit(200).get();

    let processed = 0;
    type UserDoc = {
      email?: string;
      timezone?: string;
      preferredHour?: number;
      lastSentDaySent?: number;
      lastSentLocalDate?: string;
    };
    for (const doc of snapshot.docs) {
      const user = doc.data() as UserDoc;
      const uid = doc.id;
      const email: string | undefined = user.email;
      if (!email) continue;

      const tz = (user.timezone as string) || 'UTC';
      const preferredHour: number = typeof user.preferredHour === 'number' ? user.preferredHour : 8;
      const lastSentDaySent: number =
        typeof user.lastSentDaySent === 'number' ? user.lastSentDaySent : 1; // Day 1 sent at signup
      if (lastSentDaySent >= 7) continue;

      const { dateStr, hour } = getLocalDateParts(tz, now);
      const lastSentLocalDate: string | undefined = user.lastSentLocalDate;

      // Only send once per local day, after preferredHour
      if (hour < preferredHour) continue;
      if (lastSentLocalDate === dateStr) continue;

      const nextDay = lastSentDaySent + 1;
      const nameFromEmail = email.split('@')[0].split(/[._-]/)[0] || 'there';

      try {
        const customToken = await admin.auth().createCustomToken(uid, {
          weekJourney: true,
          email,
        });
        const url = `${appUrl}/just-for-a-week/day-${nextDay}?token=${customToken}`;
        const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#f5f5f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);"><tr><td style="background:#9EADA0;padding:40px;text-align:center;"><h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">Grateful Today</h1></td></tr><tr><td style="padding:40px;"><p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 20px;">Hi ${nameFromEmail},</p><p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 20px;">Your <strong>Day ${nextDay}</strong> prompt is ready.</p><p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 30px;">Tap the button below to open Day ${nextDay}.</p><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:30px 0;"><a href="${url}" style="display:inline-block;background:#B1977C;color:#fff;text-decoration:none;padding:16px 40px;border-radius:6px;font-size:18px;font-weight:600;">Open Day ${nextDay}</a></td></tr></table><p style="color:#666;font-size:12px;line-height:1.6;margin:0;">If the button doesn’t work, copy this link:<br/><span style="word-break:break-all;">${url}</span></p></td></tr><tr><td style="background:#F2F2EF;padding:30px 40px;text-align:center;border-top:1px solid #e5e7eb;"><p style="color:#666;font-size:12px;line-height:1.6;margin:0;">Grateful Today | Supporting recovery through gratitude</p></td></tr></table></td></tr></table></body></html>`;

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
            subject: `Your Day ${nextDay} Prompt — Just For a Week`,
            htmlContent: html,
          }),
        });

        if (!response.ok) {
          logger.error('Failed to send scheduled email:', await response.text());
          continue;
        }

        await doc.ref.update({
          lastSentDaySent: nextDay,
          lastSentLocalDate: dateStr,
          updatedAt: new Date().toISOString(),
        });
        processed += 1;
      } catch (err) {
        logger.error(`Error scheduling send for ${uid}:`, err as Error);
      }
    }

    logger.info(`Scheduled email run complete. Processed: ${processed}`);
  }
);

// Generate video when all 7 days are complete
export const onDay7Completed = onDocumentCreated(
  { region: 'us-central1', document: 'weekJourneyUsers/{userId}/responses/{dayDocId}' },
  async (event) => {
    const { userId, dayDocId } = event.params as unknown as {
      userId: string;
      dayDocId: string;
    };
    if (dayDocId !== 'day-7') return;

    try {
      const userDoc = await admin.firestore().collection('weekJourneyUsers').doc(userId).get();

      if (!userDoc.exists) {
        logger.error('User not found:', userId);
        return;
      }

      const responsesSnapshot = await admin
        .firestore()
        .collection('weekJourneyUsers')
        .doc(userId)
        .collection('responses')
        .orderBy('day')
        .get();

      const responses = responsesSnapshot.docs.map((doc) => doc.data());

      logger.info(`Ready to generate video for user: ${userId}`);
      logger.info(`Responses count: ${responses.length}`);

      await admin.firestore().collection('weekJourneyUsers').doc(userId).update({
        videoStatus: 'generating',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // TODO: Call Remotion rendering endpoint here
    } catch (error) {
      logger.error('Error generating video:', error as Error);
    }
  }
);

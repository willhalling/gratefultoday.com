'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { getWeekJourneyDayEmailTemplate } from '@/lib/email-templates';
import { createWeekJourneyToken } from '@/lib/just-for-a-week-auth';
import type { WeekJourneyUser, DayResponse } from '@/types/just-for-a-week';
// Avoid importing firebase-admin at module top to prevent early env detection.

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'newsletter@mail.gratefultoday.com';
const BREVO_LIST_ID = parseInt(process.env.BREVO_LIST_ID || '0');

export async function signupForWeek(email: string, timezone?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = getFirebaseAdmin();
    
    // Create custom token for user
    const customToken = await createWeekJourneyToken(email);
    
    // Get user ID from token
    const { auth } = getFirebaseAdmin();
    const user = await auth.getUserByEmail(email);
    
    // Check if user already exists in weekJourneyUsers
    const existingUserDoc = await db.collection('weekJourneyUsers').doc(user.uid).get();
    
    if (existingUserDoc.exists) {
      const existingData = existingUserDoc.data() as WeekJourneyUser;
      const completedDaysCount = existingData.completedDays?.length || 0;
      
      // If user hasn't completed all 7 days, reject signup
      if (completedDaysCount < 7) {
        return {
          success: false,
          error: "You're already signed up! Check your email for the latest prompt."
        };
      }
      
      // User has completed all 7 days - allow them to reset/restart
      console.log(`User ${email} completed all 7 days, allowing restart`);
    }
    
    const now = new Date().toISOString();
    // Determine local date string in provided timezone for lastSentLocalDate initialization
    const tz = timezone || 'UTC';
    const todayLocal = (() => {
      try {
        const parts = new Intl.DateTimeFormat('en-CA', {
          timeZone: tz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
          .formatToParts(new Date())
          .reduce<Record<string, string>>((acc, p) => {
            if (p.type !== 'literal') acc[p.type] = p.value;
            return acc;
          }, {});
        return `${parts.year}-${parts.month}-${parts.day}`;
      } catch {
        return new Date().toISOString().slice(0, 10);
      }
    })();

    const userData: WeekJourneyUser = {
      uid: user.uid,
      email,
      startDate: now,
      completedDays: [],
      timezone: timezone || undefined,
      preferredHour: 8,
      // We send Day 1 immediately below; mark day 1 as last sent today so scheduler starts at Day 2 tomorrow 8am
      lastSentDaySent: 1,
      lastSentLocalDate: todayLocal,
      createdAt: now,
      updatedAt: now,
    };

    // Store in Firestore
    await db.collection('weekJourneyUsers').doc(user.uid).set(userData);

    // Build Day 1 URL
    const dayUrl = `${process.env.NEXT_PUBLIC_APP_URL}/just-for-a-week/day-1?token=${customToken}`;
    
    // LOG FOR LOCAL TESTING
    console.log('\n🎉 SIGNUP SUCCESS!');
    console.log('📧 Email:', email);
    console.log('🔗 Day 1 URL:', dayUrl);
    console.log('👉 Copy this URL and open it in your browser\n');

    // Send Day 1 email via Brevo without templates; require API key
    if (!BREVO_API_KEY) {
      return { success: false, error: 'Email service not configured (missing BREVO_API_KEY).' };
    }

    // Optional: add/update contact in Brevo list
    try {
      const contactRes = await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email,
          attributes: {},
          listIds: BREVO_LIST_ID > 0 ? [BREVO_LIST_ID] : undefined,
          updateEnabled: true,
        }),
      });
      // Ignore duplicate contact errors (400)
      if (!contactRes.ok && contactRes.status !== 400) {
        try {
          const body = await contactRes.json();
          console.error('Brevo contact error:', body);
        } catch {}
      }
    } catch (e) {
      console.error('Brevo contact request failed:', e);
    }

    const nameFromEmail = email.split('@')[0].split(/[._-]/)[0] || 'there';
    const html = getWeekJourneyDayEmailTemplate(nameFromEmail, 1, dayUrl);

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: BREVO_SENDER_EMAIL, name: 'Grateful Today' },
        to: [{ email }],
        subject: 'Your Day 1 Prompt — Just For a Week',
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      let errMsg = 'Failed to send email via Brevo';
      try {
        const errJson = await response.json();
        errMsg = errJson?.message || errJson?.errors?.[0]?.message || errMsg;
      } catch {}
      return { success: false, error: `${errMsg} (status ${response.status})` };
    }

    return { success: true };
  } catch (error) {
    console.error('Signup error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to sign up' 
    };
  }
}

export async function submitDayResponse(
  uid: string,
  day: number,
  prompt: string,
  response: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = getFirebaseAdmin();
    const now = new Date().toISOString();

    const dayResponse: DayResponse = {
      day,
      prompt,
      response,
      submittedAt: now,
    };

    // Store response
    await db
      .collection('weekJourneyUsers')
      .doc(uid)
      .collection('responses')
      .doc(`day-${day}`)
      .set(dayResponse);

    // Update user's completed days
    const adminModule = await import('firebase-admin');
    await db
      .collection('weekJourneyUsers')
      .doc(uid)
      .update({
        completedDays: adminModule.firestore.FieldValue.arrayUnion(day),
        updatedAt: now,
      });

    // Trigger next day email if not day 7
    if (day < 7) {
      // This will be handled by a Cloud Function listening to Firestore changes
    }

    return { success: true };
  } catch (error) {
    console.error('Submit error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit response',
    };
  }
}

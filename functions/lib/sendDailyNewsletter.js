"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDailyNewsletter = void 0;
const admin = __importStar(require("firebase-admin"));
const firebase_functions_1 = require("firebase-functions");
const params_1 = require("firebase-functions/params");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const undici_1 = require("undici");
// Runtime config
const BREVO_API_KEY = (0, params_1.defineString)('BREVO_API_KEY');
const BREVO_DAILY_LIST_ID = (0, params_1.defineString)('BREVO_DAILY_LIST_ID'); // List 2
const BREVO_WEEKLY_LIST_ID = (0, params_1.defineString)('BREVO_WEEKLY_LIST_ID'); // List 4
const SENDER_EMAIL = (0, params_1.defineString)('BREVO_SENDER_EMAIL');
/**
 * Scheduled function to send daily newsletter at 7am UTC
 * Sends to daily list (ID 2) every day
 * Sends to weekly list (ID 4) on Mondays only
 */
exports.sendDailyNewsletter = (0, scheduler_1.onSchedule)({
    region: 'us-central1',
    schedule: '0 7 * * *', // Every day at 7am UTC (cron format)
    timeZone: 'UTC',
}, async () => {
    const brevoKey = BREVO_API_KEY.value();
    const dailyListId = BREVO_DAILY_LIST_ID.value();
    const weeklyListId = BREVO_WEEKLY_LIST_ID.value();
    const senderEmail = SENDER_EMAIL.value() || 'newsletter@mail.gratefultoday.com';
    if (!brevoKey) {
        firebase_functions_1.logger.error('BREVO_API_KEY not configured');
        return;
    }
    try {
        const db = admin.firestore();
        const now = new Date();
        const dayOfYear = getDayOfYear(now);
        const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
        const isMonday = dayOfWeek === 1;
        // Get today's newsletter content from Firestore
        const newsletterDoc = await db.collection('newsletter').doc(`day-${dayOfYear}`).get();
        if (!newsletterDoc.exists) {
            firebase_functions_1.logger.warn(`No newsletter found for day ${dayOfYear}`);
            return;
        }
        const newsletter = newsletterDoc.data();
        let totalSuccessCount = 0;
        let totalErrorCount = 0;
        // Send to daily subscribers (List 2)
        if (dailyListId) {
            const dailyContacts = await fetchBrevoListContacts(brevoKey, parseInt(dailyListId));
            firebase_functions_1.logger.info(`Sending to ${dailyContacts.length} daily subscribers`);
            const { successCount, errorCount } = await sendToContacts(dailyContacts, newsletter, brevoKey, senderEmail);
            totalSuccessCount += successCount;
            totalErrorCount += errorCount;
        }
        // Send to weekly subscribers (List 4) - only on Mondays
        if (weeklyListId && isMonday) {
            const weeklyContacts = await fetchBrevoListContacts(brevoKey, parseInt(weeklyListId));
            firebase_functions_1.logger.info(`Sending to ${weeklyContacts.length} weekly subscribers (Monday)`);
            const { successCount, errorCount } = await sendToContacts(weeklyContacts, newsletter, brevoKey, senderEmail);
            totalSuccessCount += successCount;
            totalErrorCount += errorCount;
        }
        else if (weeklyListId) {
            firebase_functions_1.logger.info('Skipping weekly list (not Monday)');
        }
        // Log sent record to Firestore
        await db.collection('newsletterSentLog').add({
            dayOfYear,
            date: now,
            dailySent: dailyListId ? totalSuccessCount : 0,
            weeklySent: isMonday && weeklyListId ? totalSuccessCount : 0,
            errors: totalErrorCount,
        });
        firebase_functions_1.logger.info(`Newsletter sent for day ${dayOfYear}: ${totalSuccessCount} succeeded, ${totalErrorCount} failed`);
    }
    catch (error) {
        firebase_functions_1.logger.error('Error in sendDailyNewsletter:', error);
    }
});
/**
 * Send emails to a list of contacts
 */
async function sendToContacts(contacts, newsletter, brevoKey, senderEmail) {
    let successCount = 0;
    let errorCount = 0;
    for (const contact of contacts) {
        try {
            const html = generateNewsletterHTML(newsletter, contact.email);
            const response = await (0, undici_1.fetch)('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'api-key': brevoKey,
                },
                body: JSON.stringify({
                    sender: { email: senderEmail, name: 'Grateful Today' },
                    to: [{ email: contact.email, name: contact.name }],
                    subject: newsletter.subject,
                    htmlContent: html,
                }),
            });
            if (response.ok) {
                successCount++;
            }
            else {
                const errorText = await response.text();
                firebase_functions_1.logger.error(`Failed to send to ${contact.email}:`, errorText);
                errorCount++;
            }
            // Add small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        catch (error) {
            firebase_functions_1.logger.error(`Error sending to ${contact.email}:`, error);
            errorCount++;
        }
    }
    return { successCount, errorCount };
}
/**
 * Fetch all contacts from a Brevo list
 */
async function fetchBrevoListContacts(apiKey, listId) {
    try {
        const response = await (0, undici_1.fetch)(`https://api.brevo.com/v3/contacts/lists/${listId}/contacts?limit=500`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'api-key': apiKey,
            },
        });
        if (!response.ok) {
            firebase_functions_1.logger.error('Failed to fetch Brevo contacts:', await response.text());
            return [];
        }
        const data = (await response.json());
        return data.contacts.map((c) => ({
            email: c.email,
            name: c.attributes?.FIRSTNAME,
        }));
    }
    catch (error) {
        firebase_functions_1.logger.error('Error fetching Brevo contacts:', error);
        return [];
    }
}
/**
 * Generate HTML email from newsletter content
 */
function generateNewsletterHTML(newsletter, recipientEmail) {
    const unsubscribeUrl = `https://gratefultoday.com/unsubscribe?email=${encodeURIComponent(recipientEmail)}`;
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${newsletter.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; border-bottom: 1px solid #e5e5e5;">
              ${newsletter.date ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #737373;">${newsletter.date}</p>` : ''}
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #171717; line-height: 1.2;">
                ${newsletter.title || newsletter.subject}
              </h1>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 40px 0 40px;">
              <p style="margin: 0; font-size: 16px; color: #262626; line-height: 1.6;">
                ${newsletter.greeting}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 20px 40px;">
              <div style="font-size: 16px; color: #262626; line-height: 1.6;">
                ${newsletter.body.split('\n\n').map((p) => `<p style="margin: 0 0 16px 0;">${p.replace(/\n/g, '<br>')}</p>`).join('')}
              </div>
            </td>
          </tr>

          <!-- Signoff -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0; font-size: 16px; color: #262626; line-height: 1.6;">
                ${newsletter.signoff}
              </p>
            </td>
          </tr>

          <!-- PS -->
          ${newsletter.ps ? `
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0; font-size: 16px; color: #737373; line-height: 1.6; font-style: italic;">
                P.S. ${newsletter.ps}
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
                <a href="${unsubscribeUrl}" style="color: #737373; text-decoration: underline;">Unsubscribe</a>
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
function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

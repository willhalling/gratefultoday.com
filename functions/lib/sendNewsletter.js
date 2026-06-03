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
exports.sendNewsletter = void 0;
const admin = __importStar(require("firebase-admin"));
const firebase_functions_1 = require("firebase-functions");
const params_1 = require("firebase-functions/params");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const undici_1 = require("undici");
const emailTemplate_1 = require("./utils/emailTemplate");
const dailyPrompts_1 = require("./constants/dailyPrompts");
// Runtime config
const BREVO_API_KEY = (0, params_1.defineString)('BREVO_API_KEY');
const BREVO_DAILY_LIST_ID = (0, params_1.defineString)('BREVO_DAILY_LIST_ID'); // List 2
const BREVO_WEEKLY_LIST_ID = (0, params_1.defineString)('BREVO_WEEKLY_LIST_ID'); // List 4
const SENDER_EMAIL = (0, params_1.defineString)('BREVO_SENDER_EMAIL');
/**
 * Scheduled function to send newsletter at 7am UTC
 * Sends to daily list (ID 2) every day
 * Sends to weekly list (ID 4) on Mondays only
 */
exports.sendNewsletter = (0, scheduler_1.onSchedule)({
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
        const dayOfYear = (0, emailTemplate_1.getDayOfYear)(now);
        const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
        const isMonday = dayOfWeek === 1;
        let totalSuccessCount = 0;
        let totalErrorCount = 0;
        // Send to daily subscribers (List 2)
        if (dailyListId) {
            const dailyContacts = await fetchBrevoListContacts(brevoKey, parseInt(dailyListId));
            firebase_functions_1.logger.info(`Sending to ${dailyContacts.length} daily subscribers`);
            const { successCount, errorCount } = await sendToContacts(dailyContacts, 'daily', now, brevoKey, senderEmail);
            totalSuccessCount += successCount;
            totalErrorCount += errorCount;
        }
        // Send to weekly subscribers (List 4) - only on Mondays
        if (weeklyListId && isMonday) {
            const weeklyContacts = await fetchBrevoListContacts(brevoKey, parseInt(weeklyListId));
            firebase_functions_1.logger.info(`Sending to ${weeklyContacts.length} weekly subscribers (Monday)`);
            const { successCount, errorCount } = await sendToContacts(weeklyContacts, 'weekly', now, brevoKey, senderEmail);
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
        firebase_functions_1.logger.error('Error in sendNewsletter:', error);
    }
});
/**
 * Send emails to a list of contacts
 */
async function sendToContacts(contacts, frequency, date, brevoKey, senderEmail) {
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
            }
            else if (data.createdAt?.toDate) {
                createdAt = data.createdAt.toDate();
            }
            else if (data.createdAt) {
                createdAt = new Date(data.createdAt);
            }
            if (createdAt && createdAt >= yesterday && createdAt <= yesterdayEnd) {
                yesterdayCount++;
            }
        });
        firebase_functions_1.logger.info(`Yesterday's post count: ${yesterdayCount}`);
    }
    catch (error) {
        firebase_functions_1.logger.error('Error counting yesterday posts:', error);
    }
    for (const contact of contacts) {
        try {
            const html = (0, emailTemplate_1.generateEmailHTML)({
                recipientEmail: contact.email,
                firstName: contact.name,
                frequency,
                isTest: false,
                yesterdayCount,
            });
            const todaysPrompt = (0, dailyPrompts_1.getTodaysPrompt)();
            const now = new Date();
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const dateStr = `${now.getDate()} ${months[now.getMonth()]}`;
            const subject = `${todaysPrompt.subject} | ${dateStr}`;
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
                    subject: subject,
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

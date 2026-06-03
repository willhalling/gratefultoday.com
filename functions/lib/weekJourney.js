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
exports.onDay7Completed = exports.sendScheduledWeekJourneyEmails = exports.onDayResponseSubmitted = void 0;
const admin = __importStar(require("firebase-admin"));
const firebase_functions_1 = require("firebase-functions");
const params_1 = require("firebase-functions/params");
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
// Types are inferred from onDocumentCreated; explicit imports not needed
const undici_1 = require("undici");
// Initialize Admin SDK once
if (!admin.apps.length) {
    admin.initializeApp();
}
// Runtime config via Params (set in Firebase Functions config)
const BREVO_API_KEY = (0, params_1.defineString)('BREVO_API_KEY');
const APP_URL = (0, params_1.defineString)('APP_URL');
const SENDER_EMAIL = (0, params_1.defineString)('BREVO_SENDER_EMAIL');
// Template IDs no longer used; bypassing templates for direct HTML sends.
// Response submissions no longer trigger immediate next-day emails; scheduler handles cadence
exports.onDayResponseSubmitted = (0, firestore_1.onDocumentCreated)({ region: 'us-central1', document: 'weekJourneyUsers/{userId}/responses/{dayDocId}' }, async (event) => {
    const { userId, dayDocId } = event.params;
    const match = /^day-(\d+)$/.exec(dayDocId);
    const day = match ? parseInt(match[1], 10) : NaN;
    if (Number.isNaN(day)) {
        firebase_functions_1.logger.error('Invalid day doc id:', dayDocId);
        return;
    }
    try {
        await admin
            .firestore()
            .collection('weekJourneyUsers')
            .doc(userId)
            .update({ lastResponseAt: admin.firestore.FieldValue.serverTimestamp() });
        firebase_functions_1.logger.info(`Recorded response for user ${userId}, day ${day}`);
    }
    catch (error) {
        firebase_functions_1.logger.error('Error updating lastResponseAt:', error);
    }
});
function getLocalDateParts(tz, d) {
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
        .reduce((acc, p) => {
        if (p.type !== 'literal')
            acc[p.type] = p.value;
        return acc;
    }, {});
    const dateStr = `${parts.year}-${parts.month}-${parts.day}`;
    const hour = parseInt(parts.hour || '0', 10);
    return { dateStr, hour };
}
exports.sendScheduledWeekJourneyEmails = (0, scheduler_1.onSchedule)({
    region: 'us-central1',
    schedule: 'every 15 minutes',
    timeZone: 'UTC',
}, async () => {
    const appUrl = APP_URL.value() || 'https://gratefultoday.com';
    const brevoKey = BREVO_API_KEY.value();
    const senderEmail = SENDER_EMAIL.value() || 'newsletter@mail.gratefultoday.com';
    if (!brevoKey) {
        firebase_functions_1.logger.error('BREVO_API_KEY not configured; skipping scheduled emails');
        return;
    }
    const db = admin.firestore();
    const now = new Date();
    // Process in batches to avoid timeouts
    const snapshot = await db.collection('weekJourneyUsers').limit(200).get();
    let processed = 0;
    for (const doc of snapshot.docs) {
        const user = doc.data();
        const uid = doc.id;
        const email = user.email;
        if (!email)
            continue;
        const tz = user.timezone || 'UTC';
        const preferredHour = typeof user.preferredHour === 'number' ? user.preferredHour : 8;
        const lastSentDaySent = typeof user.lastSentDaySent === 'number' ? user.lastSentDaySent : 1; // Day 1 sent at signup
        if (lastSentDaySent >= 7)
            continue;
        const { dateStr, hour } = getLocalDateParts(tz, now);
        const lastSentLocalDate = user.lastSentLocalDate;
        // Only send once per local day, after preferredHour
        if (hour < preferredHour)
            continue;
        if (lastSentLocalDate === dateStr)
            continue;
        const nextDay = lastSentDaySent + 1;
        const nameFromEmail = email.split('@')[0].split(/[._-]/)[0] || 'there';
        try {
            const customToken = await admin.auth().createCustomToken(uid, {
                weekJourney: true,
                email,
            });
            const url = `${appUrl}/just-for-a-week/day-${nextDay}?token=${customToken}`;
            const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#f5f5f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);"><tr><td style="background:#9EADA0;padding:40px;text-align:center;"><h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">Grateful Today</h1></td></tr><tr><td style="padding:40px;"><p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 20px;">Hi ${nameFromEmail},</p><p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 20px;">Your <strong>Day ${nextDay}</strong> prompt is ready.</p><p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 30px;">Tap the button below to open Day ${nextDay}.</p><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:30px 0;"><a href="${url}" style="display:inline-block;background:#B1977C;color:#fff;text-decoration:none;padding:16px 40px;border-radius:6px;font-size:18px;font-weight:600;">Open Day ${nextDay}</a></td></tr></table><p style="color:#666;font-size:12px;line-height:1.6;margin:0;">If the button doesn’t work, copy this link:<br/><span style="word-break:break-all;">${url}</span></p></td></tr><tr><td style="background:#F2F2EF;padding:30px 40px;text-align:center;border-top:1px solid #e5e7eb;"><p style="color:#666;font-size:12px;line-height:1.6;margin:0;">Grateful Today | Supporting recovery through gratitude</p></td></tr></table></td></tr></table></body></html>`;
            const response = await (0, undici_1.fetch)('https://api.brevo.com/v3/smtp/email', {
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
                firebase_functions_1.logger.error('Failed to send scheduled email:', await response.text());
                continue;
            }
            await doc.ref.update({
                lastSentDaySent: nextDay,
                lastSentLocalDate: dateStr,
                updatedAt: new Date().toISOString(),
            });
            processed += 1;
        }
        catch (err) {
            firebase_functions_1.logger.error(`Error scheduling send for ${uid}:`, err);
        }
    }
    firebase_functions_1.logger.info(`Scheduled email run complete. Processed: ${processed}`);
});
// Generate video when all 7 days are complete
exports.onDay7Completed = (0, firestore_1.onDocumentCreated)({ region: 'us-central1', document: 'weekJourneyUsers/{userId}/responses/{dayDocId}' }, async (event) => {
    const { userId, dayDocId } = event.params;
    if (dayDocId !== 'day-7')
        return;
    try {
        const userDoc = await admin.firestore().collection('weekJourneyUsers').doc(userId).get();
        if (!userDoc.exists) {
            firebase_functions_1.logger.error('User not found:', userId);
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
        firebase_functions_1.logger.info(`Ready to generate video for user: ${userId}`);
        firebase_functions_1.logger.info(`Responses count: ${responses.length}`);
        await admin.firestore().collection('weekJourneyUsers').doc(userId).update({
            videoStatus: 'generating',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // TODO: Call Remotion rendering endpoint here
    }
    catch (error) {
        firebase_functions_1.logger.error('Error generating video:', error);
    }
});

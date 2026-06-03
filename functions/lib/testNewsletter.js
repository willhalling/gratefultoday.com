"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testSendNewsletter = void 0;
const firebase_functions_1 = require("firebase-functions");
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const undici_1 = require("undici");
const emailTemplate_1 = require("./utils/emailTemplate");
const dailyPrompts_1 = require("./constants/dailyPrompts");
const BREVO_API_KEY = (0, params_1.defineString)('BREVO_API_KEY');
const SENDER_EMAIL = (0, params_1.defineString)('BREVO_SENDER_EMAIL');
/**
 * Callable function to test sending newsletter to a specific email
 * Usage: Call from Firebase Console or admin panel
 */
exports.testSendNewsletter = (0, https_1.onCall)({
    region: 'us-central1',
}, async (request) => {
    // Only allow admin users
    if (!request.auth) {
        throw new Error('Not authenticated');
    }
    const { email, frequency = 'daily' } = request.data;
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
        const html = (0, emailTemplate_1.generateEmailHTML)({
            recipientEmail: email,
            frequency,
            isTest: true,
        });
        const todaysPrompt = (0, dailyPrompts_1.getTodaysPrompt)();
        const dayNumber = (0, emailTemplate_1.getDayOfYear)(new Date());
        const subject = `[TEST] ${todaysPrompt.subject} | day ${dayNumber}`;
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
                subject: subject,
                htmlContent: html,
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            firebase_functions_1.logger.error('Failed to send test email:', errorText);
            throw new Error('Failed to send test email');
        }
        firebase_functions_1.logger.info(`Test newsletter sent to ${email}`);
        return { success: true, message: `Test newsletter sent to ${email}` };
    }
    catch (error) {
        firebase_functions_1.logger.error('Error sending test newsletter:', error);
        throw error;
    }
});

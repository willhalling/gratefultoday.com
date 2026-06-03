"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWelcomeEmail = void 0;
const firebase_functions_1 = require("firebase-functions");
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const undici_1 = require("undici");
const welcomeEmailTemplate_1 = require("./utils/welcomeEmailTemplate");
const BREVO_API_KEY = (0, params_1.defineString)('BREVO_API_KEY');
const SENDER_EMAIL = (0, params_1.defineString)('BREVO_SENDER_EMAIL');
/**
 * HTTP endpoint to send welcome email to new subscribers
 * Called when a new user subscribes to the newsletter
 */
exports.sendWelcomeEmail = (0, https_1.onRequest)({
    region: 'us-central1',
    cors: true,
}, async (request, response) => {
    if (request.method !== 'POST') {
        response.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const { email, firstName, frequency = 'daily' } = request.body;
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
        const html = (0, welcomeEmailTemplate_1.generateWelcomeEmailHTML)({
            recipientEmail: email,
            firstName,
            frequency,
        });
        const subject = 'welcome to grateful today';
        const brevoResponse = await (0, undici_1.fetch)('https://api.brevo.com/v3/smtp/email', {
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
            firebase_functions_1.logger.error('Failed to send welcome email:', errorText);
            response.status(500).json({ error: 'Failed to send welcome email' });
            return;
        }
        firebase_functions_1.logger.info(`Welcome email sent to ${email}`);
        response.status(200).json({ success: true, message: `Welcome email sent to ${email}` });
    }
    catch (error) {
        firebase_functions_1.logger.error('Error sending welcome email:', error);
        response.status(500).json({ error: 'Internal server error' });
    }
});

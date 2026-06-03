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
exports.testNewsletterHttp = void 0;
const firebase_functions_1 = require("firebase-functions");
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const undici_1 = require("undici");
const emailTemplate_1 = require("./utils/emailTemplate");
const dailyPrompts_1 = require("./constants/dailyPrompts");
const admin = __importStar(require("firebase-admin"));
const BREVO_API_KEY = (0, params_1.defineString)('BREVO_API_KEY');
const SENDER_EMAIL = (0, params_1.defineString)('BREVO_SENDER_EMAIL');
/**
 * HTTP endpoint to test sending newsletter
 * Usage: curl -X POST https://[function-url] -H "Content-Type: application/json" -d '{"email":"test@example.com","frequency":"daily"}'
 */
exports.testNewsletterHttp = (0, https_1.onRequest)({
    region: 'us-central1',
    cors: true,
}, async (request, response) => {
    // Only allow POST requests
    if (request.method !== 'POST') {
        response.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const { email, frequency = 'daily', firstName, } = request.body;
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
                const contactResponse = await (0, undici_1.fetch)(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        'api-key': brevoKey,
                    },
                });
                if (contactResponse.ok) {
                    const contactData = (await contactResponse.json());
                    actualFirstName = contactData.attributes?.FIRSTNAME;
                }
            }
            catch (error) {
                firebase_functions_1.logger.warn('Could not fetch contact info from Brevo:', error);
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
            firebase_functions_1.logger.warn('Error counting yesterday posts:', error);
        }
        const html = (0, emailTemplate_1.generateEmailHTML)({
            recipientEmail: email,
            firstName: actualFirstName,
            frequency,
            isTest: true,
            yesterdayCount,
        });
        const todaysPrompt = (0, dailyPrompts_1.getTodaysPrompt)();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dateStr = `${now.getDate()} ${months[now.getMonth()]}`;
        const subject = `[TEST] ${todaysPrompt.subject} | ${dateStr}`;
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
            firebase_functions_1.logger.error('Failed to send test email:', errorText);
            response.status(500).json({ error: 'Failed to send test email', details: errorText });
            return;
        }
        firebase_functions_1.logger.info(`Test newsletter sent to ${email}`);
        response.status(200).json({ success: true, message: `Test newsletter sent to ${email}` });
    }
    catch (error) {
        firebase_functions_1.logger.error('Error sending test newsletter:', error);
        response.status(500).json({ error: 'Internal server error' });
    }
});

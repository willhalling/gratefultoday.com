# Daily Newsletter Email Setup Guide

This guide explains how to set up and deploy the daily newsletter email system for Grateful Today.

## Overview

The system sends daily newsletter emails to all subscribers at 7am (or your configured time) using:

- **Firebase Cloud Functions** (scheduled function)
- **Brevo API** (email delivery & subscriber management)
- **Firestore** (newsletter content storage)

## Architecture

1. **Newsletter Content**: Stored in Firestore at `/newsletter/day-{dayOfYear}`
2. **Subscriber List**: Managed in Brevo (external email service)
3. **Scheduled Function**: Runs hourly, sends emails based on day of year
4. **Email Templates**: Generated dynamically from Firestore newsletter data

## Setup Steps

### 1. Configure Firebase Functions Parameters

Set the following parameters in Firebase Functions:

```bash
cd apps/gratefultoday/functions

# Set Brevo API Key
firebase functions:secrets:set BREVO_API_KEY

# Set Brevo Newsletter List ID
firebase functions:config:set brevo.newsletter_list_id="YOUR_LIST_ID"

# Set sender email
firebase functions:config:set brevo.sender_email="newsletter@mail.gratefultoday.com"
```

To find your Brevo List ID:

1. Go to https://app.brevo.com/contact/lists
2. Click on your newsletter list
3. The ID is in the URL: `lists/{LIST_ID}`

### 2. Create Newsletter Content

Newsletter content should be stored in Firestore at `/newsletter/day-{dayOfYear}` with this structure:

```typescript
{
  dayOfYear: 1,           // 1-366
  subject: "Coffee and New Beginnings",
  title: "Day 1: Coffee and New Beginnings",
  date: "January 1, 2026",
  greeting: "Hi there,",
  body: "Today is about...\n\nThis is the body text...",
  signoff: "Stay grateful,\nThe Grateful Today Team",
  ps: "Have a question? Just reply to this email."  // optional
}
```

You can use the admin panel at `/admin/newsletter/generate` to create content.

### 3. Deploy the Functions

```bash
cd apps/gratefultoday/functions

# Build TypeScript
yarn build

# Deploy all functions
firebase deploy --only functions

# Or deploy only newsletter functions
firebase deploy --only functions:sendDailyNewsletter
```

### 4. Test the Setup

**Test sending to a specific email:**

From Firebase Console or your app:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const testSend = httpsCallable(functions, 'testSendNewsletter');

await testSend({
  email: 'your-email@example.com',
  dayOfYear: 1, // optional, defaults to today
});
```

**Check function logs:**

```bash
firebase functions:log --only sendDailyNewsletter
```

### 5. Monitor & Manage

**View scheduled function runs:**

- Go to [Firebase Console](https://console.firebase.google.com)
- Navigate to Functions → sendDailyNewsletter
- Check "Logs" and "Metrics"

**Brevo Dashboard:**

- View email delivery stats at https://app.brevo.com/dashboard
- Manage subscribers at https://app.brevo.com/contact/lists

## How It Works

### Scheduling

- Function runs **every hour** on the hour
- Checks current day of year (1-366)
- Looks for newsletter content at `/newsletter/day-{dayOfYear}`
- If found, sends to all Brevo list subscribers

### Day Calculation

Uses day of year (1-366) to match newsletter content:

- January 1 = Day 1
- February 1 = Day 32
- December 31 = Day 365 (or 366 in leap years)

### Email Flow

1. Function fetches today's newsletter from Firestore
2. Fetches all subscribers from Brevo list
3. Generates HTML email for each subscriber
4. Sends via Brevo SMTP API
5. Logs success/failure counts

## Customization

### Change Send Time

Currently runs hourly. To send at a specific time (e.g., 7am UTC):

```typescript
export const sendDailyNewsletter = onSchedule(
  {
    region: 'us-central1',
    schedule: '0 7 * * *', // Every day at 7am UTC (cron format)
    timeZone: 'America/New_York', // or your timezone
  }
  // ... function body
);
```

### Customize Email Template

Edit the `generateNewsletterHTML()` function in [sendDailyNewsletter.ts](./src/sendDailyNewsletter.ts)

### Add Timezone Support

To send at 7am in each subscriber's timezone, you'd need to:

1. Store timezone in Brevo contact attributes
2. Modify function to check each timezone
3. Track which emails were sent today (to avoid duplicates)

This would be similar to the `sendScheduledWeekJourneyEmails` implementation.

## Troubleshooting

### No emails sent

- Check Firestore has content for today's day of year
- Verify BREVO_API_KEY is set correctly
- Check Brevo list has subscribers
- View function logs: `firebase functions:log`

### Emails not delivered

- Check Brevo dashboard for delivery status
- Verify sender email is verified in Brevo
- Check spam folder
- Verify subscriber emails are valid

### Rate limiting

If sending to many subscribers:

- Add delays between sends (already implemented: 100ms)
- Use Brevo campaigns API instead of SMTP API
- Consider upgrading Brevo plan

### Newsletter content missing

Generate content using:

```bash
# Navigate to admin panel
https://gratefultoday.com/admin/newsletter/generate

# Or create manually in Firestore
```

## Cost Considerations

- **Firebase Functions**: Free tier includes 2M invocations/month
- **Brevo**: Free tier includes 300 emails/day
- Hourly function = ~720 invocations/month (well within free tier)
- For >300 subscribers, upgrade Brevo plan

## Next Steps

1. ✅ Generate newsletter content for all 366 days
2. ✅ Test with small subscriber group
3. ✅ Monitor delivery rates
4. Consider: Personalization (first name in greeting)
5. Consider: Open/click tracking via Brevo
6. Consider: A/B testing subject lines

## Support

For issues or questions:

- Check Firebase Functions logs
- Review Brevo API documentation: https://developers.brevo.com
- Contact: willhalling@gmail.com

# Newsletter System Deployment Guide

## Overview

Simple, recovery-aware daily/weekly gratitude reminder emails.
No AI-generated content - just gentle reminders to visit the gratitude wall.

## Key Changes

### Email Template

- **Tone**: Calm, non-pressuring, permission-based
- **Content**: Simple reminder with link to gratefultoday.com/wall
- **CTA**: "Add a gratitude (optional)" with brown button
- **Footer**: Preference management link
- **No newsletter collection access**: Removed AI-generated content

### Function Renamed

- `sendDailyNewsletter` → `sendNewsletter`

### Files Created/Updated

1. `functions/src/utils/emailTemplate.ts` - Centralized email template
2. `functions/src/sendNewsletter.ts` - Main scheduled function (renamed)
3. `functions/src/testNewsletter.ts` - Updated to use same template
4. `functions/src/index.ts` - Export updated

## Deployment Steps

### 1. Configure Firebase Functions

```bash
cd functions
firebase functions:config:set brevo.api_key="YOUR_BREVO_API_KEY"
firebase functions:config:set brevo.daily_list_id="2"
firebase functions:config:set brevo.weekly_list_id="4"
firebase functions:config:set brevo.sender_email="newsletter@mail.gratefultoday.com"
```

### 2. Deploy Functions

```bash
firebase deploy --only functions
```

Note: The old `sendDailyNewsletter` function will be automatically removed, and `sendNewsletter` will be created.

### 3. Test the System

Call the test function from Firebase Console:

```javascript
{
  "email": "your-test-email@example.com",
  "frequency": "daily"  // or "weekly"
}
```

## Email Subject Variations

Subject lines rotate through:

1. "Grateful Today | 16 Jan"
2. "What are you grateful for today? | 16 Jan"
3. "A moment for gratitude | 16 Jan"
4. "Gratitude check-in | 16 Jan"

## Schedule

- **Daily emails**: Every day at 7am UTC (List 2)
- **Weekly emails**: Mondays only at 7am UTC (List 4)

## Messaging Guidelines

✅ **Do:**

- Keep it simple and quiet
- Use plain language
- Emphasize optional participation
- Be non-judgmental and gentle

❌ **Avoid:**

- Marketing buzzwords
- Emojis
- Medical/therapeutic language
- Promises or guarantees
- Pressure to feel grateful

## Recovery-Aware Design

The email is designed for people in recovery or on fragile days:

- No hype or pressure
- Focus on noticing, not achieving
- Optional participation emphasized
- Short, calming copy
- Trauma-informed tone

# Brevo Email Integration Setup

This guide explains how to set up the Brevo (formerly Sendinblue) email integration for the 7-Day Gratitude Challenge for Recovery lead magnet.

## Overview

The integration uses a double opt-in flow:
1. User enters email on landing page
2. Contact is added to Brevo
3. User receives email with confirmation link
4. Clicking the link verifies the email and triggers PDF download
5. User is subscribed to weekly recovery resources

## Setup Steps

### 1. Create Brevo Account

1. Sign up at [https://www.brevo.com](https://www.brevo.com)
2. Verify your email and complete onboarding
3. Go to **Settings → SMTP & API → API Keys**
4. Create a new API key and copy it

### 2. Create a Contact List

1. In Brevo, go to **Contacts → Lists**
2. Create a new list (e.g., "Grateful Today Subscribers")
3. Note the List ID (you'll see it in the URL or list settings)

### 3. Configure Environment Variables

Create a `.env.local` file in `/apps/gratefultoday/`:

```bash
# Brevo API Key
BREVO_API_KEY=xkeysib-your-actual-api-key-here

# Base URL (production)
NEXT_PUBLIC_BASE_URL=https://gratefultoday.co
```

### 4. Update List ID in Code

In `/apps/gratefultoday/app/api/subscribe/route.ts`, update line 42:

```typescript
listIds: [2], // Update this to your Brevo list ID
```

Replace `2` with your actual Brevo list ID.

### 5. Verify Sender Email

In Brevo:
1. Go to **Settings → Senders & IP**
2. Add and verify `hello@gratefultoday.co` (or your domain)
3. Follow the DNS verification steps

## How It Works

### API Endpoints

#### `POST /api/subscribe`
Handles form submissions:
- Accepts: `{ email, name?, downloadUrl? }`
- Creates/updates Brevo contact
- Sends verification email
- Returns: `{ success: true, message: "..." }`

#### `GET /api/pdf/[slug]?verified=true`
Serves PDF files:
- Checks for `verified=true` query parameter
- Generates and returns PDF
- Requires verification for `7-day-gratitude-challenge-for-recovery`

### Email Flow

1. **User submits form** → `POST /api/subscribe`
2. **Brevo contact created** with user email and name
3. **Verification email sent** with download link:
   ```
   https://gratefultoday.co/api/pdf/7-day-gratitude-challenge-for-recovery?verified=true
   ```
4. **User clicks link** → PDF downloads automatically
5. **User is subscribed** to Brevo list for future emails

### Email Templates

The email templates are defined in `/app/api/subscribe/route.ts`:

- **`getDownloadEmailTemplate()`**: Sent when user requests PDF
- **`getConfirmationEmailTemplate()`**: Sent for regular newsletter signups

Both templates are responsive HTML emails with:
- Grateful Today branding
- Clear call-to-action button
- Unsubscribe link
- Mobile-friendly design

## Testing

### Local Development

1. Set `NEXT_PUBLIC_BASE_URL=http://localhost:3000` in `.env.local`
2. Run dev server: `yarn dev`
3. Visit: `http://localhost:3000/l/7-day-gratitude-challenge-for-recovery`
4. Submit test email
5. Check Brevo dashboard for new contact
6. Check email inbox for verification email

### Production Testing

1. Deploy to Vercel
2. Set environment variables in Vercel dashboard
3. Test with real email address
4. Verify contact appears in Brevo
5. Confirm PDF download works after clicking email link

## Customization

### Change List ID

Update the list ID in `/app/api/subscribe/route.ts`:

```typescript
listIds: [YOUR_LIST_ID],
```

### Customize Email Content

Edit the email templates in `/app/api/subscribe/route.ts`:
- Modify HTML in `getDownloadEmailTemplate()`
- Change colors, copy, or layout
- Add custom fields or tracking parameters

### Add More Contact Attributes

Extend the Brevo contact creation:

```typescript
attributes: {
  FIRSTNAME: name || '',
  LASTNAME: lastName || '',
  SOURCE: 'gratitude-challenge',
  SIGNUP_DATE: new Date().toISOString(),
},
```

### Require Verification for Other PDFs

In `/app/api/pdf/[slug]/route.ts`, update:

```typescript
const requiresVerification = [
  '7-day-gratitude-challenge-for-recovery',
  'another-pdf-slug'
].includes(slug);
```

## Brevo Dashboard Features

### Automation
Set up welcome series or drip campaigns in Brevo's automation builder.

### Segmentation
Segment contacts based on:
- List membership
- Download activity
- Email engagement

### Analytics
Track:
- Email open rates
- Click-through rates
- Unsubscribe rates
- Contact growth

## Troubleshooting

### "Email service not configured" error
- Check `BREVO_API_KEY` is set in environment variables
- Verify the API key is correct in Brevo dashboard

### Emails not sending
- Verify sender email in Brevo
- Check DNS records are correct
- Look for errors in Vercel logs

### Contact not added to Brevo
- Check API key permissions
- Verify list ID is correct
- Check Brevo API status: https://status.brevo.com

### PDF not downloading
- Check `verified=true` is in URL
- Verify PDF generation route is working
- Check browser console for errors

## Security Considerations

- ✅ API key stored in environment variables (never in code)
- ✅ Double opt-in prevents spam signups
- ✅ Unsubscribe link in all emails
- ✅ Email verification required for PDF download
- ✅ Rate limiting can be added if needed

## Next Steps

1. **Set up automation**: Create welcome series in Brevo
2. **Add analytics**: Track conversions with Google Analytics
3. **A/B testing**: Test different email subject lines
4. **Segment lists**: Create targeted campaigns
5. **Monitor deliverability**: Check spam scores and bounce rates

## Resources

- [Brevo API Documentation](https://developers.brevo.com/docs)
- [Brevo Transactional Email Guide](https://help.brevo.com/hc/en-us/articles/360000991960)
- [Email Best Practices](https://help.brevo.com/hc/en-us/articles/360000990940)

import { NextRequest, NextResponse } from 'next/server';
import { getDownloadEmailTemplate, getConfirmationEmailTemplate } from '@/lib/email-templates';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3';

interface SubscribeRequest {
  email: string;
  name?: string;
  downloadUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SubscribeRequest = await request.json();
    const { email, name, downloadUrl } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!BREVO_API_KEY) {
      console.error('BREVO_API_KEY is not configured');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    // Step 1: Add contact to Brevo
    const contactResponse = await fetch(`${BREVO_API_URL}/contacts`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email,
        attributes: {
          FIRSTNAME: name || '',
        },
        listIds: [5], // Update this to your Brevo list ID
        updateEnabled: true,
      }),
    });

    // Don't fail if contact already exists (code 400 with duplicate message)
    if (!contactResponse.ok && contactResponse.status !== 400) {
      const errorData = await contactResponse.json();
      console.error('Brevo contact creation error:', errorData);
      // Continue anyway - might already exist
    }

    // Step 2: Send double opt-in email with download link
    const emailResponse = await fetch(`${BREVO_API_URL}/smtp/email`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'Grateful Today',
          email: process.env.BREVO_SENDER_EMAIL || 'noreply@mg.gratefultoday.com',
        },
        to: [
          {
            email,
            name: name || '',
          },
        ],
        subject: downloadUrl
          ? 'Your 7-Day Gratitude Challenge Awaits'
          : 'Welcome to Your Gratitude Journey',
        htmlContent: downloadUrl
          ? getDownloadEmailTemplate(name || 'there', downloadUrl, email)
          : getConfirmationEmailTemplate(name || 'there', email),
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error('Brevo email send error:', emailData);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    console.log('Email sent successfully via Brevo:', emailData);

    return NextResponse.json({
      success: true,
      message: 'Please check your email to confirm and download your PDF',
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

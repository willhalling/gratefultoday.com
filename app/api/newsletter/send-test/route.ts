/**
 * API route for sending test newsletter emails via Brevo
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateNewsletterEmail } from '@/lib/email-templates/newsletter-email';
import type { NewsletterEmail } from '@/types/newsletter';

const BREVO_API_KEY = process.env.BREVO_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { email, testEmailAddress } = await request.json() as { 
      email: NewsletterEmail; 
      testEmailAddress: string; 
    };

    if (!email || !testEmailAddress) {
      return NextResponse.json({ 
        error: 'Missing email content or test email address' 
      }, { status: 400 });
    }

    if (!BREVO_API_KEY) {
      console.error('BREVO_API_KEY not configured');
      return NextResponse.json({ error: 'Service not configured' }, { status: 500 });
    }

    // Split body into paragraphs
    const bodyParagraphs = email.body.split('\n\n').filter(p => p.trim());

    // Generate HTML email
    const htmlContent = generateNewsletterEmail({
      title: email.subject,
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
      greeting: email.greeting,
      mainContent: bodyParagraphs,
      gratitudes: [],
      closingThought: email.signoff,
      callToAction: email.ps,
      signature: 'GratefulToday',
    });

    // Send via Brevo
    console.log('Sending test email to:', testEmailAddress);
    console.log('Subject:', `[TEST] ${email.subject}`);
    
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'GratefulToday',
          email: 'newsletter@mail.gratefultoday.com',
        },
        to: [
          {
            email: testEmailAddress,
            name: 'Test Recipient',
          },
        ],
        subject: `[TEST] ${email.subject}`,
        htmlContent,
      }),
    });

    const responseData = await response.json();
    console.log('Brevo API response:', responseData);

    if (!response.ok) {
      console.error('Brevo API error:', responseData);
      return NextResponse.json(
        { error: responseData.message || 'Failed to send test email' },
        { status: response.status }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: `Test email sent to ${testEmailAddress}`,
      messageId: responseData.messageId,
    });
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}

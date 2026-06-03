/**
 * API route for sending invoices via email using Brevo
 */

import { NextRequest, NextResponse } from 'next/server';

const BREVO_API_KEY = process.env.BREVO_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { pdfBase64, filename, customerEmail, customerName, invoiceNumber, monthYear, testMode } = await request.json();

    if (!pdfBase64 || !customerEmail || !customerName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!BREVO_API_KEY) {
      console.error('BREVO_API_KEY not configured');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const emailBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 20px;">Invoice ${invoiceNumber}</h2>
        <p style="color: #4a4a4a; line-height: 1.6; margin-bottom: 15px;">Hi ${customerName},</p>
        <p style="color: #4a4a4a; line-height: 1.6; margin-bottom: 15px;">
          Please find attached your invoice for ${monthYear}.
        </p>
        <p style="color: #4a4a4a; line-height: 1.6; margin-bottom: 15px;">
          Payment is due within 7 days of the invoice date.
        </p>
        <p style="color: #4a4a4a; line-height: 1.6; margin-bottom: 15px;">
          If you have any questions, please don't hesitate to reach out.
        </p>
        <p style="color: #4a4a4a; line-height: 1.6; margin-bottom: 5px;">Best regards,</p>
        <p style="color: #4a4a4a; line-height: 1.6; margin: 0;"><strong>William Halling</strong></p>
        <p style="color: #4a4a4a; line-height: 1.6; margin: 0;">Grateful Today LTD</p>
      </div>
    `;

    // Send via Brevo
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: 'William Halling - Grateful Today LTD',
          email: 'noreply@mail.gratefultoday.com',
        },
        to: [
          {
            email: customerEmail,
            name: customerName,
          },
        ],
        bcc: [
          {
            email: testMode ? 'willhalling@googlemail.com' : 'willhalling@gmail.com',
            name: 'William Halling',
          },
        ],
        replyTo: {
          email: 'willhalling@gmail.com',
          name: 'William Halling',
        },
        subject: `Invoice ${invoiceNumber} - ${monthYear}`,
        htmlContent: emailBody,
        attachment: [
          {
            name: filename,
            content: pdfBase64,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Brevo API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to send email', details: errorData },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('Email sent successfully:', result);

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

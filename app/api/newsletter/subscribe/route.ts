import { NextRequest, NextResponse } from 'next/server';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_NEWSLETTER_LIST_ID = parseInt(process.env.BREVO_NEWSLETTER_LIST_ID || '0');

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!BREVO_API_KEY) {
      console.error('BREVO_API_KEY not configured');
      return NextResponse.json({ error: 'Service not configured' }, { status: 500 });
    }

    // First, check if contact already exists
    const checkResponse = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'api-key': BREVO_API_KEY,
      },
    });

    if (checkResponse.ok) {
      // Contact exists, check if they're in the newsletter list
      const contactData = await checkResponse.json();
      const listIds = contactData.listIds || [];
      
      if (listIds.includes(BREVO_NEWSLETTER_LIST_ID)) {
        return NextResponse.json({ success: true, message: 'Already subscribed' });
      }
      
      // Contact exists but not in newsletter list, add them to it
      await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email,
          listIds: [BREVO_NEWSLETTER_LIST_ID],
          updateEnabled: true,
        }),
      });
      
      return NextResponse.json({ success: true });
    }

    // Contact doesn't exist, create them
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email,
        listIds: BREVO_NEWSLETTER_LIST_ID > 0 ? [BREVO_NEWSLETTER_LIST_ID] : undefined,
        updateEnabled: true,
      }),
    });

    // Handle response
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Brevo API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to subscribe' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    );
  }
}

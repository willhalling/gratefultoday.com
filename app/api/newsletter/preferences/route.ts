/**
 * API route for managing newsletter preferences
 * Allows users to switch between daily (list 2) and weekly (list 4) newsletters
 */

import { NextRequest, NextResponse } from 'next/server';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_DAILY_LIST_ID = 2; // Daily newsletter
const BREVO_WEEKLY_LIST_ID = 4; // Weekly newsletter

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!BREVO_API_KEY) {
      return NextResponse.json({ error: 'Service not configured' }, { status: 500 });
    }

    // Get contact info from Brevo
    const response = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'api-key': BREVO_API_KEY,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ subscribed: false, frequency: null });
      }
      throw new Error('Failed to fetch contact');
    }

    const data = await response.json();
    const listIds = data.listIds || [];
    const attributes = data.attributes || {};

    // Determine current frequency
    const isDaily = listIds.includes(BREVO_DAILY_LIST_ID);
    const isWeekly = listIds.includes(BREVO_WEEKLY_LIST_ID);

    return NextResponse.json({
      subscribed: isDaily || isWeekly,
      frequency: isDaily ? 'daily' : isWeekly ? 'weekly' : null,
      email: data.email,
      firstName: attributes.FIRSTNAME || null,
      lastname: attributes.LASTNAME || null,
      sobrietyDate: attributes.SOBRIETY_DATE || null,
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, firstName, lastname, frequency, sobrietyDate } = await request.json();

    console.log('Newsletter preferences POST received:', {
      email,
      firstName,
      lastname,
      frequency,
      sobrietyDate,
    });

    if (!email || !frequency) {
      return NextResponse.json({ error: 'Email and frequency are required' }, { status: 400 });
    }

    if (!['daily', 'weekly'].includes(frequency)) {
      return NextResponse.json({ error: 'Frequency must be "daily" or "weekly"' }, { status: 400 });
    }

    if (!BREVO_API_KEY) {
      return NextResponse.json({ error: 'Service not configured' }, { status: 500 });
    }

    // Determine which lists to add/remove
    const addToList = frequency === 'daily' ? BREVO_DAILY_LIST_ID : BREVO_WEEKLY_LIST_ID;
    const removeFromList = frequency === 'daily' ? BREVO_WEEKLY_LIST_ID : BREVO_DAILY_LIST_ID;

    // First, check if contact exists
    const checkResponse = await fetch(
      `https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'api-key': BREVO_API_KEY,
        },
      }
    );

    if (checkResponse.ok) {
      // Contact exists - update their lists
      const contactData = await checkResponse.json();
      const currentLists = contactData.listIds || [];

      // Remove from opposite list if subscribed
      if (currentLists.includes(removeFromList)) {
        await fetch(`https://api.brevo.com/v3/contacts/lists/${removeFromList}/contacts/remove`, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'api-key': BREVO_API_KEY,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ emails: [email] }),
        });
      }

      // Add to new list if not already subscribed
      if (!currentLists.includes(addToList)) {
        await fetch(`https://api.brevo.com/v3/contacts/lists/${addToList}/contacts/add`, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'api-key': BREVO_API_KEY,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ emails: [email] }),
        });
      }

      // Update attributes if firstName or sobriety date is provided
      const attributes: Record<string, string> = {};
      if (firstName) {
        attributes.FIRSTNAME = firstName;
      }
      if (lastname) {
        attributes.LASTNAME = lastname;
      }
      if (sobrietyDate) {
        attributes.SOBRIETY_DATE = sobrietyDate;
      }

      if (Object.keys(attributes).length > 0) {
        const payload = { attributes };
        console.log('Updating Brevo contact attributes:', { email, payload });

        const updateResponse = await fetch(
          `https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`,
          {
            method: 'PUT',
            headers: {
              accept: 'application/json',
              'api-key': BREVO_API_KEY,
              'content-type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          console.error('Failed to update attributes:', errorData);
        } else {
          console.log('Successfully updated attributes in Brevo');
        }
      }

      return NextResponse.json({
        success: true,
        message: `Preferences updated to ${frequency}`,
        frequency,
      });
    } else {
      // Contact doesn't exist - create new with selected frequency
      const contactPayload: any = {
        email,
        listIds: [addToList],
        updateEnabled: true,
      };

      // Add attributes if provided
      const attributes: Record<string, string> = {};
      if (firstName) {
        attributes.FIRSTNAME = firstName;
      }
      if (lastname) {
        attributes.LASTNAME = lastname;
      }
      if (sobrietyDate) {
        attributes.SOBRIETY_DATE = sobrietyDate;
      }
      if (Object.keys(attributes).length > 0) {
        contactPayload.attributes = attributes;
      }

      console.log('Creating new Brevo contact:', { email, payload: contactPayload });

      const createResponse = await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify(contactPayload),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        console.error('Failed to create contact:', errorData);
        throw new Error('Failed to create contact');
      }

      // Send welcome email to new subscriber
      try {
        console.log('Sending welcome email to:', email);
        const welcomeEmailUrl = 'https://sendwelcomeemail-yo2skstedq-uc.a.run.app';
        const welcomeResponse = await fetch(welcomeEmailUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            firstName,
            frequency,
          }),
        });

        if (!welcomeResponse.ok) {
          const errorText = await welcomeResponse.text();
          console.error('Failed to send welcome email:', errorText);
        } else {
          const result = await welcomeResponse.json();
          console.log('Welcome email sent successfully:', result);
        }
      } catch (emailError) {
        // Don't fail the subscription if welcome email fails
        console.error('Error sending welcome email:', emailError);
      }

      return NextResponse.json({
        success: true,
        message: `Subscribed to ${frequency} newsletter`,
        frequency,
      });
    }
  } catch (error) {
    console.error('Error updating preferences:', error);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!BREVO_API_KEY) {
      return NextResponse.json({ error: 'Service not configured' }, { status: 500 });
    }

    // Remove from both lists
    await Promise.all([
      fetch(`https://api.brevo.com/v3/contacts/lists/${BREVO_DAILY_LIST_ID}/contacts/remove`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ emails: [email] }),
      }),
      fetch(`https://api.brevo.com/v3/contacts/lists/${BREVO_WEEKLY_LIST_ID}/contacts/remove`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ emails: [email] }),
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Unsubscribed from all newsletters',
    });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}

/**
 * API route for generating Daily Gratitude Reflection newsletter emails using Claude AI
 * Supports single day or batch generation (ranges)
 */

import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import {
  COFFEE_AND_GRATITUDE_SYSTEM_PROMPT,
  getCoffeeAndGratitudePrompt,
} from '@/lib/newsletter-prompts';
import type {
  NewsletterGenerationRequest,
  NewsletterBatchRequest,
  NewsletterGenerationResponse,
  NewsletterEmail,
  NewsletterValidation,
} from '@/types/newsletter';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Fetch previous newsletter days from Firestore for anti-repetition context
 */
async function fetchPreviousDays(currentDay: number, count: number = 14) {
  try {
    const { db } = getFirebaseAdmin();

    const previousDays: Array<{
      dayOfYear: number;
      subject: string;
      body: string;
      metadata?: any;
    }> = [];

    // Fetch the last N days before current day
    const startDay = Math.max(1, currentDay - count);

    for (let day = startDay; day < currentDay; day++) {
      const docRef = db.collection('newsletter').doc(`day-${day}`);
      const doc = await docRef.get();

      if (doc.exists) {
        const data = doc.data();
        previousDays.push({
          dayOfYear: day,
          subject: data?.subject || '',
          body: data?.body || '',
          metadata: data?.metadata,
        });
      }
    }

    return previousDays;
  } catch (error) {
    console.warn('Could not fetch previous days:', error);
    return [];
  }
}

/**
 * Validate email content meets requirements
 */
function validateEmail(email: NewsletterEmail): NewsletterValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const fullText = `${email.subject} ${email.greeting} ${email.body} ${email.signoff} ${email.ps || ''}`;
  const wordCount = fullText.split(/\s+/).length;

  // Check word count (200-400 words)
  if (wordCount < 180) {
    warnings.push(`Email is short (${wordCount} words). Aim for 200-400 words.`);
  } else if (wordCount > 450) {
    warnings.push(`Email is long (${wordCount} words). Aim for 200-400 words.`);
  }

  // Check for question
  const hasQuestion = /\?/.test(email.body);
  if (!hasQuestion) {
    warnings.push('Email should include a question to engage readers.');
  }

  // Check for excessive exclamation points
  const exclamationCount = (fullText.match(/!/g) || []).length;
  if (exclamationCount > 2) {
    warnings.push(`Too many exclamation points (${exclamationCount}). Keep it casual, max 1-2.`);
  }

  // Check for toxic positivity language
  const toxicPhrases = ['amazing', 'incredible', 'transform your life', 'blessed', 'manifest'];
  const hasToxicLanguage = toxicPhrases.some((phrase) => fullText.toLowerCase().includes(phrase));
  if (hasToxicLanguage) {
    warnings.push('Contains potentially "toxic positivity" language. Keep it real and honest.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    wordCount,
    hasQuestion,
    exclamationCount,
  };
}

/**
 * Generate single email for specific day
 */
async function generateSingleEmail(
  dayOfYear: number,
  customPrompt?: string,
  providedPreviousDays?: any[]
): Promise<NewsletterEmail> {
  // Fetch previous days if not provided (for anti-repetition context)
  const previousDays = providedPreviousDays ?? (await fetchPreviousDays(dayOfYear, 14));

  const userPrompt = getCoffeeAndGratitudePrompt(dayOfYear, customPrompt, previousDays);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: COFFEE_AND_GRATITUDE_SYSTEM_PROMPT.replace('{DAY_OF_YEAR}', dayOfYear.toString()),
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Parse JSON response
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse JSON from Claude response');
  }

  const emailData = JSON.parse(jsonMatch[0]);

  return {
    dayOfYear,
    subject: emailData.subject,
    greeting: emailData.greeting,
    body: emailData.body,
    signoff: emailData.signoff,
    ps: emailData.ps,
  };
}

/**
 * POST /api/newsletter/generate
 * Generate newsletter email(s)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if it's a batch request
    if ('dayRange' in body) {
      const batchRequest = body as NewsletterBatchRequest;
      const { start, end } = batchRequest.dayRange;

      // Validate range
      if (start < 0 || start > 365 || end < 0 || end > 365) {
        return NextResponse.json(
          { success: false, error: 'Day range must be between 0 and 365' },
          { status: 400 }
        );
      }

      if (start > end) {
        return NextResponse.json(
          { success: false, error: 'Start day must be less than or equal to end day' },
          { status: 400 }
        );
      }

      // Generate emails for range
      const emails: NewsletterEmail[] = [];
      const warnings: string[] = [];

      // Fetch initial previous days for context
      let previousDays = await fetchPreviousDays(start, 14);

      for (let day = start; day <= end; day++) {
        const email = await generateSingleEmail(day, undefined, previousDays);
        const validation = validateEmail(email);

        // Add this email to previous days for next iteration
        previousDays.push({
          dayOfYear: day,
          subject: email.subject,
          body: email.body,
          metadata: email.metadata,
        });
        // Keep only last 14 days
        if (previousDays.length > 14) {
          previousDays = previousDays.slice(-14);
        }

        if (validation.warnings.length > 0) {
          warnings.push(`Day ${day}: ${validation.warnings.join(', ')}`);
        }

        emails.push(email);
      }

      const response: NewsletterGenerationResponse = {
        emails,
        generatedAt: new Date().toISOString(),
        warnings: warnings.length > 0 ? warnings : undefined,
      };

      return NextResponse.json(response);
    } else {
      // Single email request
      const singleRequest = body as NewsletterGenerationRequest;

      if (singleRequest.dayOfYear < 0 || singleRequest.dayOfYear > 365) {
        return NextResponse.json(
          { success: false, error: 'Day of year must be between 0 and 365' },
          { status: 400 }
        );
      }

      const email = await generateSingleEmail(singleRequest.dayOfYear, singleRequest.customPrompt);

      const validation = validateEmail(email);

      const response: NewsletterGenerationResponse = {
        email,
        wordCount: validation.wordCount,
        generatedAt: new Date().toISOString(),
        warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
      };

      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('Newsletter generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate newsletter',
      },
      { status: 500 }
    );
  }
}

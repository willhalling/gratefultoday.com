/**
 * API Route: Generate newsletter email using Claude AI
 * Route: /api/newsletter/generate
 * 
 * Generates daily newsletter emails for GratefulToday using Anthropic Claude API
 * with carefully crafted prompts for authentic, recovery-focused content.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { 
  NewsletterGenerationRequest, 
  NewsletterGenerationResponse,
  NewsletterEmail,
  NewsletterValidation 
} from '@/types/newsletter';
import { NEWSLETTER_SYSTEM_PROMPT, generateUserPrompt } from '@/lib/newsletter-prompts';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Validate generated email content
 */
function validateNewsletter(email: NewsletterEmail): NewsletterValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Count words in body
  const wordCount = email.body.split(/\s+/).length;
  
  // Check word count
  if (wordCount < 200) {
    errors.push('Email body is too short (minimum 200 words)');
  }
  if (wordCount > 400) {
    warnings.push('Email body is over 400 words - consider trimming');
  }
  
  // Check for question mark (should have reader question)
  const hasQuestion = email.body.includes('?');
  if (!hasQuestion) {
    errors.push('Email should include a question to the reader');
  }
  
  // Count exclamation points (should be minimal)
  const exclamationCount = (email.body.match(/!/g) || []).length;
  if (exclamationCount > 2) {
    warnings.push('Too many exclamation points - tone might be too enthusiastic');
  }
  
  // Check for corporate language (red flags)
  const corporateWords = ['transform', 'amazing', 'incredible', 'blessed', 'dive in', 'explore'];
  const lowerBody = email.body.toLowerCase();
  corporateWords.forEach(word => {
    if (lowerBody.includes(word)) {
      warnings.push(`Contains potentially corporate language: "${word}"`);
    }
  });
  
  // Check greeting
  if (email.greeting.includes('Dear') || email.greeting.includes('Friends')) {
    warnings.push('Greeting might be too formal - prefer "Hey," or "Morning,"');
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
 * Parse Claude's response into NewsletterEmail format
 */
function parseClaudeResponse(content: string): NewsletterEmail {
  try {
    // Claude should return JSON, but let's be defensive
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate required fields
    if (!parsed.subject || !parsed.greeting || !parsed.body || !parsed.signoff) {
      throw new Error('Missing required fields in Claude response');
    }
    
    return {
      subject: parsed.subject,
      greeting: parsed.greeting,
      body: parsed.body,
      signoff: parsed.signoff,
      ps: parsed.ps || undefined,
    };
  } catch (error) {
    console.error('Failed to parse Claude response:', error);
    throw new Error('Invalid response format from Claude');
  }
}

/**
 * POST /api/newsletter/generate
 * Generate a new newsletter email
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: NewsletterGenerationRequest = await request.json();
    const { theme, mood, topic, includeResource, specificPrompt } = body;

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    // Generate user prompt based on parameters
    const userPrompt = generateUserPrompt(
      theme,
      mood,
      topic,
      includeResource,
      specificPrompt
    );

    console.log('Generating newsletter email with Claude...');
    console.log('Theme:', theme, 'Mood:', mood, 'Topic:', topic);

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500, // Enough for email but not wasteful
      temperature: 0.8, // Some creativity, but not too wild
      system: NEWSLETTER_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract text content from Claude's response
    const textContent = message.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Claude response');
    }

    // Parse the email from Claude's response
    const email = parseClaudeResponse(textContent.text);

    // Validate the generated email
    const validation = validateNewsletter(email);
    
    // Log validation results
    if (validation.warnings.length > 0) {
      console.warn('Newsletter validation warnings:', validation.warnings);
    }
    
    if (!validation.isValid) {
      console.error('Newsletter validation errors:', validation.errors);
      return NextResponse.json(
        { 
          error: 'Generated email failed validation',
          details: validation.errors,
          email, // Still return it so user can see what was generated
        },
        { status: 400 }
      );
    }

    // Build response
    const response: NewsletterGenerationResponse = {
      email,
      wordCount: validation.wordCount,
      generatedAt: new Date().toISOString(),
      theme,
      mood,
    };

    // Include validation warnings if any
    if (validation.warnings.length > 0) {
      return NextResponse.json({
        ...response,
        warnings: validation.warnings,
      });
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Newsletter generation error:', error);
    
    // Handle specific Anthropic errors
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        {
          error: 'Claude API error',
          message: error.message,
          status: error.status,
        },
        { status: error.status || 500 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'Failed to generate newsletter',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/newsletter/generate
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/newsletter/generate',
    method: 'POST',
    description: 'Generate GratefulToday newsletter emails using Claude AI',
    parameters: {
      theme: 'Optional: gratitude | recovery | struggle | tool | community | small-wins | nature | milestone',
      mood: 'Optional: peaceful | honest | vulnerable | hopeful | struggling',
      topic: 'Optional: specific topic to focus on',
      includeResource: 'Optional: boolean - include resource link in P.S.',
      specificPrompt: 'Optional: custom prompt to override defaults',
    },
    example: {
      theme: 'gratitude',
      mood: 'peaceful',
      topic: 'morning coffee ritual',
      includeResource: false,
    },
  });
}

/**
 * API Route: Generate and serve PDF challenges
 * Route: /api/pdf/[slug]
 * Example: /api/pdf/7-day-gratitude-challenge-for-recovery
 */

import { NextRequest, NextResponse } from 'next/server';
import { getChallengeBySlug } from '@/content/challenges';
import { generateChallengePDF } from '@/lib/pdf-generator';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const verified = searchParams.get('verified');

    // Check if email verification is required for this slug
    const requiresVerification = slug === '7-day-gratitude-challenge-for-recovery';
    
    if (requiresVerification && verified !== 'true') {
      return NextResponse.json(
        {
          error: 'Email verification required',
          message: 'Please check your email and click the confirmation link to download your PDF.',
        },
        { status: 403 }
      );
    }

    // Validate slug
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'Invalid challenge slug' }, { status: 400 });
    }

    // Get challenge definition
    const challenge = getChallengeBySlug(slug);

    if (!challenge) {
      return NextResponse.json(
        {
          error: 'Challenge not found',
          message: `No challenge exists with slug: ${slug}`,
        },
        { status: 404 }
      );
    }

    // Generate PDF
    const pdfBytes = await generateChallengePDF(challenge);

    // Sanitize filename
    const filename = `${slug}.pdf`;

    // Return PDF response
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);

    return NextResponse.json(
      {
        error: 'PDF generation failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

// Optional: Support POST for custom parameters in the future
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    // Future: accept custom style parameters from request body
    // const body = await request.json();

    // Get challenge definition
    const challenge = getChallengeBySlug(slug);

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    // You could accept custom style parameters here
    // const customStyle = body.style || defaultPDFStyle;

    // Generate PDF
    const pdfBytes = await generateChallengePDF(challenge);

    const filename = `${slug}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);

    return NextResponse.json(
      {
        error: 'PDF generation failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

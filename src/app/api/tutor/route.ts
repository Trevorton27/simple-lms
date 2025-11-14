/**
 * AI Tutor API Endpoint
 *
 * This endpoint proxies requests to the AICT service for AI tutoring functionality.
 * It receives student questions and context, forwards them to AICT, and returns
 * AI-generated tutoring responses with hints and actions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTutorResponse } from '@/lib/aict-client';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.userText) {
      return NextResponse.json(
        { error: 'Missing required field: userText' },
        { status: 400 }
      );
    }

    if (!body.context) {
      return NextResponse.json(
        { error: 'Missing required field: context' },
        { status: 400 }
      );
    }

    // Forward request to AICT service
    const response = await getTutorResponse({
      userText: body.userText,
      context: body.context,
    });

    // Return AICT response
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Tutor API Error:', error);

    // Check if it's an AICT service error
    if (error.message?.includes('AICT API Error')) {
      return NextResponse.json(
        { error: 'Failed to communicate with tutoring service', details: error.message },
        { status: 502 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// GET method to check if tutor service is available
export async function GET() {
  try {
    const { checkHealth } = await import('@/lib/aict-client');
    const isHealthy = await checkHealth();

    if (isHealthy) {
      return NextResponse.json({
        status: 'ok',
        service: 'AICT Tutoring Service',
        available: true,
      });
    } else {
      return NextResponse.json(
        {
          status: 'error',
          service: 'AICT Tutoring Service',
          available: false,
        },
        { status: 503 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        service: 'AICT Tutoring Service',
        available: false,
        error: error.message,
      },
      { status: 503 }
    );
  }
}

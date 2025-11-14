/**
 * Code Evaluation API Endpoint
 *
 * This endpoint proxies requests to the AICT service for code evaluation.
 * It receives student code files and test definitions, forwards them to AICT,
 * and returns test results with pass/fail status for each test.
 */

import { NextRequest, NextResponse } from 'next/server';
import { evaluateCode } from '@/lib/aict-client';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.task || !body.task.tests || !Array.isArray(body.task.tests)) {
      return NextResponse.json(
        { error: 'Missing or invalid required field: task.tests (must be an array)' },
        { status: 400 }
      );
    }

    if (!body.files || typeof body.files !== 'object') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: files (must be an object)' },
        { status: 400 }
      );
    }

    // Validate test structure
    for (const test of body.task.tests) {
      if (!test.id || !test.code) {
        return NextResponse.json(
          { error: 'Each test must have an id and code property' },
          { status: 400 }
        );
      }
    }

    // Forward request to AICT service
    const response = await evaluateCode({
      task: {
        tests: body.task.tests,
      },
      files: body.files,
    });

    // Return AICT response
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Eval API Error:', error);

    // Check if it's an AICT service error
    if (error.message?.includes('AICT API Error')) {
      return NextResponse.json(
        { error: 'Failed to communicate with evaluation service', details: error.message },
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

// GET method to check if eval service is available
export async function GET() {
  try {
    const { checkHealth } = await import('@/lib/aict-client');
    const isHealthy = await checkHealth();

    if (isHealthy) {
      return NextResponse.json({
        status: 'ok',
        service: 'AICT Code Evaluation Service',
        available: true,
      });
    } else {
      return NextResponse.json(
        {
          status: 'error',
          service: 'AICT Code Evaluation Service',
          available: false,
        },
        { status: 503 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        service: 'AICT Code Evaluation Service',
        available: false,
        error: error.message,
      },
      { status: 503 }
    );
  }
}

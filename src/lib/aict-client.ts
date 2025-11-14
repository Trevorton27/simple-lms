/**
 * AICT Service Client
 *
 * This client library provides methods to communicate with the AICT
 * (AI Coding Interactive Tutor) service for tutoring, code evaluation,
 * hints, and challenge management.
 */

const AICT_BASE_URL = process.env.AICT_SERVICE_URL || 'http://localhost:3001';
const AICT_TOKEN = process.env.AICT_SERVICE_TOKEN || '';

interface AICTRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

/**
 * Base fetch function for AICT API calls
 */
async function aictFetch(endpoint: string, options: AICTRequestOptions = {}) {
  const { method = 'GET', body, headers = {} } = options;

  const url = `${AICT_BASE_URL}${endpoint}`;

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-LMS-Service-Token': AICT_TOKEN,
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AICT API Error (${response.status}): ${errorText}`);
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }

  return await response.text();
}

/**
 * Tutor API - Get AI tutoring response
 */
export async function getTutorResponse(request: {
  userText: string;
  context: {
    task?: Record<string, any>;
    test_result?: Record<string, any>;
    editor?: Record<string, any>;
    student?: Record<string, any>;
  };
}) {
  return aictFetch('/api/tutor', {
    method: 'POST',
    body: request,
  });
}

/**
 * Code Evaluation API - Evaluate student code against tests
 */
export async function evaluateCode(request: {
  task: {
    tests: Array<{
      id: string;
      code: string;
      label?: string;
      successMessage?: string;
      failureMessage?: string;
    }>;
  };
  files: Record<string, string>;
}) {
  return aictFetch('/api/eval', {
    method: 'POST',
    body: request,
  });
}

/**
 * Challenge API - Get challenge by slug
 */
export async function getChallenge(slug: string) {
  return aictFetch(`/api/v1/challenges/${slug}`);
}

/**
 * Challenge Hint API - Get contextual hint
 */
export async function getChallengeHint(slug: string, request: {
  files: Record<string, string>;
  lastTestResult?: Record<string, any>;
  level?: number;
}) {
  return aictFetch(`/api/v1/challenges/${slug}/hint`, {
    method: 'POST',
    body: request,
  });
}

/**
 * Challenge Solution API - Get solution for challenge
 */
export async function getChallengeSolution(slug: string, index: number = 0) {
  return aictFetch(`/api/v1/challenges/${slug}/solution?index=${index}`);
}

/**
 * Challenge Try Again API - Generate challenge variation
 */
export async function getChallengeVariation(slug: string, request: {
  difficulty?: 'same' | 'easier' | 'harder';
}) {
  return aictFetch(`/api/v1/challenges/${slug}/try-again`, {
    method: 'POST',
    body: request,
  });
}

/**
 * Knowledge Search API - Search knowledge base for RAG
 */
export async function searchKnowledge(request: {
  courseId: string;
  query: string;
  topK?: number;
}) {
  return aictFetch('/api/v1/knowledge/search', {
    method: 'POST',
    body: request,
  });
}

/**
 * Streaming Chat API - Get streaming AI chat response
 * Note: This returns a ReadableStream for server-sent events
 */
export async function streamChat(request: {
  conversationId: string;
  studentId: string;
  courseId: string;
  message: string;
  language?: string;
  retrieve?: { topK: number };
}) {
  const url = `${AICT_BASE_URL}/api/v1/chat.stream`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-LMS-Service-Token': AICT_TOKEN,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AICT Stream Error (${response.status}): ${errorText}`);
  }

  return response.body;
}

/**
 * Tools API - Run code in remote runner
 */
export async function runCode(request: {
  language: string;
  code: string;
  tests?: Array<any>;
}) {
  return aictFetch('/api/v1/tools/run_code', {
    method: 'POST',
    body: request,
  });
}

/**
 * Tools API - Generate quiz
 */
export async function makeQuiz(request: {
  topic: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  n?: number;
}) {
  return aictFetch('/api/v1/tools/make_quiz', {
    method: 'POST',
    body: request,
  });
}

/**
 * Tools API - Grade submission
 */
export async function gradeSubmission(request: {
  rubricId: string;
  repo_url?: string;
  code: string;
  rubricText: string;
}) {
  return aictFetch('/api/v1/tools/grade_submission', {
    method: 'POST',
    body: request,
  });
}

/**
 * Variants API - Generate task variation
 */
export async function getTaskVariant(request: {
  task_id: string;
  seed?: string;
}) {
  return aictFetch('/api/variants', {
    method: 'POST',
    body: request,
  });
}

/**
 * Health check for AICT service
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${AICT_BASE_URL}/api/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

'use client';

import { useState } from 'react';
import type {
  TutorRequest,
  EvalRequest,
  MasteryUpdateRequest,
  NextTaskRequest,
  ApiTestResult,
} from '@/types/api';

export default function ApiTesterPage() {
  const [results, setResults] = useState<ApiTestResult[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (result: ApiTestResult) => {
    setResults((prev) => [result, ...prev]);
  };

  const testEndpoint = async (
    endpoint: string,
    method: 'GET' | 'POST',
    body?: any,
    queryParams?: Record<string, string>
  ) => {
    setLoading(true);
    const startTime = performance.now();

    try {
      let url = `/api${endpoint}`;
      if (queryParams) {
        const params = new URLSearchParams(queryParams);
        url += `?${params.toString()}`;
      }

      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (method === 'POST' && body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const duration = performance.now() - startTime;
      const data = await response.json();

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      addResult({
        endpoint: url,
        method,
        status: response.status,
        statusText: response.statusText,
        headers,
        requestPayload: body,
        responsePayload: data,
        timestamp: new Date().toISOString(),
        duration,
      });
    } catch (error) {
      const duration = performance.now() - startTime;
      addResult({
        endpoint: `/api${endpoint}`,
        method,
        status: 0,
        statusText: 'Network Error',
        headers: {},
        requestPayload: body,
        responsePayload: { error: (error as Error).message },
        timestamp: new Date().toISOString(),
        duration,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-8">API Testing Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* POST /api/tutor */}
        <EndpointCard
          title="POST /api/tutor"
          description="Call the AI tutor with student question and context"
          onTest={() => {
            const request: TutorRequest = {
              userText: 'Help me add a button',
              context: {
                task: { id: 'test-task' },
                test_result: {},
                editor: { currentFile: 'index.html' },
                student: { userId: 'user_123' },
              },
            };
            testEndpoint('/tutor', 'POST', request);
          }}
          loading={loading}
        />

        {/* POST /api/eval */}
        <EndpointCard
          title="POST /api/eval"
          description="Run tests against student code"
          onTest={() => {
            const request: EvalRequest = {
              task: {
                tests: [
                  {
                    id: 'has-button',
                    code: "document.querySelector('button') !== null",
                  },
                ],
              },
              files: {
                'index.html': '<!DOCTYPE html><html><body></body></html>',
              },
            };
            testEndpoint('/eval', 'POST', request);
          }}
          loading={loading}
        />

        {/* POST /api/mastery */}
        <EndpointCard
          title="POST /api/mastery"
          description="Update student mastery scores"
          onTest={() => {
            const request: MasteryUpdateRequest = {
              userId: 'user_123',
              tags: ['html-basics', 'css-styling'],
              result: 'pass',
            };
            testEndpoint('/mastery', 'POST', request);
          }}
          loading={loading}
        />

        {/* GET /api/mastery */}
        <EndpointCard
          title="GET /api/mastery"
          description="Get student progress"
          onTest={() => {
            testEndpoint('/mastery', 'GET', undefined, { userId: 'user_123' });
          }}
          loading={loading}
        />

        {/* GET /api/tasks */}
        <EndpointCard
          title="GET /api/tasks"
          description="List all tasks"
          onTest={() => {
            testEndpoint('/tasks', 'GET', undefined, { difficulty: '1' });
          }}
          loading={loading}
        />

        {/* GET /api/tasks/[id] */}
        <EndpointCard
          title="GET /api/tasks/[id]"
          description="Get specific task with full details"
          onTest={() => {
            testEndpoint('/tasks/html-basics-1', 'GET');
          }}
          loading={loading}
        />

        {/* POST /api/tasks/next */}
        <EndpointCard
          title="POST /api/tasks/next"
          description="Get next recommended task"
          onTest={() => {
            const request: NextTaskRequest = {
              userId: 'user_123',
              strategy: 'just-right',
            };
            testEndpoint('/tasks/next', 'POST', request);
          }}
          loading={loading}
        />
      </div>

      {/* Results Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Test Results</h2>
          <button
            onClick={() => setResults([])}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Clear Results
          </button>
        </div>

        {results.length === 0 ? (
          <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-lg text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No test results yet. Click a test button above to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((result, index) => (
              <ResultCard key={index} result={result} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface EndpointCardProps {
  title: string;
  description: string;
  onTest: () => void;
  loading: boolean;
}

function EndpointCard({
  title,
  description,
  onTest,
  loading,
}: EndpointCardProps) {
  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 shadow-sm">
      <h3 className="font-mono text-sm font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {description}
      </p>
      <button
        onClick={onTest}
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Testing...' : 'Test Endpoint'}
      </button>
    </div>
  );
}

interface ResultCardProps {
  result: ApiTestResult;
}

function ResultCard({ result }: ResultCardProps) {
  const [expanded, setExpanded] = useState(true);

  const statusColor =
    result.status >= 200 && result.status < 300
      ? 'text-green-600 dark:text-green-400'
      : result.status >= 400
      ? 'text-red-600 dark:text-red-400'
      : 'text-yellow-600 dark:text-yellow-400';

  return (
    <div className="border rounded-lg bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs font-semibold px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
              {result.method}
            </span>
            <span className="font-mono text-sm">{result.endpoint}</span>
            <span className={`font-semibold ${statusColor}`}>
              {result.status} {result.statusText}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{result.duration.toFixed(0)}ms</span>
            <span>{new Date(result.timestamp).toLocaleTimeString()}</span>
            <span>{expanded ? '▼' : '▶'}</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t p-4 bg-gray-50 dark:bg-gray-800">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Request Payload */}
            {result.requestPayload && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Request Payload</h4>
                <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(result.requestPayload, null, 2)}
                </pre>
              </div>
            )}

            {/* Response Payload */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Response Payload</h4>
              <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
                {JSON.stringify(result.responsePayload, null, 2)}
              </pre>
            </div>
          </div>

          {/* Headers */}
          <div className="mt-4">
            <h4 className="font-semibold text-sm mb-2">Response Headers</h4>
            <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs">
              {Object.entries(result.headers).map(([key, value]) => (
                <div key={key} className="font-mono">
                  <span className="text-blue-400">{key}:</span>{' '}
                  <span className="text-gray-300">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

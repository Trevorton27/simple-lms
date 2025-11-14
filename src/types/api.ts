// API Type Definitions

// ============================================================================
// /api/tutor
// ============================================================================

export interface TutorRequest {
  userText: string;
  context: {
    task?: Record<string, any>;
    test_result?: Record<string, any>;
    editor?: Record<string, any>;
    student?: Record<string, any>;
  };
}

export interface TutorResponse {
  ui_messages: Array<{
    type: 'assistant' | 'user' | 'system';
    text: string;
  }>;
  hint?: {
    level: number;
    concept_tag: string;
  };
  actions?: Array<
    | { type: 'write_files'; files: Record<string, string> }
    | { type: 'run_tests' }
    | { type: string; [key: string]: any }
  >;
}

// ============================================================================
// /api/eval
// ============================================================================

export interface EvalRequest {
  task: {
    tests: Array<{
      id: string;
      code: string;
      description?: string;
    }>;
  };
  files: Record<string, string>;
}

export interface EvalResponse {
  passed: boolean;
  passedIds: string[];
  failedIds: string[];
  messages: Record<string, string>;
}

// ============================================================================
// /api/mastery
// ============================================================================

export interface MasteryUpdateRequest {
  userId: string;
  tags: string[];
  result: 'pass' | 'fail';
}

export interface MasteryUpdateResponse {
  ok: boolean;
  updates: Array<{
    concept: string;
    oldMastery: number;
    newMastery: number;
    change: number;
  }>;
}

export interface MasteryProgressResponse {
  userId: string;
  progress: Array<{
    concept: string;
    mastery: number;
    attempts: number;
    successes: number;
    successRate: string;
  }>;
}

// ============================================================================
// /api/tasks
// ============================================================================

export interface TasksListRequest {
  difficulty?: number;
  conceptId?: string;
}

export interface TaskSummary {
  id: string;
  title: string;
  difficulty: number;
  conceptIds: string[];
}

export interface TasksListResponse {
  tasks: TaskSummary[];
}

export interface TaskDetails {
  id: string;
  title: string;
  scaffold: Record<string, any>;
  tests: Array<{
    id: string;
    code: string;
    description?: string;
  }>;
  hints: Array<{
    level: number;
    text: string;
    concept_tag?: string;
  }>;
  difficulty?: number;
  conceptIds?: string[];
  description?: string;
}

export interface TaskDetailsResponse {
  task: TaskDetails;
}

export interface NextTaskRequest {
  userId: string;
  strategy: 'just-right' | 'sequential';
}

export interface NextTaskResponse {
  task: TaskDetails;
}

// ============================================================================
// Error Response
// ============================================================================

export interface ApiError {
  error: string;
}

// ============================================================================
// HTTP Response Wrapper (for dashboard testing)
// ============================================================================

export interface ApiTestResult {
  endpoint: string;
  method: 'GET' | 'POST';
  status: number;
  statusText: string;
  headers: Record<string, string>;
  requestPayload?: any;
  responsePayload: any;
  timestamp: string;
  duration: number;
}

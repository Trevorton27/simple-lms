# API Implementation Plan

## C) Required Environment Variables & Database Models

### Environment Variables Needed

Add these to your `.env` file:

```bash
# Existing (already configured)
DATABASE_URL='postgresql://...'
DIRECT_URL='postgresql://...'

# NEW - Required for API Implementation
ANTHROPIC_API_KEY='sk-ant-...'  # Your Claude API key
```

### Database Schema Additions Required

Your current schema is a traditional LMS (courses, lessons, enrollments). The API documentation describes an **interactive coding tutor** system. You need to add these models:

#### 1. **Task Model** - Coding exercises/challenges

```prisma
model Task {
  id                    String   @id @default(cuid())
  title                 String
  description           String?  @db.Text
  prompt                String   @db.Text
  difficulty            Int      @default(1) // 1-5
  prerequisites         String[] // Array of task IDs

  // Code content (JSON fields)
  scaffold              Json     // Initial files: { "index.html": "...", "style.css": "..." }
  solution              Json     // Complete solution files
  tests                 Json     // Test definitions: [{ id: "test-1", code: "...", description: "..." }]
  hints                 Json     // Three-tier hints: [{ level: 1, text: "...", concept_tag: "..." }]

  // Educational content
  detailedDescription   String?  @db.Text
  realWorldContext      String?  @db.Text

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // Relations
  concepts              ConceptTask[]
  attempts              Attempt[]

  @@index([difficulty])
}
```

#### 2. **Concept Model** - Learning concepts taxonomy

```prisma
model Concept {
  id              String   @id @default(cuid())
  name            String   @unique
  description     String?  @db.Text
  difficulty      Int      @default(1)
  prerequisites   String[] // Array of concept IDs

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  tasks           ConceptTask[]
  masteryProgress MasteryProgress[]

  @@index([name])
}
```

#### 3. **ConceptTask Model** - Many-to-many join table

```prisma
model ConceptTask {
  conceptId String
  taskId    String
  concept   Concept @relation(fields: [conceptId], references: [id], onDelete: Cascade)
  task      Task    @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@id([conceptId, taskId])
  @@index([conceptId])
  @@index([taskId])
}
```

#### 4. **MasteryProgress Model** - Student mastery tracking

```prisma
model MasteryProgress {
  id            String   @id @default(cuid())
  userId        String
  conceptId     String

  mastery       Int      @default(800)  // Elo-style: 600-1800
  attempts      Int      @default(0)
  successes     Int      @default(0)
  lastAttemptAt DateTime?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  concept       Concept  @relation(fields: [conceptId], references: [id], onDelete: Cascade)

  @@unique([userId, conceptId])
  @@index([userId])
  @@index([conceptId])
  @@index([mastery])
}
```

#### 5. **Attempt Model** - Student task submissions

```prisma
model Attempt {
  id            String   @id @default(cuid())
  userId        String
  taskId        String

  code          Json     // Submitted files
  passed        Boolean
  passedTests   String[] // Array of test IDs
  failedTests   String[] // Array of test IDs

  hintsUsed     Int      @default(0)
  maxHintLevel  Int      @default(0)
  timeSpentMs   Int      @default(0)

  createdAt     DateTime @default(now())

  // Relations
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  task          Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([taskId])
  @@index([passed])
  @@index([createdAt])
}
```

#### 6. **TutorConversation Model** - AI tutor chat sessions

```prisma
model TutorConversation {
  id           String   @id @default(cuid())
  userId       String
  taskId       String?  // Optional task context

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Relations
  user         User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages     TutorMessage[]

  @@index([userId])
  @@index([taskId])
}
```

#### 7. **TutorMessage Model** - Individual tutor messages

```prisma
model TutorMessage {
  id               String            @id @default(cuid())
  conversationId   String
  role             String            // "user" | "assistant" | "system"
  text             String            @db.Text

  // AI response metadata
  hintLevel        Int?              // 1-3 if hint was provided
  conceptTag       String?           // Concept referenced
  actions          Json?             // Actions taken: [{ type: "write_files", files: {...} }]

  createdAt        DateTime          @default(now())

  // Relations
  conversation     TutorConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
}
```

### Updated User Model

Add these relations to your existing `User` model:

```prisma
model User {
  // ... existing fields ...

  // ADD THESE:
  masteryProgress    MasteryProgress[]
  attempts           Attempt[]
  tutorConversations TutorConversation[]
}
```

---

## B) Full Implementation Details

### Implementation Steps

#### Step 1: Update Database Schema

```bash
# 1. Add the models above to prisma/schema.prisma
# 2. Generate Prisma client
npx prisma generate

# 3. Push to database
npx prisma db push
```

#### Step 2: Add Environment Variables

```bash
# Add to .env
ANTHROPIC_API_KEY='your-claude-api-key-here'
```

#### Step 3: Install Dependencies

```bash
npm install @anthropic-ai/sdk
# or
pnpm add @anthropic-ai/sdk
```

---

### API Endpoint Implementations

#### 1. `/api/tutor` - AI Tutor Integration

**File:** `src/app/api/tutor/route.ts`

**Features:**
- Integrates with Claude API
- Provides contextual help based on student's code
- Returns graduated hints (3 levels)
- Can suggest code edits or actions

**Implementation Complexity:** Medium-High
- Requires prompt engineering for educational context
- Needs to parse student context (task, code, test results)
- Should track conversation history
- Must generate appropriate hint levels

**Dependencies:**
- `@anthropic-ai/sdk` - Claude API client
- Prisma models: Task, TutorConversation, TutorMessage
- Environment: ANTHROPIC_API_KEY

---

#### 2. `/api/eval` - Code Evaluation

**File:** `src/app/api/eval/route.ts`

**Features:**
- Executes student code in a sandbox
- Runs test assertions
- Returns pass/fail with detailed messages
- Browser-based execution (jsdom or playwright)

**Implementation Complexity:** High
- Security: Must sandbox code execution
- Browser simulation: Need jsdom or playwright
- Test runner: Execute arbitrary test code safely
- HTML/CSS/JS support

**Dependencies:**
- `jsdom` - Browser environment simulation
- OR `playwright` - Full browser automation
- Prisma models: Task, Attempt (to save results)

**Security Considerations:**
- ⚠️ Never use `eval()` directly on user code
- Use isolated VM or browser context
- Set execution timeouts
- Limit resource usage

---

#### 3. `/api/mastery` - Progress Tracking

**File:** `src/app/api/mastery/route.ts`

**Features:**
- Updates mastery scores using Elo algorithm
- Tracks attempts, successes, failure rates
- GET: Retrieves student progress
- POST: Updates after task completion

**Implementation Complexity:** Low-Medium
- Elo algorithm implementation
- Database upserts for progress tracking
- Concept auto-creation if needed

**Dependencies:**
- Prisma models: MasteryProgress, Concept

---

#### 4. `/api/tasks` - Task Management

**File:** `src/app/api/tasks/route.ts`

**Features:**
- GET: List all tasks with filtering
- Filter by difficulty (1-5)
- Filter by concept
- Returns task summaries

**Implementation Complexity:** Low
- Simple database queries with filters
- JSON serialization

**Dependencies:**
- Prisma models: Task, Concept, ConceptTask

---

#### 5. `/api/tasks/[id]` - Task Details

**File:** `src/app/api/tasks/[id]/route.ts`

**Features:**
- GET: Full task details including scaffold, tests, hints
- Returns all educational content

**Implementation Complexity:** Low
- Simple database lookup with relations

**Dependencies:**
- Prisma models: Task, Concept, ConceptTask

---

#### 6. `/api/tasks/next` - Adaptive Task Selection

**File:** `src/app/api/tasks/next/route.ts`

**Features:**
- Recommends next task based on student mastery
- Strategies: "just-right" (adaptive), "sequential"
- Zone of Proximal Development algorithm

**Implementation Complexity:** Medium
- Requires algorithm for task recommendation
- Must consider mastery scores, prerequisites
- "just-right": Match task difficulty to student level
- "sequential": Simple ordered progression

**Dependencies:**
- Prisma models: Task, MasteryProgress, Attempt

---

### Example: Elo Mastery Algorithm

```typescript
const K_FACTOR = 32;
const MIN_MASTERY = 600;
const MAX_MASTERY = 1800;

function updateMasteryScore(
  currentScore: number,
  success: boolean,
  taskDifficulty: number
): number {
  // Expected performance based on rating difference
  const ratingDiff = (taskDifficulty * 200) - currentScore;
  const expected = 1 / (1 + Math.pow(10, ratingDiff / 400));

  // Actual performance
  const actual = success ? 1 : 0;

  // Update score
  const delta = K_FACTOR * (actual - expected);
  const newScore = currentScore + delta;

  // Clamp to bounds
  return Math.max(MIN_MASTERY, Math.min(MAX_MASTERY, newScore));
}
```

---

### Example: Just-Right Task Selection

```typescript
async function selectNextTask(
  userId: string,
  strategy: 'just-right' | 'sequential'
): Promise<Task | null> {
  if (strategy === 'sequential') {
    // Find first incomplete task by difficulty
    return await prisma.task.findFirst({
      where: {
        attempts: {
          none: {
            userId,
            passed: true
          }
        }
      },
      orderBy: [
        { difficulty: 'asc' },
        { createdAt: 'asc' }
      ]
    });
  }

  // Just-right: Zone of Proximal Development
  const avgMastery = await prisma.masteryProgress.aggregate({
    where: { userId },
    _avg: { mastery: true }
  });

  const studentLevel = avgMastery._avg.mastery || 800;

  // Find task slightly above student level
  const targetDifficulty = Math.ceil(
    ((studentLevel - 600) / 1200) * 5
  );

  return await prisma.task.findFirst({
    where: {
      difficulty: {
        gte: Math.max(1, targetDifficulty - 1),
        lte: Math.min(5, targetDifficulty + 1)
      },
      attempts: {
        none: {
          userId,
          passed: true
        }
      }
    },
    orderBy: { difficulty: 'asc' }
  });
}
```

---

### Security & Performance Considerations

#### Code Execution Security (for `/api/eval`)

**Option 1: jsdom (Lightweight)**
```typescript
import { JSDOM } from 'jsdom';

// Pros: Fast, lightweight, no browser needed
// Cons: Limited browser API support, no visual rendering

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable'
});
```

**Option 2: Playwright (Full Browser)**
```typescript
import { chromium } from 'playwright';

// Pros: Full browser environment, accurate testing
// Cons: Heavier, slower, requires headless Chrome

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html);
```

**Recommendation:** Start with jsdom, upgrade to Playwright if you need:
- CSS layout testing
- DOM manipulation verification
- Visual regression testing

#### Rate Limiting

```typescript
// Add to protect Claude API calls
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: redisClient,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
});
```

#### Caching

```typescript
// Cache task data to reduce DB queries
import { unstable_cache } from 'next/cache';

const getTask = unstable_cache(
  async (id: string) => {
    return await prisma.task.findUnique({ where: { id } });
  },
  ['task'],
  { revalidate: 3600 } // 1 hour
);
```

---

### Testing Strategy

#### 1. Unit Tests
- Test mastery algorithm calculations
- Test task selection logic
- Test hint generation

#### 2. Integration Tests
- Test database operations
- Test Claude API integration
- Test code evaluation sandbox

#### 3. E2E Tests
- Test complete user flow
- Test API dashboard functionality
- Test error handling

---

### Estimated Implementation Time

| Endpoint | Complexity | Time Estimate |
|----------|-----------|---------------|
| `/api/mastery` | Low | 2-3 hours |
| `/api/tasks` | Low | 1-2 hours |
| `/api/tasks/[id]` | Low | 1 hour |
| `/api/tasks/next` | Medium | 3-4 hours |
| `/api/tutor` | Medium-High | 6-8 hours |
| `/api/eval` | High | 8-12 hours |
| **Database Schema** | - | 2 hours |
| **Testing & Debugging** | - | 4-6 hours |
| **TOTAL** | - | **27-38 hours** |

---

### Next Steps

1. **Decide on approach:**
   - Start with mock/stub implementations (faster)
   - Or go full implementation (complete but longer)

2. **Schema first:**
   - Add database models to Prisma schema
   - Run migrations
   - Seed with sample tasks

3. **Implement in order:**
   - Phase 1: `/api/tasks`, `/api/tasks/[id]` (data retrieval)
   - Phase 2: `/api/mastery` (progress tracking)
   - Phase 3: `/api/tasks/next` (recommendations)
   - Phase 4: `/api/eval` (code testing)
   - Phase 5: `/api/tutor` (AI integration)

4. **Test incrementally:**
   - Use API tester dashboard after each endpoint
   - Fix issues before moving to next phase

---

## Ready to Proceed?

Let me know if you want me to:

**Option A:** Create stub implementations now (quick testing, fake data)
**Option B:** Implement full database schema + all endpoints (production-ready)
**Option C:** Phased approach (implement 1-2 endpoints at a time for testing)

Which would you prefer?

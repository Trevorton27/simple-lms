import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Elo-style mastery scoring constants
const K_FACTOR = 32;
const MIN_MASTERY = 600;
const MAX_MASTERY = 1800;

function updateMasteryScore(currentScore: number, success: boolean): number {
  // Simple Elo update: expected = 0.5, actual = 1 (success) or 0 (failure)
  const expected = 0.5;
  const actual = success ? 1 : 0;
  const delta = K_FACTOR * (actual - expected);
  const newScore = currentScore + delta;

  // Clamp to bounds
  return Math.max(MIN_MASTERY, Math.min(MAX_MASTERY, newScore));
}

// GET /api/mastery?userId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    const progress = await db.masteryProgress.findMany({
      where: { userId },
      include: {
        concept: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { mastery: 'desc' },
    });

    const formattedProgress = progress.map((p) => ({
      concept: p.concept.name,
      mastery: p.mastery,
      attempts: p.attempts,
      successes: p.successes,
      successRate: p.attempts > 0 ? ((p.successes / p.attempts) * 100).toFixed(1) : '0.0',
    }));

    return NextResponse.json({ userId, progress: formattedProgress });
  } catch (error) {
    console.error('GET /api/mastery error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mastery data' },
      { status: 500 }
    );
  }
}

// POST /api/mastery
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, tags, result } = body;

    if (!userId || !tags || !Array.isArray(tags) || !result) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, tags, result' },
        { status: 400 }
      );
    }

    if (result !== 'pass' && result !== 'fail') {
      return NextResponse.json(
        { error: 'result must be "pass" or "fail"' },
        { status: 400 }
      );
    }

    const success = result === 'pass';
    const updates = [];

    // Process each concept tag
    for (const conceptName of tags) {
      // Ensure concept exists (auto-create if needed)
      const concept = await db.concept.upsert({
        where: { name: conceptName },
        update: {},
        create: {
          name: conceptName,
          description: `Auto-created concept: ${conceptName}`,
          difficulty: 2,
          prerequisites: [],
        },
      });

      // Get existing progress
      const existingProgress = await db.masteryProgress.findUnique({
        where: {
          userId_conceptId: {
            userId,
            conceptId: concept.id,
          },
        },
      });

      const currentMastery = existingProgress?.mastery || 800;
      const newMastery = updateMasteryScore(currentMastery, success);

      // Upsert progress
      const progress = await db.masteryProgress.upsert({
        where: {
          userId_conceptId: {
            userId,
            conceptId: concept.id,
          },
        },
        update: {
          mastery: newMastery,
          attempts: { increment: 1 },
          successes: success ? { increment: 1 } : undefined,
          lastAttemptAt: new Date(),
        },
        create: {
          userId,
          conceptId: concept.id,
          mastery: newMastery,
          attempts: 1,
          successes: success ? 1 : 0,
          lastAttemptAt: new Date(),
        },
      });

      updates.push({
        concept: conceptName,
        oldMastery: currentMastery,
        newMastery: progress.mastery,
        change: progress.mastery - currentMastery,
      });
    }

    return NextResponse.json({ ok: true, updates });
  } catch (error) {
    console.error('POST /api/mastery error:', error);
    return NextResponse.json(
      { error: 'Failed to update mastery data' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    console.log('[NEW API] GET /api/tasks called');
    const { searchParams } = new URL(req.url);
    const difficultyParam = searchParams.get('difficulty');
    const conceptId = searchParams.get('conceptId');

    // Build where clause
    const where: any = {};

    if (difficultyParam) {
      const difficulty = parseInt(difficultyParam, 10);
      if (!isNaN(difficulty) && difficulty >= 1 && difficulty <= 5) {
        where.difficulty = difficulty;
      }
    }

    if (conceptId) {
      where.concepts = {
        some: {
          conceptId: conceptId,
        },
      };
    }

    const tasks = await db.task.findMany({
      where,
      select: {
        id: true,
        title: true,
        difficulty: true,
        concepts: {
          include: {
            concept: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ difficulty: 'asc' }, { createdAt: 'asc' }],
    });

    console.log(`[NEW API] Found ${tasks.length} tasks`);

    // Format response to match API spec
    const formattedTasks = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      difficulty: task.difficulty,
      conceptIds: task.concepts.map((ct) => ct.concept.id),
    }));

    return NextResponse.json({ tasks: formattedTasks });
  } catch (error) {
    console.error('GET /api/tasks error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

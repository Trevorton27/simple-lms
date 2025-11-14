import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const task = await db.task.findUnique({
      where: { id },
      include: {
        concepts: {
          include: {
            concept: {
              select: {
                id: true,
                name: true,
                description: true,
                difficulty: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Format response to match API spec
    const formattedTask = {
      id: task.id,
      title: task.title,
      description: task.description,
      prompt: task.prompt,
      difficulty: task.difficulty,
      scaffold: task.scaffold,
      tests: task.tests,
      hints: task.hints,
      conceptIds: task.concepts.map((ct) => ct.concept.id),
      detailedDescription: task.detailedDescription,
      realWorldContext: task.realWorldContext,
    };

    return NextResponse.json({ task: formattedTask });
  } catch (error) {
    console.error('GET /api/tasks/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

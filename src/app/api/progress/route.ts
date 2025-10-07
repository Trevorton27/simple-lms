import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';

const upsertProgressSchema = z.object({
  lessonId: z.string(),
  secondsWatched: z.number().min(0),
  completed: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = upsertProgressSchema.parse(body);

    // Get lesson duration
    const lesson = await db.lesson.findUnique({
      where: { id: data.lessonId },
      select: { durationSec: true },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Determine if completed
    const isCompleted =
      data.completed ||
      (lesson.durationSec && data.secondsWatched >= lesson.durationSec * 0.9);

    // Upsert progress
    const progress = await db.progress.upsert({
      where: {
        userId_lessonId: {
          userId: clerkUser.id,
          lessonId: data.lessonId,
        },
      },
      create: {
        userId: clerkUser.id,
        lessonId: data.lessonId,
        secondsWatched: data.secondsWatched,
        completedAt: isCompleted ? new Date() : null,
      },
      update: {
        secondsWatched: data.secondsWatched,
        completedAt: isCompleted ? new Date() : undefined,
      },
    });

    return NextResponse.json(progress);
  } catch (error) {
    console.error('Error updating progress:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get('lessonId');
    const courseId = searchParams.get('courseId');

    if (lessonId) {
      // Get progress for specific lesson
      const progress = await db.progress.findUnique({
        where: {
          userId_lessonId: {
            userId: clerkUser.id,
            lessonId,
          },
        },
      });

      return NextResponse.json(progress || null);
    }

    if (courseId) {
      // Get all progress for a course
      const progress = await db.progress.findMany({
        where: {
          userId: clerkUser.id,
          lesson: {
            module: {
              courseId,
            },
          },
        },
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
              moduleId: true,
              durationSec: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      return NextResponse.json(progress);
    }

    // Get all user progress
    const progress = await db.progress.findMany({
      where: { userId: clerkUser.id },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            moduleId: true,
            durationSec: true,
            module: {
              select: {
                courseId: true,
                course: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json(progress);
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
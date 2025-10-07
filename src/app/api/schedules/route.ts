import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { requireCourseOwnership } from '@/lib/rbac';

const createScheduleSchema = z.object({
  courseId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  location: z.string().optional(),
  isOnline: z.boolean().default(false),
  meetingUrl: z.string().url().optional(),
  recurrenceRule: z.string().optional(),
  visibility: z.enum(['ENROLLED_ONLY', 'PUBLIC']).default('ENROLLED_ONLY'),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = createScheduleSchema.parse(body);

    // Check course ownership
    await requireCourseOwnership(user.id, data.courseId);

    const schedule = await db.schedule.create({
      data: {
        courseId: data.courseId,
        title: data.title,
        description: data.description,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        location: data.location,
        isOnline: data.isOnline,
        meetingUrl: data.meetingUrl,
        recurrenceRule: data.recurrenceRule,
        visibility: data.visibility,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorUserId: user.id,
        action: 'CREATE',
        entity: 'Schedule',
        entityId: schedule.id,
        metadata: {
          courseId: data.courseId,
          title: data.title,
        },
      },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error('Error creating schedule:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json(
        { error: 'courseId is required' },
        { status: 400 }
      );
    }

    // Check if user is enrolled or is course owner
    const isOwner = await db.course.findFirst({
      where: { id: courseId, ownerId: user.id },
    });

    const isEnrolled = await db.enrollment.findUnique({
      where: {
        userId_courseId: { userId: user.id, courseId },
        status: 'ENROLLED',
      },
    });

    if (!isOwner && !isEnrolled) {
      // Check if schedules are public
      const schedules = await db.schedule.findMany({
        where: {
          courseId,
          visibility: 'PUBLIC',
        },
        orderBy: { startsAt: 'asc' },
      });

      return NextResponse.json(schedules);
    }

    // Return all schedules for enrolled users or owners
    const schedules = await db.schedule.findMany({
      where: { courseId },
      orderBy: { startsAt: 'asc' },
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
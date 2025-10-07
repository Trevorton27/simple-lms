import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

const createEnrollmentSchema = z.object({
  courseId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    // Demo mode: Use first user in database
    const user = await db.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: 'No user found in database' }, { status: 500 });
    }

    const body = await req.json();
    const data = createEnrollmentSchema.parse(body);

    // Check if course exists and is published
    const course = await db.course.findUnique({ where: { id: data.courseId } });
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    if (!course.publishedAt) {
      return NextResponse.json({ error: 'Course is not published' }, { status: 400 });
    }

    // Check if already enrolled
    const existing = await db.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: data.courseId,
        },
      },
    });

    if (existing) {
      if (existing.status === 'ENROLLED') {
        return NextResponse.json({ error: 'Already enrolled' }, { status: 400 });
      }

      // Re-enroll if previously cancelled/refunded
      const reenrolled = await db.enrollment.update({
        where: { id: existing.id },
        data: { status: 'ENROLLED', enrolledAt: new Date() },
      });

      await db.auditLog.create({
        data: {
          actorUserId: user.id,
          action: 'UPDATE',
          entity: 'Enrollment',
          entityId: reenrolled.id,
          metadata: { courseId: data.courseId, previousStatus: existing.status, newStatus: 'ENROLLED' },
        },
      });

      return NextResponse.json(reenrolled, { status: 200 });
    }

    // Create enrollment
    const enrollment = await db.enrollment.create({
      data: {
        userId: user.id,
        courseId: data.courseId,
        status: 'ENROLLED',
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorUserId: user.id,
        action: 'CREATE',
        entity: 'Enrollment',
        entityId: enrollment.id,
        metadata: { courseId: data.courseId },
      },
    });

    return NextResponse.json(enrollment, { status: 201 });
  } catch (error) {
    console.error('Error creating enrollment:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Demo mode: Use first user in database
    const user = await db.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: 'No user found in database' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (courseId) {
      // Get enrollments for a specific course
      const enrollments = await db.enrollment.findMany({
        where: {
          courseId,
          status: 'ENROLLED',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      });

      return NextResponse.json(enrollments);
    }

    // Get user's own enrollments
    const enrollments = await db.enrollment.findMany({
      where: {
        userId: user.id,
        status: 'ENROLLED',
      },
      include: {
        course: {
          include: {
            owner: {
              select: { id: true, name: true, avatarUrl: true },
            },
            _count: { select: { modules: true } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return NextResponse.json(enrollments);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

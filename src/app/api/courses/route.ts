import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const createCourseSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']).default('PRIVATE'),
});

export async function POST(req: NextRequest) {
  try {
    // For demo purposes, use first user or create one
    let user = await db.user.findFirst();
    if (!user) {
      user = await db.user.create({
        data: {
          id: 'demo-user',
          email: 'demo@example.com',
          name: 'Demo User',
        },
      });
    }

    const body = await req.json();
    const data = createCourseSchema.parse(body);

    // Check slug uniqueness
    const existing = await db.course.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Slug already exists' },
        { status: 400 }
      );
    }

    const course = await db.course.create({
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description,
        price: data.price,
        visibility: data.visibility,
        ownerId: user.id,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorUserId: user.id,
        action: 'CREATE',
        entity: 'Course',
        entityId: course.id,
        metadata: { title: course.title },
      },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error('Error creating course:', error);
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
    const { searchParams } = new URL(req.url);
    const visibility = searchParams.get('visibility');
    const ownerId = searchParams.get('ownerId');
    const search = searchParams.get('search');

    const where: any = {};

    // Show all public and published courses
    where.visibility = 'PUBLIC';
    where.publishedAt = { not: null };

    if (visibility) {
      where.visibility = visibility;
    }

    if (ownerId) {
      where.ownerId = ownerId;
      delete where.visibility;
      delete where.publishedAt;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const courses = await db.course.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
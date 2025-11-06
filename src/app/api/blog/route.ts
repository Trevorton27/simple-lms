import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [posts, tags] = await Promise.all([
      db.blogPost.findMany({
        where: {
          isPublished: true,
        },
        include: {
          author: {
            select: {
              name: true,
              email: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: {
          publishDate: 'desc',
        },
      }),
      db.blogTag.findMany({
        orderBy: {
          nameEn: 'asc',
        },
      }),
    ]);

    return NextResponse.json({ posts, tags });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}

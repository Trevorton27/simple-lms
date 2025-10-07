import Link from 'next/link';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  const courses = await db.course.findMany({
    where: {
      visibility: 'PUBLIC',
      publishedAt: { not: null },
    },
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              LMS Platform
            </Link>
            <div className="flex gap-4">
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Browse Courses</h1>
          <p className="text-gray-600">
            Discover our collection of courses taught by expert instructors
          </p>
        </div>

        {courses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 mb-4">No courses available yet.</p>
            <p className="text-sm text-gray-500">Check back soon for new courses!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.slug}`}
                className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <h3 className="font-semibold text-xl mb-2">{course.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {course.description || 'No description available'}
                  </p>

                  <div className="flex items-center mb-4">
                    {course.owner.avatarUrl && (
                      <img
                        src={course.owner.avatarUrl}
                        alt={course.owner.name || 'Instructor'}
                        className="w-8 h-8 rounded-full mr-2"
                      />
                    )}
                    <span className="text-sm text-gray-600">
                      {course.owner.name || 'Unknown Instructor'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>{course._count.modules} modules</span>
                    <span>{course._count.enrollments} students</span>
                  </div>

                  {course.price && (
                    <div className="mt-4 pt-4 border-t">
                      <span className="text-2xl font-bold text-blue-600">
                        ${course.price.toString()}
                      </span>
                    </div>
                  )}

                  {!course.price && (
                    <div className="mt-4 pt-4 border-t">
                      <span className="text-lg font-semibold text-green-600">
                        Free
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
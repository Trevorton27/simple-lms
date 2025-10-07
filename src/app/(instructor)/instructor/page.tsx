import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function InstructorDashboard() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect('/sign-in');
  }

  // Get or create user
  let user = await db.user.findUnique({
    where: { id: clerkUser.id },
    include: {
      roles: {
        include: { role: true },
      },
    },
  });

  if (!user) {
    redirect('/dashboard');
  }

  // Check if user has instructor or admin role
  const hasInstructorAccess = user.roles.some(
    (ur) => ur.role.name === 'INSTRUCTOR' || ur.role.name === 'ADMIN'
  );

  if (!hasInstructorAccess) {
    redirect('/dashboard');
  }

  // Get instructor's courses
  const courses = await db.course.findMany({
    where: {
      ownerId: user.id,
    },
    include: {
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

  // Get total students across all courses
  const totalEnrollments = courses.reduce(
    (sum, course) => sum + course._count.enrollments,
    0
  );

  // Get upcoming schedules
  const upcomingSchedules = await db.schedule.findMany({
    where: {
      course: {
        ownerId: user.id,
      },
      startsAt: {
        gte: new Date(),
      },
    },
    include: {
      course: {
        select: {
          title: true,
        },
      },
    },
    orderBy: {
      startsAt: 'asc',
    },
    take: 5,
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
              <Link href="/courses" className="text-gray-700 hover:text-blue-600">
                Courses
              </Link>
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">
                Dashboard
              </Link>
              <Link href="/instructor" className="text-gray-700 hover:text-blue-600 font-semibold">
                Instructor
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Instructor Dashboard</h1>
            <p className="text-gray-600">Manage your courses and students</p>
          </div>
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold">
            + Create Course
          </button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm mb-1">Total Courses</p>
            <p className="text-3xl font-bold">{courses.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm mb-1">Total Students</p>
            <p className="text-3xl font-bold">{totalEnrollments}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm mb-1">Published Courses</p>
            <p className="text-3xl font-bold">
              {courses.filter((c) => c.publishedAt).length}
            </p>
          </div>
        </div>

        {/* Upcoming Sessions */}
        {upcomingSchedules.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Upcoming Sessions</h2>
            <div className="bg-white rounded-lg shadow divide-y">
              {upcomingSchedules.map((schedule) => (
                <div key={schedule.id} className="p-4">
                  <h3 className="font-semibold">{schedule.course.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{schedule.title}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(schedule.startsAt).toLocaleString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {schedule.isOnline && (
                    <p className="text-sm text-blue-600 mt-1">📹 Online</p>
                  )}
                  {schedule.location && !schedule.isOnline && (
                    <p className="text-sm text-gray-500 mt-1">
                      📍 {schedule.location}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Courses List */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">My Courses</h2>
          
          {courses.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-600 mb-4">
                You haven't created any courses yet.
              </p>
              <button className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold">
                Create Your First Course
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-lg flex-1">
                        {course.title}
                      </h3>
                      {course.publishedAt ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Published
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          Draft
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {course.description || 'No description'}
                    </p>

                    <div className="flex justify-between text-sm text-gray-600 mb-4">
                      <span>{course._count.modules} modules</span>
                      <span>{course._count.enrollments} students</span>
                    </div>

                    <div className="flex gap-2">
                      <button className="flex-1 text-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-semibold">
                        Edit
                      </button>
                      <Link
                        href={`/courses/${course.slug}`}
                        className="flex-1 text-center border border-gray-300 px-4 py-2 rounded hover:bg-gray-50 text-sm font-semibold"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const clerkUser = await currentUser();
  
  if (!clerkUser) {
    redirect('/sign-in');
  }

  // Get or create user in database
  let user = await db.user.findUnique({
    where: { id: clerkUser.id },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
      },
    });
  }

  // Get enrolled courses with progress
  const enrollments = await db.enrollment.findMany({
    where: {
      userId: user.id,
      status: 'ENROLLED',
    },
    include: {
      course: {
        include: {
          modules: {
            include: {
              lessons: {
                select: {
                  id: true,
                  durationSec: true,
                },
              },
            },
          },
          owner: {
            select: {
              name: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
    orderBy: {
      enrolledAt: 'desc',
    },
  });

  // Get progress for all enrolled courses
  const progress = await db.progress.findMany({
    where: {
      userId: user.id,
    },
    select: {
      lessonId: true,
      completedAt: true,
    },
  });

  const progressMap = new Map(
    progress.map((p) => [p.lessonId, p.completedAt !== null])
  );

  // Get upcoming schedules
  const upcomingSchedules = await db.schedule.findMany({
    where: {
      course: {
        enrollments: {
          some: {
            userId: user.id,
            status: 'ENROLLED',
          },
        },
      },
      startsAt: {
        gte: new Date(),
      },
    },
    include: {
      course: {
        select: {
          title: true,
          slug: true,
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
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 font-semibold">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user.name}!</h1>
          <p className="text-gray-600">Continue learning where you left off</p>
        </div>

        {/* Upcoming Schedules */}
        {upcomingSchedules.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Upcoming Sessions</h2>
            <div className="bg-white rounded-lg shadow divide-y">
              {upcomingSchedules.map((schedule) => (
                <div key={schedule.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {schedule.course.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {schedule.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(schedule.startsAt).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {schedule.isOnline && schedule.meetingUrl && (
                        <a
                          href={schedule.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2 text-blue-600 hover:underline text-sm"
                        >
                          Join Meeting →
                        </a>
                      )}
                      {!schedule.isOnline && schedule.location && (
                        <p className="text-sm text-gray-500 mt-1">
                          📍 {schedule.location}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enrolled Courses */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">My Courses</h2>
          {enrollments.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600 mb-4">
                You haven't enrolled in any courses yet.
              </p>
              <Link
                href="/courses"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Browse Courses
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrollments.map((enrollment) => {
                const course = enrollment.course;
                const totalLessons = course.modules.reduce(
                  (sum, mod) => sum + mod.lessons.length,
                  0
                );
                const completedLessons = course.modules.reduce(
                  (sum, mod) =>
                    sum +
                    mod.lessons.filter((lesson) => progressMap.get(lesson.id))
                      .length,
                  0
                );
                const progressPercent =
                  totalLessons > 0
                    ? Math.round((completedLessons / totalLessons) * 100)
                    : 0;

                return (
                  <Link
                    key={course.id}
                    href={`/courses/${course.slug}`}
                    className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="p-6">
                      <h3 className="font-semibold text-lg mb-2">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {course.description}
                      </p>

                      <div className="flex items-center mb-3">
                        {course.owner.avatarUrl && (
                          <img
                            src={course.owner.avatarUrl}
                            alt={course.owner.name || 'Instructor'}
                            className="w-8 h-8 rounded-full mr-2"
                          />
                        )}
                        <span className="text-sm text-gray-600">
                          {course.owner.name}
                        </span>
                      </div>

                      <div className="mb-2">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>
                            {completedLessons}/{totalLessons} lessons
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      <p className="text-sm font-semibold text-blue-600">
                        {progressPercent === 100
                          ? '✓ Completed'
                          : progressPercent === 0
                          ? 'Start Course'
                          : 'Continue Learning'}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
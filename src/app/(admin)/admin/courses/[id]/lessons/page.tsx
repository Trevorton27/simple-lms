import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

interface Props {
  params: {
    id: string;
  };
}

export default async function AdminCourseLessonsPage({ params }: Props) {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect('/sign-in');
  }

  const user = await db.user.findUnique({
    where: { id: clerkUser.id },
    include: {
      roles: {
        include: { role: true },
      },
    },
  });

  const isAdmin = user?.roles.some((ur) => ur.role.name === 'ADMIN');
  if (!isAdmin) {
    redirect('/dashboard');
  }

  const course = await db.course.findUnique({
    where: { id: params.id },
    include: {
      modules: {
        include: {
          lessons: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!course) {
    notFound();
  }

  const createModule = async (formData: FormData) => {
    'use server';

    const title = formData.get('moduleTitle') as string;
    const maxOrder = await db.module.findFirst({
      where: { courseId: params.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    await db.module.create({
      data: {
        courseId: params.id,
        title,
        order: (maxOrder?.order || 0) + 1,
      },
    });

    revalidatePath(`/admin/courses/${params.id}/lessons`);
  };

  const createLesson = async (formData: FormData) => {
    'use server';

    const moduleId = formData.get('moduleId') as string;
    const title = formData.get('lessonTitle') as string;
    const content = formData.get('content') as string;
    const videoUrl = formData.get('videoUrl') as string;
    const durationSec = formData.get('durationSec') as string;
    const isFreePreview = formData.get('isFreePreview') === 'on';

    const maxOrder = await db.lesson.findFirst({
      where: { moduleId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    await db.lesson.create({
      data: {
        moduleId,
        title,
        content,
        videoUrl: videoUrl || null,
        durationSec: durationSec ? parseInt(durationSec) : null,
        isFreePreview,
        order: (maxOrder?.order || 0) + 1,
      },
    });

    revalidatePath(`/admin/courses/${params.id}/lessons`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/admin" className="text-2xl font-bold text-blue-600">
              LMS Admin
            </Link>
            <Link href="/admin/courses" className="text-gray-700 hover:text-blue-600">
              ← Back to Courses
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{course.title} - Manage Content</h1>
          <p className="text-gray-600">Create and organize modules and lessons</p>
        </div>

        {/* Create Module Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New Module</h2>
          <form action={createModule} className="flex gap-4">
            <input
              type="text"
              name="moduleTitle"
              required
              placeholder="Module title..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Add Module
            </button>
          </form>
        </div>

        {/* Modules and Lessons */}
        <div className="space-y-6">
          {course.modules.map((module, idx) => (
            <div key={module.id} className="bg-white rounded-lg shadow">
              <div className="p-6 border-b bg-gray-50">
                <h3 className="text-xl font-semibold">
                  Module {idx + 1}: {module.title}
                </h3>
              </div>

              {/* Lessons List */}
              <div className="p-6">
                {module.lessons.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {module.lessons.map((lesson, lessonIdx) => (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded"
                      >
                        <div>
                          <span className="font-medium">
                            Lesson {lessonIdx + 1}: {lesson.title}
                          </span>
                          {lesson.isFreePreview && (
                            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              Free Preview
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {lesson.durationSec && `${Math.floor(lesson.durationSec / 60)}m`}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 mb-4">No lessons yet</p>
                )}

                {/* Create Lesson Form */}
                <details className="border-t pt-4">
                  <summary className="cursor-pointer text-blue-600 font-semibold">
                    + Add Lesson to this Module
                  </summary>
                  <form action={createLesson} className="mt-4 space-y-4">
                    <input type="hidden" name="moduleId" value={module.id} />
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lesson Title *
                      </label>
                      <input
                        type="text"
                        name="lessonTitle"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Introduction to HTML"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Content (Markdown)
                      </label>
                      <textarea
                        name="content"
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="# Lesson content here..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Video URL
                        </label>
                        <input
                          type="url"
                          name="videoUrl"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="https://youtube.com/watch?v=..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Duration (seconds)
                        </label>
                        <input
                          type="number"
                          name="durationSec"
                          min="0"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="300"
                        />
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`preview-${module.id}`}
                        name="isFreePreview"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`preview-${module.id}`} className="ml-2 text-sm text-gray-700">
                        Free preview lesson
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold"
                    >
                      Create Lesson
                    </button>
                  </form>
                </details>
              </div>
            </div>
          ))}

          {course.modules.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-600">No modules yet. Create your first module above!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
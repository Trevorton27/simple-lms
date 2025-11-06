import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export default async function AdminNewCoursePage() {
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

  // Get all instructors for assignment
  const instructors = await db.user.findMany({
    where: {
      roles: {
        some: {
          role: {
            name: 'INSTRUCTOR',
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const createCourse = async (formData: FormData) => {
    'use server';

    const title = formData.get('title') as string;
    const slug = formData.get('slug') as string;
    const description = formData.get('description') as string;
    const price = formData.get('price') as string;
    const visibility = formData.get('visibility') as string;
    const ownerId = formData.get('ownerId') as string;
    const published = formData.get('published') === 'on';

    const course = await db.course.create({
      data: {
        title,
        slug,
        description,
        price: price ? parseFloat(price) : null,
        visibility,
        ownerId,
        publishedAt: published ? new Date() : null,
      },
    });

    await db.auditLog.create({
      data: {
        actorUserId: clerkUser.id,
        action: 'CREATE',
        entity: 'Course',
        entityId: course.id,
        metadata: { title, createdBy: 'admin' },
      },
    });

    redirect(`/admin/courses/${course.id}`);
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
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Create New Course</h1>

          <form action={createCourse} className="bg-white rounded-lg shadow p-6 space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Course Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Introduction to Web Development"
              />
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
                URL Slug * (lowercase, hyphens only)
              </label>
              <input
                type="text"
                id="slug"
                name="slug"
                required
                pattern="[a-z0-9-]+"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="intro-to-web-dev"
              />
              <p className="mt-1 text-sm text-gray-500">
                Will be used in URL: /courses/your-slug
              </p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Course description..."
              />
            </div>

            <div>
              <label htmlFor="ownerId" className="block text-sm font-medium text-gray-700 mb-2">
                Assign to Instructor *
              </label>
              <select
                id="ownerId"
                name="ownerId"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select instructor...</option>
                {instructors.map((instructor) => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.name} ({instructor.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                  Price (USD)
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="99.99"
                />
                <p className="mt-1 text-sm text-gray-500">Leave empty for free</p>
              </div>

              <div>
                <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 mb-2">
                  Visibility *
                </label>
                <select
                  id="visibility"
                  name="visibility"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="PRIVATE">Private</option>
                  <option value="PUBLIC">Public</option>
                  <option value="UNLISTED">Unlisted</option>
                </select>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="published"
                name="published"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="published" className="ml-2 text-sm text-gray-700">
                Publish immediately
              </label>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
              >
                Create Course
              </button>
              <Link
                href="/admin/courses"
                className="flex-1 text-center border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 font-semibold"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
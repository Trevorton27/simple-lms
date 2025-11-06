import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import { db } from '@/lib/db';

export default async function AdminDashboard() {
  const clerkUser = await currentUser();

  console.log('=== ADMIN PAGE DEBUG ===');
  console.log('Clerk User ID:', clerkUser?.id);
  console.log('Clerk User Email:', clerkUser?.emailAddresses?.[0]?.emailAddress);

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

  console.log('Database User Found:', user ? 'YES' : 'NO');
  if (user) {
    console.log('User Email:', user.email);
    console.log('User Roles:', user.roles.map((ur) => ur.role.name));
  }

  if (!user) {
    console.log('❌ User not found in database - redirecting to /dashboard');
    redirect('/dashboard');
  }

  // Check if user has admin role
  const isAdmin = user.roles.some((ur) => ur.role.name === 'ADMIN');
  console.log('Is Admin?', isAdmin);

  if (!isAdmin) {
    console.log('❌ User does not have ADMIN role - redirecting to /dashboard');
    redirect('/dashboard');
  }

  console.log('✅ Admin access granted!');
  console.log('======================');

  // Get statistics
  const [totalUsers, totalCourses, totalEnrollments, recentUsers] = await Promise.all([
    db.user.count(),
    db.course.count(),
    db.enrollment.count({ where: { status: 'ENROLLED' } }),
    db.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        roles: {
          include: { role: true },
        },
      },
    }),
  ]);

  const totalInstructors = await db.userRole.count({
    where: {
      role: { name: 'INSTRUCTOR' },
    },
  });

  const totalStudents = await db.userRole.count({
    where: {
      role: { name: 'STUDENT' },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              LMS Platform - Admin
            </Link>
            <div className="flex gap-4 items-center">
              <Link href="/blog" className="text-gray-700 hover:text-blue-600">
                Blog
              </Link>
              <Link href="/courses" className="text-gray-700 hover:text-blue-600">
                Courses
              </Link>
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">
                Dashboard
              </Link>
              <Link href="/admin" className="text-gray-700 hover:text-blue-600 font-semibold">
                Admin
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage users, courses, and content</p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm mb-1">Total Users</p>
            <p className="text-3xl font-bold">{totalUsers}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm mb-1">Instructors</p>
            <p className="text-3xl font-bold">{totalInstructors}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm mb-1">Students</p>
            <p className="text-3xl font-bold">{totalStudents}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm mb-1">Total Courses</p>
            <p className="text-3xl font-bold">{totalCourses}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/admin/users/new"
              className="bg-blue-600 text-white p-6 rounded-lg hover:bg-blue-700 text-center font-semibold"
            >
              + Create User
            </Link>
            <Link
              href="/admin/courses/new"
              className="bg-green-600 text-white p-6 rounded-lg hover:bg-green-700 text-center font-semibold"
            >
              + Create Course
            </Link>
            <Link
              href="/admin/blog/new"
              className="bg-orange-600 text-white p-6 rounded-lg hover:bg-orange-700 text-center font-semibold"
            >
              + Create Blog Post
            </Link>
            <Link
              href="/admin/blog"
              className="bg-purple-600 text-white p-6 rounded-lg hover:bg-purple-700 text-center font-semibold"
            >
              Manage Blog
            </Link>
          </div>
        </div>

        {/* Recent Users */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Recent Users</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.name || 'No name'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1">
                        {user.roles.map((ur) => (
                          <span
                            key={ur.roleId}
                            className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800"
                          >
                            {ur.role.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
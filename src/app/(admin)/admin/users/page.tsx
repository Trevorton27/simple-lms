import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import { db } from '@/lib/db';

export default async function AdminUsersPage() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect('/sign-in');
  }

  const user = await db.user.findFirst({
    where: {
      OR: [
        { id: clerkUser.id },
        { email: clerkUser.emailAddresses[0]?.emailAddress }
      ]
    },
    include: {
      roles: {
        include: { role: true },
      },
    },
  });

  if (!user) {
    redirect('/dashboard');
  }

  const isAdmin = user.roles.some((ur) => ur.role.name === 'ADMIN');
  if (!isAdmin) {
    redirect('/dashboard');
  }

  // Fetch all users with their roles
  const users = await db.user.findMany({
    include: {
      roles: {
        include: { role: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch all roles for the role update form
  const roles = await db.role.findMany({
    orderBy: { name: 'asc' },
  });

  async function updateUserRole(formData: FormData) {
    'use server';

    const userId = formData.get('userId') as string;
    const roleId = formData.get('roleId') as string;

    const clerkUser = await currentUser();

    if (!clerkUser) {
      throw new Error('Unauthorized');
    }

    const currentUserData = await db.user.findFirst({
      where: {
        OR: [
          { id: clerkUser.id },
          { email: clerkUser.emailAddresses[0]?.emailAddress }
        ]
      },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!currentUserData) {
      throw new Error('User not found');
    }

    const isAdmin = currentUserData.roles.some((ur) => ur.role.name === 'ADMIN');
    if (!isAdmin) {
      throw new Error('Forbidden: Admin access required');
    }

    if (!userId || !roleId) {
      throw new Error('User ID and Role ID are required');
    }

    // Remove existing roles
    await db.userRole.deleteMany({
      where: { userId },
    });

    // Assign new role
    await db.userRole.create({
      data: {
        userId,
        roleId,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorUserId: currentUserData.id,
        action: 'UPDATE',
        entity: 'User',
        entityId: userId,
        metadata: {
          action: 'role_updated',
          newRoleId: roleId,
          updatedBy: currentUserData.id,
        },
      },
    });

    redirect('/admin/users');
  }

  async function toggleUserStatus(formData: FormData) {
    'use server';

    const userId = formData.get('userId') as string;
    const currentStatus = formData.get('currentStatus') === 'true';

    const clerkUser = await currentUser();

    if (!clerkUser) {
      throw new Error('Unauthorized');
    }

    const currentUserData = await db.user.findFirst({
      where: {
        OR: [
          { id: clerkUser.id },
          { email: clerkUser.emailAddresses[0]?.emailAddress }
        ]
      },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!currentUserData) {
      throw new Error('User not found');
    }

    const isAdmin = currentUserData.roles.some((ur) => ur.role.name === 'ADMIN');
    if (!isAdmin) {
      throw new Error('Forbidden: Admin access required');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Toggle the active status
    await db.user.update({
      where: { id: userId },
      data: { isActive: !currentStatus },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorUserId: currentUserData.id,
        action: 'UPDATE',
        entity: 'User',
        entityId: userId,
        metadata: {
          action: 'status_toggled',
          newStatus: !currentStatus,
          updatedBy: currentUserData.id,
        },
      },
    });

    redirect('/admin/users');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              LMS Platform - User Management
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
              <Link href="/admin" className="text-gray-700 hover:text-blue-600">
                Admin
              </Link>
              <Link href="/admin/users" className="text-gray-700 hover:text-blue-600 font-semibold">
                Users
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">User Management</h1>
            <p className="text-gray-600">Manage users and their roles</p>
          </div>
          <Link
            href="/admin/users/new"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
          >
            + Create User
          </Link>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {users.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="mb-4">No users found.</p>
              <Link
                href="/admin/users/new"
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                Create your first user
              </Link>
            </div>
          ) : (
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
                    Current Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
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
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {u.avatarUrl && (
                          <img
                            src={u.avatarUrl}
                            alt={u.name || 'User'}
                            className="h-8 w-8 rounded-full mr-3"
                          />
                        )}
                        <div className="text-sm font-medium text-gray-900">
                          {u.name || 'No name'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{u.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1">
                        {u.roles.length > 0 ? (
                          u.roles.map((ur) => (
                            <span
                              key={ur.roleId}
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                ur.role.name === 'ADMIN'
                                  ? 'bg-purple-100 text-purple-800'
                                  : ur.role.name === 'INSTRUCTOR'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {ur.role.name}
                            </span>
                          ))
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            No Role
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          u.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-3">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </Link>

                        <form action={toggleUserStatus}>
                          <input type="hidden" name="userId" value={u.id} />
                          <input
                            type="hidden"
                            name="currentStatus"
                            value={u.isActive.toString()}
                          />
                          <button
                            type="submit"
                            className={`${
                              u.isActive
                                ? 'text-red-600 hover:text-red-900'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

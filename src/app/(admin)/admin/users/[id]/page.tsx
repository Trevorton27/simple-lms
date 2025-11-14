import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentUser, clerkClient } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import { db } from '@/lib/db';

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect('/sign-in');
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
    redirect('/dashboard');
  }

  const isAdmin = currentUserData.roles.some((ur) => ur.role.name === 'ADMIN');
  if (!isAdmin) {
    redirect('/dashboard');
  }

  // Fetch the user to edit
  const userId = params.id;
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: { role: true },
      },
      enrollments: {
        include: {
          course: true,
        },
      },
    },
  });

  if (!user) {
    redirect('/admin/users');
  }

  // Fetch all roles for the dropdown
  const roles = await db.role.findMany({
    orderBy: { name: 'asc' },
  });

  async function updateUser(formData: FormData) {
    'use server';

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

    const userId = formData.get('userId') as string;
    const name = formData.get('name') as string;
    const roleId = formData.get('roleId') as string;
    const isActive = formData.get('isActive') === 'on';

    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      // Update user in database
      await db.user.update({
        where: { id: userId },
        data: {
          name: name || null,
          isActive,
        },
      });

      // Update role if changed
      if (roleId) {
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

        // Get the role name to map to Clerk organization role
        const selectedRole = await db.role.findUnique({
          where: { id: roleId },
        });

        if (selectedRole) {
          // Map local roles to Clerk organization roles
          const roleMapping: Record<string, string> = {
            'ADMIN': 'org:admin',
            'INSTRUCTOR': 'org:instructor',
            'STUDENT': 'org:member',
          };

          const clerkOrgRole = roleMapping[selectedRole.name] || 'org:member';
          const orgId = process.env.CLERK_ORGANIZATION_ID;

          if (orgId) {
            try {
              const client = await clerkClient();

              // Get current organization memberships
              const memberships = await client.users.getOrganizationMembershipList({
                userId,
              });

              // Find membership in our org
              const orgMembership = memberships.data.find(
                (m: any) => m.organization.id === orgId
              );

              if (orgMembership) {
                // Update the role in the organization
                await client.organizations.updateOrganizationMembership({
                  organizationId: orgId,
                  userId,
                  role: clerkOrgRole,
                });
                console.log('Updated organization role to:', clerkOrgRole);
              } else {
                // User not in org, add them
                await client.organizations.createOrganizationMembership({
                  organizationId: orgId,
                  userId,
                  role: clerkOrgRole,
                });
                console.log('Added user to organization with role:', clerkOrgRole);
              }
            } catch (orgError: any) {
              console.error('Error updating organization membership:', orgError);
              // Don't fail the whole operation
            }
          }
        }
      }

      // Create audit log
      await db.auditLog.create({
        data: {
          actorUserId: currentUserData.id,
          action: 'UPDATE',
          entity: 'User',
          entityId: userId,
          metadata: {
            name,
            roleId,
            isActive,
            updatedBy: currentUserData.id,
          },
        },
      });

      console.log('User updated successfully');

      redirect(`/admin/users/${userId}`);
    } catch (error: any) {
      // Next.js redirect() throws a special error - don't catch it
      if (error?.digest?.startsWith('NEXT_REDIRECT')) {
        throw error;
      }

      console.error('Error updating user:', error);
      throw error;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              LMS Platform - User Details
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
        <div className="mb-6">
          <Link
            href="/admin/users"
            className="text-blue-600 hover:text-blue-800 font-semibold"
          >
            ← Back to Users
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* User Info Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col items-center">
                {user.avatarUrl && (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || 'User'}
                    className="h-24 w-24 rounded-full mb-4"
                  />
                )}
                <h2 className="text-2xl font-bold mb-1">{user.name || 'No name'}</h2>
                <p className="text-gray-600 mb-4">{user.email}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {user.roles.map((ur) => (
                    <span
                      key={ur.roleId}
                      className={`px-3 py-1 text-sm font-semibold rounded-full ${
                        ur.role.name === 'ADMIN'
                          ? 'bg-purple-100 text-purple-800'
                          : ur.role.name === 'INSTRUCTOR'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {ur.role.name}
                    </span>
                  ))}
                </div>
                <div className="w-full border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <span
                      className={`font-semibold ${
                        user.isActive ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Joined:</span>
                    <span className="font-semibold">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">User ID:</span>
                    <span className="font-mono text-xs">{user.id.substring(0, 12)}...</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enrollments */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">Course Enrollments</h3>
              {user.enrollments.length === 0 ? (
                <p className="text-gray-500 text-sm">No course enrollments</p>
              ) : (
                <ul className="space-y-2">
                  {user.enrollments.map((enrollment) => (
                    <li key={enrollment.id} className="text-sm">
                      <Link
                        href={`/courses/${enrollment.course.slug}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {enrollment.course.title}
                      </Link>
                      <span
                        className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                          enrollment.status === 'ENROLLED'
                            ? 'bg-green-100 text-green-800'
                            : enrollment.status === 'COMPLETED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {enrollment.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-6">Edit User</h2>

              <form action={updateUser} className="space-y-6">
                <input type="hidden" name="userId" value={user.id} />

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    defaultValue={user.name || ''}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={user.email || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Email cannot be changed here. Update via Clerk dashboard.
                  </p>
                </div>

                <div>
                  <label htmlFor="roleId" className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    id="roleId"
                    name="roleId"
                    defaultValue={user.roles[0]?.roleId || ''}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a role...</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    defaultChecked={user.isActive}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                    User is active
                  </label>
                </div>

                <div className="border-t pt-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-yellow-900 mb-2">Important Notes</h3>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• Changing the role will update both local database and Clerk organization</li>
                      <li>• Deactivating a user prevents them from signing in</li>
                      <li>• Email changes must be done through the Clerk dashboard</li>
                    </ul>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
                    >
                      Save Changes
                    </button>
                    <Link
                      href="/admin/users"
                      className="flex-1 text-center border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 font-semibold"
                    >
                      Cancel
                    </Link>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

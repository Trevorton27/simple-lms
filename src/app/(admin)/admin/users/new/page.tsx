import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentUser, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export default async function CreateUserPage() {
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

  // Get all roles for the dropdown
  const roles = await db.role.findMany({
    orderBy: { name: 'asc' },
  });

  async function createUser(formData: FormData) {
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

    const email = formData.get('email') as string;
    const username = formData.get('username') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const password = formData.get('password') as string;
    const roleId = formData.get('roleId') as string;
    const skipPasswordRequirement = formData.get('skipPasswordRequirement') === 'on';

    // Validate required fields
    if (!email || !firstName || !lastName) {
      throw new Error('Email, first name, and last name are required');
    }

    if (!skipPasswordRequirement && !password) {
      throw new Error('Password is required unless "Skip Password Requirement" is checked');
    }

    if (!roleId) {
      throw new Error('Role is required');
    }

    try {
      // Create user in Clerk
      const client = await clerkClient();

      // Build the params object conditionally
      const createUserParams: any = {
        emailAddress: [email],
        firstName,
        lastName,
      };

      // Add username if provided
      if (username) {
        createUserParams.username = username;
      }

      // Add password or skipPasswordRequirement based on checkbox
      if (skipPasswordRequirement) {
        createUserParams.skipPasswordRequirement = true;
      } else if (password) {
        createUserParams.password = password;
      }

      console.log('Creating user with params:', {
        ...createUserParams,
        password: createUserParams.password ? '[REDACTED]' : undefined,
      });

      const newClerkUser = await client.users.createUser(createUserParams);

      console.log('Clerk user created:', newClerkUser.id);

      // Get the role name to map to Clerk organization role
      const selectedRole = await db.role.findUnique({
        where: { id: roleId },
      });

      if (!selectedRole) {
        throw new Error('Selected role not found');
      }

      // Map local roles to Clerk organization roles
      const roleMapping: Record<string, string> = {
        'ADMIN': 'org:admin',
        'INSTRUCTOR': 'org:instructor',
        'STUDENT': 'org:member',
      };

      const clerkOrgRole = roleMapping[selectedRole.name] || 'org:member';

      // Add user to organization
      const orgId = process.env.CLERK_ORGANIZATION_ID;

      if (orgId) {
        console.log(`Adding user to organization ${orgId} with role ${clerkOrgRole}`);

        try {
          await client.organizations.createOrganizationMembership({
            organizationId: orgId,
            userId: newClerkUser.id,
            role: clerkOrgRole,
          });
          console.log('User added to organization successfully');
        } catch (orgError: any) {
          console.error('Error adding user to organization:', orgError);
          // Don't fail the whole operation if org membership fails
          // The user is still created, just not in the org
        }
      } else {
        console.warn('CLERK_ORGANIZATION_ID not set - user will not be added to organization');
      }

      // Wait a bit for webhook to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify user was created in our DB by webhook
      let dbUser = await db.user.findFirst({
        where: {
          OR: [
            { id: newClerkUser.id },
            { email }
          ]
        },
      });

      // If webhook hasn't processed yet, create the user manually
      if (!dbUser) {
        console.log('Webhook not processed yet, creating user manually');
        dbUser = await db.user.create({
          data: {
            id: newClerkUser.id,
            email,
            name: `${firstName} ${lastName}`.trim(),
            avatarUrl: newClerkUser.imageUrl || null,
            isActive: true,
          },
        });
      }

      // Assign role
      // First, remove any existing roles
      await db.userRole.deleteMany({
        where: { userId: dbUser.id },
      });

      // Then assign the new role
      await db.userRole.create({
        data: {
          userId: dbUser.id,
          roleId,
        },
      });

      // Create audit log
      await db.auditLog.create({
        data: {
          actorUserId: currentUserData.id,
          action: 'CREATE',
          entity: 'User',
          entityId: dbUser.id,
          metadata: {
            email,
            name: `${firstName} ${lastName}`,
            roleId,
            createdBy: 'admin',
          },
        },
      });

      console.log('User created successfully:', dbUser.id);

      redirect('/admin');
    } catch (error: any) {
      // Next.js redirect() throws a special error - don't catch it
      if (error?.digest?.startsWith('NEXT_REDIRECT')) {
        throw error;
      }

      console.error('Error creating user:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));

      // Clerk returns specific error messages
      if (error?.errors) {
        const errorMessages = error.errors.map((e: any) =>
          `${e.code || 'error'}: ${e.message} ${e.longMessage ? `(${e.longMessage})` : ''}`
        ).join('; ');
        throw new Error(`Clerk error: ${errorMessages}`);
      }

      if (error?.message) {
        throw new Error(`Error: ${error.message}`);
      }

      throw error;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/admin" className="text-2xl font-bold text-blue-600">
              LMS Admin
            </Link>
            <Link href="/admin" className="text-gray-700 hover:text-blue-600">
              ← Back to Admin
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Create New User</h1>
          <p className="text-gray-600 mb-8">
            Create a new user account and assign them a role
          </p>

          <form action={createUser} className="bg-white rounded-lg shadow p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="johndoe"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional. Must be unique across all users. Use lowercase letters, numbers, and underscores only.
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <input
                type="password"
                id="password"
                name="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter a secure password"
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 8 characters (or check "Skip Password Requirement" below)
              </p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="skipPasswordRequirement"
                name="skipPasswordRequirement"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="skipPasswordRequirement" className="ml-2 text-sm text-gray-700">
                Skip Password Requirement (user will set password via email invitation)
              </label>
            </div>

            <div>
              <label htmlFor="roleId" className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <select
                id="roleId"
                name="roleId"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a role...</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Determines user permissions in the system
              </p>
            </div>

            <div className="border-t pt-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-900 mb-2">About User Creation</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Users are created in Clerk (authentication provider)</li>
                  <li>• User data is automatically synced to the local database</li>
                  <li>• If "Skip Password Requirement" is checked, the user will receive an email to set their password</li>
                  <li>• Roles determine what actions users can perform in the system</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
                >
                  Create User
                </button>
                <Link
                  href="/admin"
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
  );
}

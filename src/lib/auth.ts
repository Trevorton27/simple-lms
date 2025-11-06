import { currentUser, auth } from '@clerk/nextjs/server';
import { db } from './db';
import { getUserRoles } from './rbac';

/**
 * Get the current authenticated user with their roles
 */
export async function getCurrentUser() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: clerkUser.id },
    include: {
      roles: {
        include: { role: true },
      },
    },
  });

  return user;
}

/**
 * Check if the current user has admin role (from Clerk org or database)
 */
export async function isAdmin(): Promise<boolean> {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return false;
  }

  // Check Clerk organization role first
  const { orgRole } = await auth();
  if (orgRole && (orgRole === 'org:admin' || orgRole === 'admin')) {
    return true;
  }

  // Fallback to database roles
  const roles = await getUserRoles(clerkUser.id);
  return roles.includes('ADMIN');
}

/**
 * Check if the current user has instructor role (from Clerk org or database)
 */
export async function isInstructor(): Promise<boolean> {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return false;
  }

  // Check Clerk organization role first
  const { orgRole } = await auth();
  if (orgRole && (orgRole === 'org:instructor' || orgRole === 'instructor')) {
    return true;
  }

  // Fallback to database roles
  const roles = await getUserRoles(clerkUser.id);
  return roles.includes('INSTRUCTOR');
}

/**
 * Require admin role or throw error
 */
export async function requireAdmin() {
  const admin = await isAdmin();

  if (!admin) {
    throw new Error('Unauthorized: Admin access required');
  }
}

/**
 * Require instructor role or throw error
 */
export async function requireInstructor() {
  const instructor = await isInstructor();

  if (!instructor) {
    throw new Error('Unauthorized: Instructor access required');
  }
}

/**
 * Require authentication
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

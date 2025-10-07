import { db } from './db';

export type Permission =
  | 'course:create'
  | 'course:update:own'
  | 'course:update:any'
  | 'course:delete:own'
  | 'course:delete:any'
  | 'course:publish:own'
  | 'course:view:all'
  | 'module:create'
  | 'module:update'
  | 'module:delete'
  | 'lesson:create'
  | 'lesson:update'
  | 'lesson:delete'
  | 'quiz:create'
  | 'quiz:update'
  | 'quiz:delete'
  | 'enrollment:read:self'
  | 'enrollment:read:course'
  | 'enrollment:manage'
  | 'progress:read:self'
  | 'progress:read:course'
  | 'progress:update:self'
  | 'schedule:create'
  | 'schedule:update'
  | 'schedule:delete'
  | 'schedule:view:enrolled'
  | 'schedule:view:public'
  | 'file:upload:instructor'
  | 'file:upload:student'
  | 'file:view:enrolled'
  | 'file:view:public'
  | 'audit:read'
  | 'user:manage';

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  ADMIN: [
    'course:create',
    'course:update:any',
    'course:delete:any',
    'course:publish:own',
    'course:view:all',
    'module:create',
    'module:update',
    'module:delete',
    'lesson:create',
    'lesson:update',
    'lesson:delete',
    'quiz:create',
    'quiz:update',
    'quiz:delete',
    'enrollment:read:self',
    'enrollment:read:course',
    'enrollment:manage',
    'progress:read:self',
    'progress:read:course',
    'progress:update:self',
    'schedule:create',
    'schedule:update',
    'schedule:delete',
    'schedule:view:enrolled',
    'schedule:view:public',
    'file:upload:instructor',
    'file:view:enrolled',
    'file:view:public',
    'audit:read',
    'user:manage',
  ],
  INSTRUCTOR: [
    'course:create',
    'course:update:own',
    'course:delete:own',
    'course:publish:own',
    'module:create',
    'module:update',
    'module:delete',
    'lesson:create',
    'lesson:update',
    'lesson:delete',
    'quiz:create',
    'quiz:update',
    'quiz:delete',
    'enrollment:read:self',
    'enrollment:read:course',
    'progress:read:self',
    'progress:read:course',
    'progress:update:self',
    'schedule:create',
    'schedule:update',
    'schedule:delete',
    'schedule:view:enrolled',
    'schedule:view:public',
    'file:upload:instructor',
    'file:view:enrolled',
    'file:view:public',
  ],
  STUDENT: [
    'enrollment:read:self',
    'progress:read:self',
    'progress:update:self',
    'schedule:view:enrolled',
    'schedule:view:public',
    'file:upload:student',
    'file:view:enrolled',
    'file:view:public',
  ],
};

export async function getUserRoles(userId: string): Promise<string[]> {
  const userRoles = await db.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  return userRoles.map((ur) => ur.role.name);
}

export async function hasPermission(
  userId: string,
  permission: Permission
): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
}

export async function requirePermission(
  userId: string,
  permission: Permission
): Promise<void> {
  const has = await hasPermission(userId, permission);
  if (!has) {
    throw new Error(`Forbidden: Missing permission ${permission}`);
  }
}

export async function canManageCourse(
  userId: string,
  courseId: string
): Promise<boolean> {
  const roles = await getUserRoles(userId);
  if (roles.includes('ADMIN')) return true;

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { ownerId: true },
  });

  return course?.ownerId === userId && roles.includes('INSTRUCTOR');
}

export async function requireCourseOwnership(
  userId: string,
  courseId: string
): Promise<void> {
  const can = await canManageCourse(userId, courseId);
  if (!can) {
    throw new Error('Forbidden: Not the course owner or admin');
  }
}

export async function isEnrolled(
  userId: string,
  courseId: string
): Promise<boolean> {
  const enrollment = await db.enrollment.findUnique({
    where: {
      userId_courseId: { userId, courseId },
      status: 'ENROLLED',
    },
  });
  return !!enrollment;
}

export async function requireEnrollment(
  userId: string,
  courseId: string
): Promise<void> {
  const enrolled = await isEnrolled(userId, courseId);
  if (!enrolled) {
    throw new Error('Forbidden: Not enrolled in this course');
  }
}

export async function canViewLesson(
  userId: string | null,
  lessonId: string
): Promise<boolean> {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: { course: true },
      },
    },
  });

  if (!lesson) return false;

  // Free preview
  if (lesson.isFreePreview) return true;

  // Must be authenticated
  if (!userId) return false;

  // Check enrollment
  return isEnrolled(userId, lesson.module.course.id);
}
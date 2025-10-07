import { auth } from '@clerk/nextjs/server';
import { db } from './db';

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  let user = await db.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: { role: true },
      },
    },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        id: userId,
        email: '',
        isActive: true,
      },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    const studentRole = await db.role.findUnique({
      where: { name: 'STUDENT' },
    });

    if (studentRole) {
      await db.userRole.create({
        data: {
          userId: user.id,
          roleId: studentRole.id,
        },
      });
    }
  }

  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

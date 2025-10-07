import { db } from './db';

export async function getCurrentUser() {
  // For demo purposes, return first user or create one
  let user = await db.user.findFirst({
    include: {
      roles: {
        include: { role: true },
      },
    },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        id: 'demo-user',
        email: 'demo@example.com',
        name: 'Demo User',
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

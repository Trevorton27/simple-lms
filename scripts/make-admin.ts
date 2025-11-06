import { db } from '../src/lib/db';

async function makeAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: npm run make-admin <email>');
    process.exit(1);
  }

  try {
    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    // Check if ADMIN role exists, create if not
    let adminRole = await db.role.findUnique({
      where: { name: 'ADMIN' },
    });

    if (!adminRole) {
      console.log('Creating ADMIN role...');
      adminRole = await db.role.create({
        data: { name: 'ADMIN' },
      });
    }

    // Check if user already has admin role
    const hasAdminRole = user.roles.some((ur) => ur.role.name === 'ADMIN');

    if (hasAdminRole) {
      console.log(`User ${email} already has ADMIN role`);
      process.exit(0);
    }

    // Assign admin role to user
    await db.userRole.create({
      data: {
        userId: user.id,
        roleId: adminRole.id,
      },
    });

    console.log(`✅ Successfully assigned ADMIN role to ${email}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

makeAdmin();

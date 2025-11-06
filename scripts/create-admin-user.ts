import { db } from '../src/lib/db';

async function createAdminUser() {
  const userId = process.argv[2];
  const email = process.argv[3];
  const name = process.argv[4];

  if (!userId || !email) {
    console.error('Usage: npm run create-admin-user <clerk-user-id> <email> [name]');
    console.error('Example: npm run create-admin-user user_123abc john@example.com "John Doe"');
    process.exit(1);
  }

  try {
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { id: userId },
    });

    let user;
    if (existingUser) {
      console.log(`✅ User ${email} already exists in database`);
      user = existingUser;
    } else {
      // Create user
      console.log(`Creating user ${email}...`);
      user = await db.user.create({
        data: {
          id: userId,
          email: email,
          name: name || null,
          isActive: true,
        },
      });
      console.log('✅ User created successfully');
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
    const existingUserRole = await db.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: adminRole.id,
        },
      },
    });

    if (existingUserRole) {
      console.log(`✅ User ${email} already has ADMIN role`);
    } else {
      // Assign admin role to user
      await db.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
        },
      });
      console.log(`✅ Successfully assigned ADMIN role to ${email}`);
    }

    console.log('\n🎉 Setup complete! You can now access /admin');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

createAdminUser();

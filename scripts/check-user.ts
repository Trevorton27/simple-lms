import { db } from '../src/lib/db';

async function checkUser() {
  const email = process.argv[2];

  if (!email) {
    console.log('Checking all users...\n');

    const users = await db.user.findMany({
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (users.length === 0) {
      console.log('❌ No users found in database.');
      console.log('\nYou need to:');
      console.log('1. Sign in to the app first (this creates your user record)');
      console.log('2. Then run: npm run make-admin your-email@example.com');
    } else {
      console.log(`Found ${users.length} user(s):\n`);
      users.forEach((user) => {
        console.log(`Email: ${user.email}`);
        console.log(`ID: ${user.id}`);
        console.log(`Name: ${user.name || 'Not set'}`);
        console.log(`Roles: ${user.roles.map((ur) => ur.role.name).join(', ') || 'None'}`);
        console.log('---');
      });
    }
  } else {
    const user = await db.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      console.log(`❌ User with email ${email} not found.`);
      console.log('\nMake sure you have signed in to the app first.');
    } else {
      console.log('✅ User found:\n');
      console.log(`Email: ${user.email}`);
      console.log(`ID: ${user.id}`);
      console.log(`Name: ${user.name || 'Not set'}`);
      console.log(`Roles: ${user.roles.map((ur) => ur.role.name).join(', ') || 'None'}`);

      if (user.roles.length === 0) {
        console.log('\n⚠️  This user has NO roles assigned!');
        console.log(`Run: npm run make-admin ${email}`);
      }
    }
  }

  await db.$disconnect();
}

checkUser();

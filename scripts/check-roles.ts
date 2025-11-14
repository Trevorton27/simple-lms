import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking roles in database...\n');

  const roles = await prisma.role.findMany({
    orderBy: { name: 'asc' },
  });

  console.log('Current roles:');
  if (roles.length === 0) {
    console.log('  (none found)');
  } else {
    roles.forEach(role => {
      console.log(`  - ${role.name} (ID: ${role.id})`);
    });
  }

  console.log('\nEnsuring all required roles exist...');

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN' },
  });
  console.log('✓ ADMIN role ready');

  const instructorRole = await prisma.role.upsert({
    where: { name: 'INSTRUCTOR' },
    update: {},
    create: { name: 'INSTRUCTOR' },
  });
  console.log('✓ INSTRUCTOR role ready');

  const studentRole = await prisma.role.upsert({
    where: { name: 'STUDENT' },
    update: {},
    create: { name: 'STUDENT' },
  });
  console.log('✓ STUDENT role ready');

  console.log('\nFinal role count:');
  const finalRoles = await prisma.role.findMany({
    orderBy: { name: 'asc' },
  });
  finalRoles.forEach(role => {
    console.log(`  - ${role.name} (ID: ${role.id})`);
  });
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

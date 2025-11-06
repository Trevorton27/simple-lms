// Node-only Prisma client (no Neon adapter)
// Works with Vercel Postgres when DATABASE_URL is set.

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// Handle disconnection on process exit
if (process.env.NODE_ENV === 'development') {
  process.on('beforeExit', async () => {
    await db.$disconnect();
  });
}

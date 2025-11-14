// Prisma client for Neon serverless database
// Optimized for connection pooling with Neon

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Reduce logging to only show errors, not connection warnings
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// Don't disconnect in development - let Next.js handle it
// Disconnecting prematurely causes "Server has closed the connection" errors with server actions

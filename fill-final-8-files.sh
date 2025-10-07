#!/bin/bash

echo "📝 Filling the final 8 empty files..."
echo ""

# 1. .gitignore
cat > .gitignore << 'EOF'
/node_modules
/.pnp
.pnp.js
/coverage
/playwright-report
/test-results
/.next/
/out/
/build
.DS_Store
*.pem
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.env
.env*.local
.vercel
*.tsbuildinfo
next-env.d.ts
EOF
echo "✓ 1/8 .gitignore"

# 2. next.config.js
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: '**.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};

module.exports = nextConfig;
EOF
echo "✓ 2/8 next.config.js"

# 3. tailwind.config.ts
cat > tailwind.config.ts << 'EOF'
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
      },
    },
  },
  plugins: [],
}
export default config
EOF
echo "✓ 3/8 tailwind.config.ts"

# 4. .github/workflows/ci.yml
cat > .github/workflows/ci.yml << 'EOF'
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  DATABASE_URL: postgresql://test:test@localhost:5432/test_db

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma Client
        run: npm run prisma:generate
      
      - name: Run ESLint
        run: npm run lint
      
      - name: TypeScript check
        run: npx tsc --noEmit

  build:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma Client
        run: npm run prisma:generate
      
      - name: Run migrations
        run: npm run prisma:migrate:deploy
      
      - name: Build application
        run: npm run build
EOF
echo "✓ 4/8 .github/workflows/ci.yml"

# 5. src/lib/db.ts
cat > src/lib/db.ts << 'EOF'
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
EOF
echo "✓ 5/8 src/lib/db.ts"

# 6. src/lib/auth.ts
cat > src/lib/auth.ts << 'EOF'
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
EOF
echo "✓ 6/8 src/lib/auth.ts"

echo ""
echo "✓ Filled 6 small files!"
echo ""
echo "⚠️  2 large documentation files still need content:"
echo "   - README.md (copy from simple_readme artifact)"
echo "   - SETUP-CHECKLIST.md (copy from simple_checklist artifact)"
echo ""
echo "These are too large for bash heredoc."
echo "Find the artifacts 'simple_readme' and 'simple_checklist' in the conversation."
echo ""
echo "Run ./verify-artifacts.sh again to confirm!"
EOF

chmod +x fill-final-8-files.sh

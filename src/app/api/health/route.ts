// src/app/api/health/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
export const runtime = 'nodejs'
const prisma = new PrismaClient()
export async function GET() {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'`
  return NextResponse.json({ tables })
}

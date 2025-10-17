/**
 * @design_doc   Database connection and Prisma client setup
 * @related_to   Prisma ORM, database operations
 * @known_issues None currently
 */

import { PrismaClient } from '@prisma/client'
import { env } from '@/lib/config/env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  })

if (!env.isProduction) globalForPrisma.prisma = db

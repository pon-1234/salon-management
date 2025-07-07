/**
 * @design_doc   Database client configuration for Prisma
 * @related_to   PrismaClient, all repository implementations
 * @known_issues None currently
 */
import { PrismaClient } from './generated/prisma'

declare global {
  var prisma: PrismaClient | undefined
}

export const db = globalThis.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = db
}

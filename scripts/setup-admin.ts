/**
 * @design_doc   docs/VPS_DEPLOYMENT.md
 * @related_to   lib/admin/bootstrap.ts - Validates and atomically reconciles administrator access
 * @known_issues None
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { pathToFileURL } from 'node:url'
import { bootstrapAdmin, parseAdminBootstrapConfig } from '../lib/admin/bootstrap'

const HASH_ROUNDS = 12

async function main(): Promise<void> {
  let database: PrismaClient | undefined

  try {
    const config = parseAdminBootstrapConfig(process.argv.slice(2), process.env)
    database = new PrismaClient()

    const result = await bootstrapAdmin({
      database,
      config,
      hashPassword: (password) => bcrypt.hash(password, HASH_ROUNDS),
      verifyPassword: (password, hash) => bcrypt.compare(password, hash),
    })

    console.log(
      `Admin bootstrap ${result.status}: email=${result.email} role=${result.role} stores=${result.storeIds.join(',') || '(global)'}`
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown bootstrap failure'
    console.error(`Admin bootstrap failed: ${message}`)
    process.exitCode = 1
  } finally {
    await database?.$disconnect()
  }
}

const executedPath = process.argv[1]
if (executedPath && import.meta.url === pathToFileURL(executedPath).href) {
  void main()
}

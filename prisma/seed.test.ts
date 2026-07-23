/**
 * @design_doc   docs/VPS_DEPLOYMENT.md
 * @related_to   prisma/seed.ts provisions store-scoped development data
 * @known_issues None
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

const seedSource = readFileSync(join(process.cwd(), 'prisma', 'seed.ts'), 'utf8')
const fullSeedSource = readFileSync(join(process.cwd(), 'prisma', 'seed-full.ts'), 'utf8')

function sourceBetween(start: string, end: string): string {
  const startIndex = seedSource.indexOf(start)
  const endIndex = seedSource.indexOf(end, startIndex)

  expect(startIndex).toBeGreaterThanOrEqual(0)
  expect(endIndex).toBeGreaterThan(startIndex)

  return seedSource.slice(startIndex, endIndex)
}

describe('Prisma seed store scoping', () => {
  it('keeps the seed under TypeScript validation', () => {
    expect(seedSource).not.toContain('@ts-nocheck')
    expect(fullSeedSource).not.toContain('@ts-nocheck')
  })

  it('creates the default store before any store-scoped records', () => {
    const storeIndex = seedSource.indexOf('await prisma.store.upsert')
    const castIndex = seedSource.indexOf('await prisma.cast.upsert')

    expect(storeIndex).toBeGreaterThanOrEqual(0)
    expect(storeIndex).toBeLessThan(castIndex)
  })

  it('fails closed in production before the first Prisma write', () => {
    const guardIndex = seedSource.indexOf('if (env.isProduction)')
    const firstWriteIndex = seedSource.indexOf('await prisma.store.upsert')

    expect(guardIndex).toBeGreaterThanOrEqual(0)
    expect(guardIndex).toBeLessThan(firstWriteIndex)
  })

  it('requires an explicit development or test environment before creating a database client', () => {
    const guardIndex = seedSource.indexOf("assertDevelopmentDatabaseMutation('standard seed')")
    const clientIndex = seedSource.indexOf('new PrismaClient()')

    expect(guardIndex).toBeGreaterThanOrEqual(0)
    expect(guardIndex).toBeLessThan(clientIndex)
  })

  it('assigns seeded non-super-admin accounts to the default store', () => {
    const assignmentBlock = sourceBetween(
      '[manager.id, staff.id].map',
      'Created default store assignments'
    )

    expect(assignmentBlock).toContain('prisma.adminStoreAssignment.upsert')
    expect(assignmentBlock).toContain('storeId: DEFAULT_STORE_ID')
    expect(assignmentBlock).toContain('manager.id')
    expect(assignmentBlock).toContain('staff.id')
  })

  it.each([
    ['cast', 'await prisma.cast.upsert', 'Created/Updated cast'],
    ['course', 'prisma.coursePrice.upsert', 'Upserted ${courseRecords.length}'],
    ['option', 'prisma.optionPrice.upsert', 'Upserted ${optionRecords.length}'],
    ['designation fee', 'prisma.designationFee.upsert', 'Upserted ${designationRecords.length}'],
    ['reservation', 'await prisma.reservation.upsert', 'Created/Updated reservation'],
  ])('assigns the default store on %s create and update', (_label, start, end) => {
    const scopedBlock = sourceBetween(start, end)

    expect(scopedBlock.match(/storeId:\s*DEFAULT_STORE_ID/g)).toHaveLength(2)
  })
})

/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md Prisma preview persistence adapter
 * @related_to   preview-prisma-adapter.ts binds the guarded port to PostgreSQL and bcrypt
 * @known_issues Tests use a strict Prisma boundary fake; a real preview DB rehearsal is operational
 */
import { compare } from 'bcryptjs'
import { describe, expect, it, vi } from 'vitest'

vi.unmock('bcryptjs')

import {
  BcryptLegacyPreviewDisabledCredentialFactory,
  createPrismaLegacyPreviewPersistence,
} from './preview-prisma-adapter'
import {
  isLegacyPreviewDisabledCredential,
  type LegacyPreviewRunProvenance,
} from './preview-persistence'

describe('BcryptLegacyPreviewDisabledCredentialFactory', () => {
  it('creates independently salted, bcrypt-backed values that the login verifier cannot accept', async () => {
    const factory = new BcryptLegacyPreviewDisabledCredentialFactory(4)

    const first = await factory.createDisabledCredential()
    const second = await factory.createDisabledCredential()

    expect(isLegacyPreviewDisabledCredential(first)).toBe(true)
    expect(isLegacyPreviewDisabledCredential(second)).toBe(true)
    expect(second).not.toBe(first)
    expect(await compare('known-password', first)).toBe(false)
  })
})

describe('createPrismaLegacyPreviewPersistence', () => {
  it('opens exactly one Serializable Prisma transaction', async () => {
    const transaction = {}
    const calls: unknown[][] = []
    const client = {
      $transaction: async (
        operation: (value: object) => Promise<string>,
        options: object
      ): Promise<string> => {
        calls.push([options])
        return operation(transaction)
      },
    }
    const persistence = createPrismaLegacyPreviewPersistence(
      client as unknown as Parameters<typeof createPrismaLegacyPreviewPersistence>[0]
    )

    const result = await persistence.withSerializableTransaction(async () => 'committed')

    expect(result).toBe('committed')
    expect(calls).toEqual([
      [
        {
          isolationLevel: 'Serializable',
          maxWait: 60_000,
          timeout: 1_800_000,
        },
      ],
    ])
  })

  it('locks the source and reads only the approved database-side identity settings', async () => {
    const queries: unknown[] = []
    const executions: unknown[] = []
    const transaction = {
      $queryRaw: async (query: unknown) => {
        queries.push(query)
        return [
          {
            databaseName: 'salon_qa_preview',
            environment: 'staging-preview',
            marker: '01JZ8QFQ05J6JNRQY3YW7M0V55',
          },
        ]
      },
      $executeRaw: async (query: unknown) => {
        executions.push(query)
        return 1
      },
    }
    const client = {
      $transaction: async (operation: (value: object) => Promise<unknown>) =>
        operation(transaction),
    }
    const persistence = createPrismaLegacyPreviewPersistence(
      client as unknown as Parameters<typeof createPrismaLegacyPreviewPersistence>[0]
    )

    const identity = await persistence.withSerializableTransaction(async (port) => {
      await port.acquireSourceLock('gold-main')
      return port.readTargetIdentity()
    })

    expect(identity).toEqual({
      databaseName: 'salon_qa_preview',
      environment: 'staging-preview',
      marker: '01JZ8QFQ05J6JNRQY3YW7M0V55',
    })
    expect(executions.map(sqlText)).toEqual([expect.stringContaining('pg_advisory_xact_lock')])
    expect(queries.map(sqlText)).toEqual([
      expect.stringContaining("current_setting('salon.environment', true)"),
    ])
    expect(queries.map(sqlText).join('\n')).toContain("current_setting('salon.target_id', true)")
    expect(queries.map(sqlText).join('\n')).not.toContain('app.environment')
  })

  it('creates and reads the immutable run provenance ledger', async () => {
    const provenance: LegacyPreviewRunProvenance = {
      sourceKey: 'gold-main',
      targetId: '01JZ8QFQ05J6JNRQY3YW7M0V55',
      cutoffAt: '2025-07-11T00:00:00.000Z',
      migrationManifestSha256: 'a'.repeat(64),
      canonicalExportSha256: 'b'.repeat(64),
      snapshotManifestSha256: 'c'.repeat(64),
      extractorVersion: 'extractor-v1',
      transformationPolicyVersion: 'policy-v1',
      canonicalDigest: 'd'.repeat(64),
      migrationVersion: 1,
    }
    const findUnique = vi.fn(async () => ({
      ...provenance,
      cutoffAt: new Date(provenance.cutoffAt),
      createdAt: new Date('2026-07-20T03:00:00.000Z'),
    }))
    const create = vi.fn(async () => undefined)
    const transaction = {
      legacyMigrationRun: { findUnique, create },
    }
    const client = {
      $transaction: async (operation: (value: object) => Promise<unknown>) =>
        operation(transaction),
    }
    const persistence = createPrismaLegacyPreviewPersistence(
      client as unknown as Parameters<typeof createPrismaLegacyPreviewPersistence>[0]
    )

    const stored = await persistence.withSerializableTransaction(async (port) => {
      const existing = await port.readRun(provenance.sourceKey)
      await port.createRun(provenance)
      return existing
    })

    expect(stored).toEqual({
      ...provenance,
      createdAt: '2026-07-20T03:00:00.000Z',
    })
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sourceKey: provenance.sourceKey } })
    )
    expect(create).toHaveBeenCalledWith({
      data: {
        ...provenance,
        cutoffAt: new Date(provenance.cutoffAt),
      },
    })
  })

  it('reads the exact store identity fields and whole preview database aggregate counts', async () => {
    const storeFindUnique = vi.fn(async () => ({
      id: 'gold',
      slug: 'gold',
      timezone: 'Asia/Tokyo',
      name: 'Gold',
      displayName: 'Gold Salon',
      phone: '+81312345678',
      email: 'store@example.com',
      address: 'Tokyo',
      isActive: true,
    }))
    const count = (value: number) => vi.fn(async () => value)
    const transaction = {
      store: { findUnique: storeFindUnique, count: count(2) },
      coursePrice: { count: count(3) },
      cast: { count: count(4) },
      customer: { count: count(5) },
      castSchedule: { count: count(6) },
      reservation: { count: count(7) },
      customerPointHistory: { count: count(8) },
      legacyMigrationMapping: { count: count(9) },
      legacyMigrationRun: { count: count(1) },
    }
    const client = {
      $transaction: async (operation: (value: object) => Promise<unknown>) =>
        operation(transaction),
    }
    const persistence = createPrismaLegacyPreviewPersistence(
      client as unknown as Parameters<typeof createPrismaLegacyPreviewPersistence>[0]
    )

    const result = await persistence.withSerializableTransaction(async (port) => ({
      store: await port.readStore('gold'),
      counts: await port.readAggregateCounts(),
    }))

    expect(result).toEqual({
      store: {
        id: 'gold',
        slug: 'gold',
        timezone: 'Asia/Tokyo',
        name: 'Gold',
        displayName: 'Gold Salon',
        phone: '+81312345678',
        email: 'store@example.com',
        address: 'Tokyo',
        isActive: true,
      },
      counts: {
        stores: 2,
        courses: 3,
        casts: 4,
        customers: 5,
        castSchedules: 6,
        reservations: 7,
        pointHistories: 8,
        mappings: 9,
        runs: 1,
      },
    })
    expect(storeFindUnique).toHaveBeenCalledWith({
      where: { id: 'gold' },
      select: {
        id: true,
        slug: true,
        timezone: true,
        name: true,
        displayName: true,
        phone: true,
        email: true,
        address: true,
        isActive: true,
      },
    })
    for (const model of Object.values(transaction)) {
      if ('count' in model) expect(model.count).toHaveBeenCalledWith()
    }
  })
})

function sqlText(value: unknown): string {
  if (!value || typeof value !== 'object' || !('strings' in value)) return ''
  const strings = (value as { strings?: unknown }).strings
  return Array.isArray(strings) && strings.every((entry) => typeof entry === 'string')
    ? strings.join('?')
    : ''
}

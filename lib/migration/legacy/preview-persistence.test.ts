/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md disposable preview persistence contract
 * @related_to   preview-persistence.ts persists prepared snapshots behind a guarded transaction port
 * @known_issues Integration against a provisioned PostgreSQL preview database is an operations step
 */
import { describe, expect, it, vi } from 'vitest'

import { LEGACY_PREVIEW_ACKNOWLEDGEMENT } from './preview-safety'
import {
  createLegacyPreviewTargetId,
  persistLegacyPreviewImport,
  type LegacyPreviewAggregateCounts,
  type LegacyPreviewDisabledCredentialFactory,
  type LegacyPreviewMapping,
  type LegacyPreviewPersistencePort,
  type LegacyPreviewRunProvenance,
  type LegacyPreviewStoreProjection,
  type LegacyPreviewStoredRun,
  type LegacyPreviewTargetIdentity,
  type LegacyPreviewTargetRow,
  type LegacyPreviewTransactionPort,
} from './preview-persistence'
import {
  calculateLegacyPreviewPreparedDigest,
  calculateLegacyPreviewRecordSha256,
  type LegacyPreviewPreparedDigestInput,
  type PreparedLegacyPreviewImport,
} from './preview-prepare'

describe('createLegacyPreviewTargetId', () => {
  it('is deterministic and domain-separates source keys, entities, and legacy IDs', () => {
    const first = createLegacyPreviewTargetId('gold-main', 'customers', 'member:9')

    expect(first).toMatch(/^lpv_[a-f0-9]{32}$/u)
    expect(createLegacyPreviewTargetId('gold-main', 'customers', 'member:9')).toBe(first)
    expect(createLegacyPreviewTargetId('other', 'customers', 'member:9')).not.toBe(first)
    expect(createLegacyPreviewTargetId('gold-main', 'casts', 'member:9')).not.toBe(first)
    expect(createLegacyPreviewTargetId('gold-main', 'customers', 'member:10')).not.toBe(first)
  })
})

const marker = '01JZ8QFQ05J6JNRQY3YW7M0V55'
const safeControls = {
  runtimeMode: 'preview',
  outboundDeliveryMode: 'disabled',
  databaseUrl: 'postgresql://preview:secret@db:5432/salon_qa_preview?schema=public',
  expectedDatabaseName: 'salon_qa_preview',
  configuredMarker: marker,
  confirmedMarker: marker,
  acknowledgement: LEGACY_PREVIEW_ACKNOWLEDGEMENT,
} as const

const disabledPassword = `!legacy-preview-disabled!$2b$12$${'a'.repeat(53)}`

const credentialFactory: LegacyPreviewDisabledCredentialFactory = {
  createDisabledCredential: vi.fn(async () => disabledPassword),
}

function preparedImport(): PreparedLegacyPreviewImport {
  const sourceKey = 'gold-main'
  const source = <Entity extends Parameters<typeof sourceReference>[1]>(
    entity: Entity,
    physicalTable: string,
    legacyId: string
  ) => sourceReference(sourceKey, entity, physicalTable, legacyId)
  const storeSource = source('stores', 'shop_gold.shops', 'shop_gold.shops:gold')
  const courseSource = source('courses', 'shop_gold.charge_info', 'shop_gold.charge_info:course-1')
  const castSource = source('casts', 'shop_gold.girls', 'shop_gold.girls:cast-7')
  const customerSource = source(
    'customers',
    'member_primary.member',
    'member_primary.member:customer-9'
  )
  const reservationSource = source(
    'reservations',
    'shop_gold.orders_2025',
    'shop_gold.orders_2025:reservation-3'
  )

  const records = {
    stores: [
      hashed({
        source: storeSource,
        targetStoreId: 'gold',
        targetStoreSlug: 'gold',
        targetStoreTimezone: 'Asia/Tokyo' as const,
        name: 'Gold',
        displayName: 'Gold Salon',
        phone: '0312345678',
        email: 'store@example.com',
        address: 'Tokyo',
        isActive: true,
        createdAt: '2024-01-02T03:34:56.000Z',
      }),
    ],
    courses: [
      hashed({
        source: courseSource,
        store: storeSource,
        targetStoreId: 'gold',
        name: 'Standard 90',
        duration: 90,
        price: 18_000,
        storeShare: 9_000,
        castShare: 9_000,
        description: 'Standard course',
        isActive: true,
        enableWebBooking: true,
        archivedAt: null,
      }),
    ],
    casts: [
      hashed({
        source: castSource,
        store: storeSource,
        targetStoreId: 'gold',
        name: 'Alice',
        age: 24,
        height: 160,
        bust: 'C',
        waist: 58,
        hip: 84,
        type: 'standard',
        image: '/staging-images/alice.jpg',
        images: ['/staging-images/alice.jpg'],
        description: 'Profile',
        panelDesignationRank: 0,
        regularDesignationRank: 0,
        netReservation: true,
        workStatus: 'active' as const,
        createdAt: '2024-01-02T03:34:56.000Z',
      }),
    ],
    customers: [
      hashed({
        source: customerSource,
        name: 'Bob',
        nameKana: 'ボブ',
        phone: '09012345678',
        email: 'user@example.com',
        birthDate: '1990-02-03',
        memberType: 'regular',
        points: 100,
        smsEnabled: false,
        emailNotificationEnabled: true,
        credentialStrategy: 'reset-required' as const,
        persistenceDisposition: 'ready' as const,
        createdAt: '2024-01-02T03:34:56.000Z',
      }),
    ],
    reservations: [
      hashed({
        source: reservationSource,
        store: storeSource,
        targetStoreId: 'gold',
        customer: customerSource,
        cast: castSource,
        course: courseSource,
        startTime: '2025-07-10T03:00:00.000Z',
        endTime: '2025-07-10T04:30:00.000Z',
        status: 'confirmed' as const,
        price: 18_000,
        pointsUsed: 100,
        notes: null,
        createdAt: '2025-07-01T00:30:00.000Z',
      }),
    ],
    castSchedules: [
      hashed({
        source: source('castSchedules', 'shop_gold.yotei_2025', 'shop_gold.yotei_2025:schedule-4'),
        cast: castSource,
        date: '2025-07-09T15:00:00.000Z',
        startTime: '2025-07-10T01:00:00.000Z',
        endTime: '2025-07-10T11:00:00.000Z',
        isAvailable: true,
      }),
    ],
    pointHistories: [
      hashed({
        source: source(
          'pointHistories',
          'member_primary.member_point_2025',
          'member_primary.member_point_2025:point-8'
        ),
        customer: customerSource,
        reservation: reservationSource,
        type: 'earned' as const,
        amount: 100,
        description: 'Imported points',
        balance: 100,
        sourceOrder: 8,
        expiresAt: '2026-07-10T14:59:59.000Z',
        isExpired: false,
        createdAt: '2025-07-10T04:30:00.000Z',
      }),
    ],
  }

  const reconciliation = Object.fromEntries(
    Object.entries(records).map(([entity, entityRecords]) => [
      entity,
      { input: entityRecords.length, accepted: entityRecords.length, rejected: 0 },
    ])
  ) as PreparedLegacyPreviewImport['reconciliation']
  const preparedWithoutDigest: LegacyPreviewPreparedDigestInput = {
    version: 1,
    sourceKey,
    cutoffAt: '2025-07-11T00:00:00.000Z',
    migrationManifestSha256: 'a'.repeat(64),
    canonicalExportSha256: 'b'.repeat(64),
    snapshotManifestSha256: 'd'.repeat(64),
    extractorVersion: 'gambit-canonical-v1',
    transformationPolicyVersion: 'legacy-preview-policy-v1',
    approvedSourceTables: [
      'member_primary.member',
      'member_primary.member_point_2025',
      'shop_gold.charge_info',
      'shop_gold.girls',
      'shop_gold.orders_2025',
      'shop_gold.shops',
      'shop_gold.yotei_2025',
    ],
    reconciliation,
    records,
  }
  return {
    ...preparedWithoutDigest,
    canonicalDigest: calculateLegacyPreviewPreparedDigest(preparedWithoutDigest),
  }
}

function sourceReference<
  Entity extends
    | 'stores'
    | 'courses'
    | 'casts'
    | 'customers'
    | 'reservations'
    | 'castSchedules'
    | 'pointHistories',
>(sourceKey: string, entity: Entity, physicalTable: string, legacyId: string) {
  return { sourceKey, entity, physicalTable, legacyId }
}

function hashed<RecordType extends { source: { entity: Parameters<typeof sourceReference>[1] } }>(
  record: RecordType
): { record: RecordType; sourceHash: string } {
  return {
    record,
    sourceHash: calculateLegacyPreviewRecordSha256(record.source.entity, record),
  }
}

function storedRunFor(
  prepared: PreparedLegacyPreviewImport,
  targetId: string = marker
): LegacyPreviewStoredRun {
  return {
    sourceKey: prepared.sourceKey,
    targetId,
    cutoffAt: prepared.cutoffAt,
    migrationManifestSha256: prepared.migrationManifestSha256,
    canonicalExportSha256: prepared.canonicalExportSha256,
    snapshotManifestSha256: prepared.snapshotManifestSha256,
    extractorVersion: prepared.extractorVersion,
    transformationPolicyVersion: prepared.transformationPolicyVersion,
    canonicalDigest: prepared.canonicalDigest,
    migrationVersion: 1,
    createdAt: '2026-07-20T03:00:00.000Z',
  }
}

class InMemoryPreviewPort implements LegacyPreviewPersistencePort, LegacyPreviewTransactionPort {
  readonly events: string[] = []
  readonly stores = new Map<string, LegacyPreviewStoreProjection>()
  readonly targets = new Map<
    string,
    { projection: LegacyPreviewTargetRow; customerCredential: string | null }
  >()
  mappings: LegacyPreviewMapping[] = []
  run: LegacyPreviewStoredRun | null = null
  identity: LegacyPreviewTargetIdentity = {
    databaseName: 'salon_qa_preview',
    environment: 'staging-preview',
    marker,
  }
  conflictEntity: LegacyPreviewTargetRow['entity'] | null = null
  failCreateEntity: LegacyPreviewTargetRow['entity'] | null = null
  driftCreatedEntity: LegacyPreviewTargetRow['entity'] | null = null
  hideCreatedEntity: LegacyPreviewTargetRow['entity'] | null = null
  dropCreatedMappingEntity: LegacyPreviewMapping['legacyEntity'] | null = null
  hideCreatedRun = false
  driftCreatedRun = false
  aggregateCountOverrides: Partial<LegacyPreviewAggregateCounts> = {}
  postWriteAggregateDrift: keyof LegacyPreviewAggregateCounts | null = null

  constructor() {
    this.stores.set('gold', {
      id: 'gold',
      slug: 'gold',
      timezone: 'Asia/Tokyo',
      name: 'Gold',
      displayName: 'Gold Salon',
      phone: '0312345678',
      email: 'store@example.com',
      address: 'Tokyo',
      isActive: true,
    })
  }

  async withSerializableTransaction<Result>(
    operation: (transaction: LegacyPreviewTransactionPort) => Promise<Result>
  ): Promise<Result> {
    this.events.push('transaction:Serializable')
    const targetSnapshot = new Map(this.targets)
    const mappingSnapshot = structuredClone(this.mappings)
    const runSnapshot = structuredClone(this.run)
    try {
      const result = await operation(this)
      this.events.push('transaction:commit')
      return result
    } catch (error) {
      this.targets.clear()
      targetSnapshot.forEach((value, key) => this.targets.set(key, value))
      this.mappings = mappingSnapshot
      this.run = runSnapshot
      this.events.push('transaction:rollback')
      throw error
    }
  }

  async acquireSourceLock(sourceKey: string): Promise<void> {
    this.events.push(`lock:${sourceKey}`)
  }

  async readTargetIdentity(): Promise<LegacyPreviewTargetIdentity> {
    this.events.push('identity')
    return this.identity
  }

  async readMappings(sourceKey: string): Promise<LegacyPreviewMapping[]> {
    this.events.push('read:mappings')
    return this.mappings.filter((mapping) => mapping.sourceKey === sourceKey)
  }

  async readRun(sourceKey: string): Promise<LegacyPreviewStoredRun | null> {
    this.events.push('read:run')
    if (this.run?.sourceKey !== sourceKey || this.hideCreatedRun) return null
    const run = structuredClone(this.run)
    if (this.driftCreatedRun) run.canonicalDigest = 'e'.repeat(64)
    return run
  }

  async readAggregateCounts(): Promise<LegacyPreviewAggregateCounts> {
    this.events.push('read:aggregate-counts')
    const targetCount = (entity: LegacyPreviewTargetRow['entity']) =>
      [...this.targets.values()].filter((target) => target.projection.entity === entity).length
    const counts: LegacyPreviewAggregateCounts = {
      stores: this.stores.size,
      courses: targetCount('courses'),
      casts: targetCount('casts'),
      customers: targetCount('customers'),
      castSchedules: targetCount('castSchedules'),
      reservations: targetCount('reservations'),
      pointHistories: targetCount('pointHistories'),
      mappings: this.mappings.length,
      runs: this.run === null ? 0 : 1,
    }
    const driftField = this.events.includes('create:run') ? this.postWriteAggregateDrift : null
    if (driftField) counts[driftField] += 1
    return { ...counts, ...this.aggregateCountOverrides }
  }

  async readStore(targetId: string): Promise<LegacyPreviewStoreProjection | null> {
    this.events.push(`read:store:${targetId}`)
    return this.stores.get(targetId) ?? null
  }

  async readTarget(
    entity: LegacyPreviewTargetRow['entity'],
    targetId: string
  ): Promise<{
    projection: LegacyPreviewTargetRow
    customerCredential: string | null
  } | null> {
    this.events.push(`read:${entity}:${targetId}`)
    const target = this.targets.get(targetId) ?? null
    return target && this.hideCreatedEntity === entity ? null : target
  }

  async findNaturalKeyConflict(row: LegacyPreviewTargetRow): Promise<string | null> {
    this.events.push(`conflict:${row.entity}`)
    return this.conflictEntity === row.entity ? 'unmapped-existing-target' : null
  }

  async createTarget(
    row: LegacyPreviewTargetRow,
    customerCredential: string | null
  ): Promise<void> {
    this.events.push(`create:${row.entity}`)
    if (this.failCreateEntity === row.entity) throw new Error('injected database failure')
    const projection = structuredClone(row)
    if (this.driftCreatedEntity === 'courses' && projection.entity === 'courses') {
      projection.data.price += 1
    }
    this.targets.set(row.data.id, { projection, customerCredential })
  }

  async createMapping(mapping: LegacyPreviewMapping): Promise<void> {
    this.events.push(`mapping:${mapping.legacyEntity}`)
    if (this.dropCreatedMappingEntity === mapping.legacyEntity) return
    this.mappings.push(structuredClone(mapping))
  }

  async createRun(run: LegacyPreviewRunProvenance): Promise<void> {
    this.events.push('create:run')
    this.run = { ...structuredClone(run), createdAt: '2026-07-20T03:00:00.000Z' }
  }
}

describe('persistLegacyPreviewImport', () => {
  it('uses a read-only preflight and one serializable write transaction in dependency order', async () => {
    vi.mocked(credentialFactory.createDisabledCredential).mockClear()
    const prepared = preparedImport()
    const port = new InMemoryPreviewPort()

    const report = await persistLegacyPreviewImport(prepared, safeControls, {
      persistence: port,
      credentialFactory,
    })

    expect(port.events.slice(0, 3)).toEqual([
      'transaction:Serializable',
      'identity',
      'lock:gold-main',
    ])
    expect(port.events.filter((event) => event.startsWith('create:'))).toEqual([
      'create:run',
      'create:courses',
      'create:casts',
      'create:customers',
      'create:castSchedules',
      'create:reservations',
      'create:pointHistories',
    ])
    expect(port.events).not.toContain('create:stores')
    expect(port.events.filter((event) => event === 'transaction:Serializable')).toHaveLength(2)
    const secondTransactionIndex = port.events.lastIndexOf('transaction:Serializable')
    const firstWriteIndex = port.events.findIndex(
      (event) => event.startsWith('create:') || event.startsWith('mapping:')
    )
    expect(firstWriteIndex).toBeGreaterThan(secondTransactionIndex)
    expect(port.events.indexOf('create:run')).toBeLessThan(
      port.events.findIndex((event) => event.startsWith('mapping:'))
    )
    expect(port.mappings).toHaveLength(7)
    expect(port.mappings.every((mapping) => mapping.migrationVersion === 1)).toBe(true)
    expect(port.run).toEqual(storedRunFor(prepared))
    expect(port.events.lastIndexOf('read:run')).toBeGreaterThan(port.events.indexOf('create:run'))
    expect(port.events.filter((event) => event === 'read:aggregate-counts')).toHaveLength(3)
    expect(credentialFactory.createDisabledCredential).toHaveBeenCalledTimes(1)

    const customerId = createLegacyPreviewTargetId(
      prepared.sourceKey,
      'customers',
      prepared.records.customers[0].record.source.legacyId
    )
    expect(port.targets.get(customerId)).toEqual(
      expect.objectContaining({
        projection: expect.objectContaining({
          entity: 'customers',
          data: expect.objectContaining({
            id: customerId,
            emailVerified: false,
            emailVerificationToken: null,
            emailVerificationExpiry: null,
            resetToken: null,
            resetTokenExpiry: null,
            phoneVerified: false,
            phoneVerifiedAt: null,
            phoneVerificationCode: null,
            phoneVerificationExpiry: null,
            phoneVerificationAttempts: 0,
          }),
        }),
        customerCredential: disabledPassword,
      })
    )

    expect(report).toEqual({
      targetId: marker,
      cutoffAt: prepared.cutoffAt,
      canonicalDigest: prepared.canonicalDigest,
      counts: {
        stores: { created: 0, reused: 0, verified: 1 },
        courses: { created: 1, reused: 0, verified: 0 },
        casts: { created: 1, reused: 0, verified: 0 },
        customers: { created: 1, reused: 0, verified: 0 },
        castSchedules: { created: 1, reused: 0, verified: 0 },
        reservations: { created: 1, reused: 0, verified: 0 },
        pointHistories: { created: 1, reused: 0, verified: 0 },
        mappings: { created: 7, reused: 0 },
      },
    })
    const serialized = JSON.stringify(report)
    expect(serialized).not.toContain('gold-main')
    expect(serialized).not.toContain('member:customer-9')
    expect(serialized).not.toContain('user@example.com')
    expect(serialized).not.toContain('09012345678')
    expect(serialized).not.toContain('Bob')
  })

  it.each([
    ['stores', 2],
    ['courses', 1],
    ['casts', 1],
    ['customers', 1],
    ['castSchedules', 1],
    ['reservations', 1],
    ['pointHistories', 1],
    ['mappings', 1],
    ['runs', 1],
  ] as const)('rejects a fresh preview database with unexpected %s rows', async (field, count) => {
    const port = new InMemoryPreviewPort()
    port.aggregateCountOverrides[field] = count
    const localCredentialFactory: LegacyPreviewDisabledCredentialFactory = {
      createDisabledCredential: vi.fn(async () => disabledPassword),
    }

    await expect(
      persistLegacyPreviewImport(preparedImport(), safeControls, {
        persistence: port,
        credentialFactory: localCredentialFactory,
      })
    ).rejects.toThrow(/preview persistence/i)

    expect(localCredentialFactory.createDisabledCredential).not.toHaveBeenCalled()
    expect(port.events.filter((event) => event.startsWith('create:'))).toEqual([])
  })

  it.each([
    'stores',
    'courses',
    'casts',
    'customers',
    'castSchedules',
    'reservations',
    'pointHistories',
    'mappings',
    'runs',
  ] as const)('rejects reuse when the database has an extra %s row', async (field) => {
    const prepared = preparedImport()
    const port = new InMemoryPreviewPort()
    await persistLegacyPreviewImport(prepared, safeControls, {
      persistence: port,
      credentialFactory,
    })
    const actual = await port.readAggregateCounts()
    port.aggregateCountOverrides[field] = actual[field] + 1

    await expect(
      persistLegacyPreviewImport(prepared, safeControls, {
        persistence: port,
        credentialFactory,
      })
    ).rejects.toThrow(/preview persistence/i)
  })

  it('rejects aggregate-count drift between preflight and the locked write transaction', async () => {
    const port = new InMemoryPreviewPort()
    const racingFactory: LegacyPreviewDisabledCredentialFactory = {
      createDisabledCredential: vi.fn(async () => {
        port.aggregateCountOverrides.customers = 1
        return disabledPassword
      }),
    }

    await expect(
      persistLegacyPreviewImport(preparedImport(), safeControls, {
        persistence: port,
        credentialFactory: racingFactory,
      })
    ).rejects.toThrow(/preview persistence/i)

    expect(port.events.filter((event) => event.startsWith('create:'))).toEqual([])
  })

  it('rolls back when aggregate counts drift after writes', async () => {
    const port = new InMemoryPreviewPort()
    port.postWriteAggregateDrift = 'customers'

    await expect(
      persistLegacyPreviewImport(preparedImport(), safeControls, {
        persistence: port,
        credentialFactory,
      })
    ).rejects.toThrow(/preview persistence/i)

    expect(port.targets).toHaveLength(0)
    expect(port.mappings).toHaveLength(0)
    expect(port.run).toBeNull()
    expect(port.events.at(-1)).toBe('transaction:rollback')
  })

  it.each([
    ['slug', 'different-store'],
    ['timezone', 'UTC'],
  ] as const)('rejects a preprovisioned store with %s drift', async (field, value) => {
    const port = new InMemoryPreviewPort()
    const store = port.stores.get('gold')
    if (!store) throw new Error('Expected fixture store')
    ;(store as unknown as Record<string, unknown>)[field] = value

    await expect(
      persistLegacyPreviewImport(preparedImport(), safeControls, {
        persistence: port,
        credentialFactory,
      })
    ).rejects.toThrow(/preview persistence/i)

    expect(port.events.filter((event) => event.startsWith('create:'))).toEqual([])
  })

  it('creates disabled credentials after preflight commits and before the write transaction opens', async () => {
    const port = new InMemoryPreviewPort()
    const outsideTransactionFactory: LegacyPreviewDisabledCredentialFactory = {
      createDisabledCredential: vi.fn(async () => {
        port.events.push('credential')
        return disabledPassword
      }),
    }

    await persistLegacyPreviewImport(preparedImport(), safeControls, {
      persistence: port,
      credentialFactory: outsideTransactionFactory,
    })

    const credentialIndex = port.events.indexOf('credential')
    expect(port.events.slice(0, credentialIndex)).toContain('transaction:commit')
    expect(port.events.slice(credentialIndex + 1)).toContain('transaction:Serializable')
    expect(outsideTransactionFactory.createDisabledCredential).toHaveBeenCalledOnce()
  })

  it('reuses only a complete same-hash mapping set with exact target projections', async () => {
    vi.mocked(credentialFactory.createDisabledCredential).mockClear()
    const prepared = preparedImport()
    const port = new InMemoryPreviewPort()

    await persistLegacyPreviewImport(prepared, safeControls, {
      persistence: port,
      credentialFactory,
    })
    const writesAfterFirstRun = port.events.filter(
      (event) => event.startsWith('create:') || event.startsWith('mapping:')
    ).length
    const report = await persistLegacyPreviewImport(prepared, safeControls, {
      persistence: port,
      credentialFactory,
    })

    expect(
      port.events.filter((event) => event.startsWith('create:') || event.startsWith('mapping:'))
    ).toHaveLength(writesAfterFirstRun)
    expect(credentialFactory.createDisabledCredential).toHaveBeenCalledTimes(1)
    expect(port.events.filter((event) => event === 'create:run')).toHaveLength(1)
    expect(report.counts.mappings).toEqual({ created: 0, reused: 7 })
    expect(report.counts.customers).toEqual({ created: 0, reused: 1, verified: 0 })
  })

  it.each([
    ['target marker', 'targetId', 'different-preview-target'],
    ['cutoff', 'cutoffAt', '2025-07-10T00:00:00.000Z'],
    ['migration manifest', 'migrationManifestSha256', '1'.repeat(64)],
    ['canonical export', 'canonicalExportSha256', '2'.repeat(64)],
    ['snapshot manifest', 'snapshotManifestSha256', '3'.repeat(64)],
    ['extractor version', 'extractorVersion', 'different-extractor'],
    ['transformation policy', 'transformationPolicyVersion', 'different-policy'],
    ['canonical digest', 'canonicalDigest', '4'.repeat(64)],
    ['migration version', 'migrationVersion', 2],
    ['creation timestamp', 'createdAt', 'invalid-created-at'],
  ] as const)(
    'rejects reuse when the stored run has %s drift',
    async (_name, field, driftedValue) => {
      const prepared = preparedImport()
      const port = new InMemoryPreviewPort()
      await persistLegacyPreviewImport(prepared, safeControls, {
        persistence: port,
        credentialFactory,
      })
      if (!port.run) throw new Error('test setup did not create a run ledger')
      ;(port.run as unknown as Record<string, unknown>)[field] = driftedValue
      const writeCount = port.events.filter(
        (event) => event.startsWith('create:') || event.startsWith('mapping:')
      ).length

      await expect(
        persistLegacyPreviewImport(prepared, safeControls, {
          persistence: port,
          credentialFactory,
        })
      ).rejects.toThrow(/preview persistence/i)

      expect(
        port.events.filter((event) => event.startsWith('create:') || event.startsWith('mapping:'))
      ).toHaveLength(writeCount)
    }
  )

  it('rejects mapped legacy state that has no run ledger', async () => {
    const prepared = preparedImport()
    const port = new InMemoryPreviewPort()
    await persistLegacyPreviewImport(prepared, safeControls, {
      persistence: port,
      credentialFactory,
    })
    port.run = null
    const writeCount = port.events.filter(
      (event) => event.startsWith('create:') || event.startsWith('mapping:')
    ).length

    await expect(
      persistLegacyPreviewImport(prepared, safeControls, {
        persistence: port,
        credentialFactory,
      })
    ).rejects.toThrow(/preview persistence/i)

    expect(
      port.events.filter((event) => event.startsWith('create:') || event.startsWith('mapping:'))
    ).toHaveLength(writeCount)
  })

  it('rejects a run ledger without mappings as partial state before credential generation', async () => {
    const prepared = preparedImport()
    const port = new InMemoryPreviewPort()
    port.run = storedRunFor(prepared)
    const localCredentialFactory: LegacyPreviewDisabledCredentialFactory = {
      createDisabledCredential: vi.fn(async () => disabledPassword),
    }

    await expect(
      persistLegacyPreviewImport(prepared, safeControls, {
        persistence: port,
        credentialFactory: localCredentialFactory,
      })
    ).rejects.toThrow(/preview persistence/i)

    expect(localCredentialFactory.createDisabledCredential).not.toHaveBeenCalled()
    expect(port.events.filter((event) => event.startsWith('create:'))).toEqual([])
  })

  it('rejects a run-ledger race after preflight and before the write transaction writes', async () => {
    const prepared = preparedImport()
    const port = new InMemoryPreviewPort()
    const racingFactory: LegacyPreviewDisabledCredentialFactory = {
      createDisabledCredential: vi.fn(async () => {
        port.run = storedRunFor(prepared)
        return disabledPassword
      }),
    }

    await expect(
      persistLegacyPreviewImport(prepared, safeControls, {
        persistence: port,
        credentialFactory: racingFactory,
      })
    ).rejects.toThrow(/preview persistence/i)

    expect(port.events.filter((event) => event.startsWith('create:'))).toEqual([])
    expect(port.events.filter((event) => event.startsWith('mapping:'))).toEqual([])
    expect(port.events.at(-1)).toBe('transaction:rollback')
  })

  it('reads the locked database identity and rejects an unsafe target before any write', async () => {
    const port = new InMemoryPreviewPort()
    port.identity.databaseName = 'salon_production'

    await expect(
      persistLegacyPreviewImport(preparedImport(), safeControls, {
        persistence: port,
        credentialFactory,
      })
    ).rejects.toThrow(/preview persistence/i)

    expect(port.events).toEqual(['transaction:Serializable', 'identity', 'transaction:rollback'])
  })

  it.each(['identity', 'mapping', 'natural-key'] as const)(
    'revalidates raced %s state inside the write transaction before writing',
    async (race) => {
      const port = new InMemoryPreviewPort()
      const racingFactory: LegacyPreviewDisabledCredentialFactory = {
        createDisabledCredential: vi.fn(async () => {
          if (race === 'identity') port.identity.databaseName = 'salon_production'
          if (race === 'mapping') {
            port.mappings.push({
              sourceKey: 'gold-main',
              legacyEntity: 'customers',
              legacyId: 'raced-customer',
              targetId: 'raced-target',
              sourceHash: 'f'.repeat(64),
              migrationVersion: 1,
            })
          }
          if (race === 'natural-key') port.conflictEntity = 'customers'
          return disabledPassword
        }),
      }

      await expect(
        persistLegacyPreviewImport(preparedImport(), safeControls, {
          persistence: port,
          credentialFactory: racingFactory,
        })
      ).rejects.toThrow(/preview persistence/i)

      expect(port.events.filter((event) => event === 'transaction:Serializable')).toHaveLength(2)
      expect(
        port.events.filter((event) => event.startsWith('create:') || event.startsWith('mapping:'))
      ).toEqual([])
      expect(port.events.at(-1)).toBe('transaction:rollback')
    }
  )

  it.each([
    'partial',
    'unexpected',
    'duplicate-mapping',
    'hash-drift',
    'missing-target',
    'target-drift',
  ] as const)('rolls back when an existing mapping set has %s state', async (state) => {
    const prepared = preparedImport()
    const port = new InMemoryPreviewPort()
    await persistLegacyPreviewImport(prepared, safeControls, {
      persistence: port,
      credentialFactory,
    })

    if (state === 'partial') port.mappings.pop()
    if (state === 'unexpected') {
      port.mappings.push({
        sourceKey: prepared.sourceKey,
        legacyEntity: 'customers',
        legacyId: 'unexpected',
        targetId: 'unexpected',
        sourceHash: 'd'.repeat(64),
        migrationVersion: 1,
      })
    }
    if (state === 'duplicate-mapping') {
      port.mappings[port.mappings.length - 1] = structuredClone(port.mappings[0])
    }
    if (state === 'hash-drift') port.mappings[0].sourceHash = 'e'.repeat(64)
    if (state === 'missing-target') {
      const mapping = port.mappings.find((candidate) => candidate.legacyEntity === 'courses')
      if (mapping) port.targets.delete(mapping.targetId)
    }
    if (state === 'target-drift') {
      const mapping = port.mappings.find((candidate) => candidate.legacyEntity === 'courses')
      const stored = mapping ? port.targets.get(mapping.targetId) : undefined
      if (stored && stored.projection.entity === 'courses') stored.projection.data.price += 1
    }
    const writeCount = port.events.filter(
      (event) => event.startsWith('create:') || event.startsWith('mapping:')
    ).length

    await expect(
      persistLegacyPreviewImport(prepared, safeControls, {
        persistence: port,
        credentialFactory,
      })
    ).rejects.toThrow(/preview persistence/i)
    expect(
      port.events.filter((event) => event.startsWith('create:') || event.startsWith('mapping:'))
    ).toHaveLength(writeCount)
    expect(port.events.at(-1)).toBe('transaction:rollback')
  })

  it.each(['customers', 'castSchedules', 'pointHistories'] as const)(
    'rejects an unmapped %s natural-key conflict before creating anything',
    async (entity) => {
      const port = new InMemoryPreviewPort()
      port.conflictEntity = entity

      await expect(
        persistLegacyPreviewImport(preparedImport(), safeControls, {
          persistence: port,
          credentialFactory,
        })
      ).rejects.toThrow(/preview persistence/i)
      expect(port.targets).toHaveLength(0)
      expect(port.mappings).toHaveLength(0)
      expect(port.events.at(-1)).toBe('transaction:rollback')
    }
  )

  it('rolls back all prior target and mapping writes when a later insert fails', async () => {
    const port = new InMemoryPreviewPort()
    port.failCreateEntity = 'reservations'

    await expect(
      persistLegacyPreviewImport(preparedImport(), safeControls, {
        persistence: port,
        credentialFactory,
      })
    ).rejects.toThrow('injected database failure')
    expect(port.targets).toHaveLength(0)
    expect(port.mappings).toHaveLength(0)
    expect(port.events.at(-1)).toBe('transaction:rollback')
  })

  it.each(['drift', 'missing'] as const)(
    're-reads every inserted row and rolls back on post-write %s',
    async (failure) => {
      const port = new InMemoryPreviewPort()
      if (failure === 'drift') port.driftCreatedEntity = 'courses'
      if (failure === 'missing') port.hideCreatedEntity = 'courses'

      await expect(
        persistLegacyPreviewImport(preparedImport(), safeControls, {
          persistence: port,
          credentialFactory,
        })
      ).rejects.toThrow(/preview persistence/i)
      expect(port.targets).toHaveLength(0)
      expect(port.mappings).toHaveLength(0)
      expect(port.events.at(-1)).toBe('transaction:rollback')
    }
  )

  it.each(['drift', 'missing'] as const)(
    're-reads the created run ledger and rolls back on post-write %s',
    async (failure) => {
      const port = new InMemoryPreviewPort()
      if (failure === 'drift') port.driftCreatedRun = true
      if (failure === 'missing') port.hideCreatedRun = true

      await expect(
        persistLegacyPreviewImport(preparedImport(), safeControls, {
          persistence: port,
          credentialFactory,
        })
      ).rejects.toThrow(/preview persistence/i)

      expect(port.events).toContain('create:run')
      expect(port.targets).toHaveLength(0)
      expect(port.mappings).toHaveLength(0)
      expect(port.run).toBeNull()
      expect(port.events.at(-1)).toBe('transaction:rollback')
    }
  )

  it('re-reads the complete mapping set and rolls back when a mapping write is missing', async () => {
    const port = new InMemoryPreviewPort()
    port.dropCreatedMappingEntity = 'pointHistories'

    await expect(
      persistLegacyPreviewImport(preparedImport(), safeControls, {
        persistence: port,
        credentialFactory,
      })
    ).rejects.toThrow(/preview persistence/i)
    expect(port.targets).toHaveLength(0)
    expect(port.mappings).toHaveLength(0)
    expect(port.events.at(-1)).toBe('transaction:rollback')
  })

  it('rejects a prepared reference whose physical provenance does not match its target row', async () => {
    const prepared = preparedImport()
    prepared.records.reservations[0].record.customer = {
      ...prepared.records.reservations[0].record.customer,
      physicalTable: 'other_member',
    }
    prepared.records.reservations[0].sourceHash = calculateLegacyPreviewRecordSha256(
      'reservations',
      prepared.records.reservations[0].record
    )
    prepared.canonicalDigest = calculateLegacyPreviewPreparedDigest(prepared)
    const port = new InMemoryPreviewPort()

    await expect(
      persistLegacyPreviewImport(prepared, safeControls, {
        persistence: port,
        credentialFactory,
      })
    ).rejects.toThrow(/preview persistence/i)
    expect(port.events).toEqual([])
  })

  it.each(['declared-store', 'missing-created-at', 'source-hash-drift'] as const)(
    'rejects tampered prepared data with %s before opening a transaction',
    async (problem) => {
      const prepared = preparedImport()
      if (problem === 'declared-store') {
        prepared.records.courses[0].record.targetStoreId = 'different-store'
      }
      if (problem === 'missing-created-at') {
        prepared.records.customers[0].record.createdAt = null
      }
      if (problem === 'source-hash-drift') {
        prepared.records.courses[0].record.price += 1
      }
      const port = new InMemoryPreviewPort()

      await expect(
        persistLegacyPreviewImport(prepared, safeControls, {
          persistence: port,
          credentialFactory,
        })
      ).rejects.toThrow(/preview persistence/i)
      expect(port.events).toEqual([])
    }
  )

  it.each([
    ['targetStoreSlug', 'Gold Salon'],
    ['targetStoreTimezone', 'UTC'],
  ] as const)(
    'rejects a prepared store with invalid %s even when its digests match',
    async (field, value) => {
      const prepared = preparedImport()
      const store = prepared.records.stores[0]
      ;(store.record as unknown as Record<string, unknown>)[field] = value
      store.sourceHash = calculateLegacyPreviewRecordSha256('stores', store.record)
      prepared.canonicalDigest = calculateLegacyPreviewPreparedDigest(prepared)
      const port = new InMemoryPreviewPort()

      await expect(
        persistLegacyPreviewImport(prepared, safeControls, {
          persistence: port,
          credentialFactory,
        })
      ).rejects.toThrow(/preview persistence/i)
      expect(port.events).toEqual([])
    }
  )

  it.each(['invalid-hash', 'duplicate-hash'] as const)(
    'rejects %s prepared input before opening a database transaction',
    async (problem) => {
      const prepared = preparedImport()
      if (problem === 'invalid-hash') prepared.records.courses[0].sourceHash = 'INVALID'
      if (problem === 'duplicate-hash') {
        prepared.records.courses[0].sourceHash = prepared.records.stores[0].sourceHash
      }
      const port = new InMemoryPreviewPort()

      await expect(
        persistLegacyPreviewImport(prepared, safeControls, {
          persistence: port,
          credentialFactory,
        })
      ).rejects.toThrow(/preview persistence/i)
      expect(port.events).toEqual([])
    }
  )
})

/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md staging preview preparation contract
 * @related_to   preview-prepare.ts validates approved snapshot controls without writing a database
 * @known_issues Persistence and rollback are intentionally outside this pure preparation test
 */
import { describe, expect, it } from 'vitest'

import { runLegacyMigrationDryRun, type LegacyEntityName } from './index'
import {
  calculateLegacyCanonicalJsonSha256,
  calculateLegacyMigrationManifestSha256,
  prepareLegacyPreviewImport,
  type LegacyPreviewImportControlV1,
} from './preview-prepare'

const manifest = {
  version: 1 as const,
  sources: [
    {
      sourceKey: 'gold-main',
      utcOffsetMinutes: 540,
      storeMappings: [
        {
          legacyStoreId: 'shop_gold.shops:legacy-gold',
          targetStoreId: 'gold',
          targetStoreSlug: 'gold',
          targetStoreTimezone: 'Asia/Tokyo' as const,
        },
      ],
    },
  ],
}

const rows = {
  stores: [
    {
      source_table: 'shop_gold.shops',
      id: 'shop_gold.shops:legacy-gold',
      name: 'Gold',
      display_name: 'Gold Salon',
      phone: '03-1234-5678',
      email: 'info@example.com',
      address: 'Tokyo',
      is_active: true,
      created_at: '2024-01-02 12:34:56',
    },
  ],
  courses: [
    {
      source_table: 'shop_gold.charge_info',
      id: 'shop_gold.charge_info:course-1',
      store_id: 'shop_gold.shops:legacy-gold',
      name: 'Standard 90',
      duration: 90,
      price: 18000,
      store_share: 9000,
      cast_share: 9000,
      description: 'Standard course',
      is_active: true,
      enable_web_booking: true,
    },
  ],
  casts: [
    {
      source_table: 'shop_gold.girls',
      id: 'shop_gold.girls:cast-7',
      store_id: 'shop_gold.shops:legacy-gold',
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
      panel_designation_rank: 0,
      regular_designation_rank: 0,
      net_reservation: true,
      work_status: 'active',
      created_at: '2024-01-02 12:34:56',
    },
  ],
  customers: [
    {
      source_table: 'member_primary.member',
      id: 'member_primary.member:customer-9',
      name: 'Bob',
      name_kana: 'ボブ',
      phone: '090-1234-5678',
      email: 'user@example.com',
      birth_date: '1990-02-03',
      member_type: 'regular',
      points: 100,
      sms_enabled: false,
      email_notification_enabled: true,
      password: 'must-be-omitted',
      created_at: '2024-01-02 12:34:56',
    },
  ],
  reservations: [
    {
      source_table: 'shop_gold.orders_2025',
      id: 'shop_gold.orders_2025:reservation-3',
      store_id: 'shop_gold.shops:legacy-gold',
      customer_id: 'member_primary.member:customer-9',
      cast_id: 'shop_gold.girls:cast-7',
      course_id: 'shop_gold.charge_info:course-1',
      start_time: '2025-07-10 12:00:00',
      end_time: '2025-07-10 13:30:00',
      status: 'confirmed',
      price: 18000,
      points_used: 0,
      created_at: '2025-07-01 09:30:00',
    },
  ],
  castSchedules: [
    {
      source_table: 'shop_gold.yotei_2025',
      id: 'shop_gold.yotei_2025:schedule-4',
      cast_id: 'shop_gold.girls:cast-7',
      date: '2025-07-10',
      start_time: '2025-07-10 10:00:00',
      end_time: '2025-07-10 20:00:00',
      is_available: true,
    },
  ],
  pointHistories: [
    {
      source_table: 'member_primary.member_point_2025',
      id: 'member_primary.member_point_2025:point-8',
      customer_id: 'member_primary.member:customer-9',
      reservation_id: 'shop_gold.orders_2025:reservation-3',
      type: 'earned',
      amount: 100,
      balance: 100,
      source_order: 1,
      description: 'Imported points',
      expires_at: '2026-07-10 23:59:59',
      is_expired: false,
      created_at: '2025-07-10 13:30:00',
    },
  ],
}

const offlineExport = { sourceKey: 'gold-main', rows }

const expectedInputCounts: Record<LegacyEntityName, number> = {
  stores: 1,
  courses: 1,
  casts: 1,
  customers: 1,
  reservations: 1,
  castSchedules: 1,
  pointHistories: 1,
}

const capabilities = {
  customerCredential: 'generated-disabled-password-hash' as const,
}

type PreviewControlFixture = LegacyPreviewImportControlV1 & {
  snapshotManifestSha256: string
  extractorVersion: string
  transformationPolicyVersion: string
  approvedSourceTables: string[]
}

function controlFor(
  exportInput: unknown = offlineExport,
  overrides: Partial<PreviewControlFixture> = {}
): PreviewControlFixture {
  return {
    version: 1,
    sourceKey: 'gold-main',
    cutoffAt: '2025-07-11T00:00:00.000Z',
    migrationManifestSha256: calculateLegacyMigrationManifestSha256(manifest),
    canonicalExportSha256: calculateLegacyCanonicalJsonSha256(exportInput),
    snapshotManifestSha256: 'a'.repeat(64),
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
    expectedInputCounts,
    ...overrides,
  }
}

describe('prepareLegacyPreviewImport', () => {
  it('prepares every accepted row with physical provenance and deterministic hashes', () => {
    const result = prepareLegacyPreviewImport(
      manifest,
      offlineExport,
      controlFor(),
      capabilities,
      new Date('2025-07-12T00:00:00.000Z')
    )

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.prepared.sourceKey).toBe('gold-main')
    expect(result.prepared.canonicalDigest).toMatch(/^[a-f0-9]{64}$/u)
    expect(result.prepared).toEqual(
      expect.objectContaining({
        migrationManifestSha256: calculateLegacyMigrationManifestSha256(manifest),
        snapshotManifestSha256: 'a'.repeat(64),
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
      })
    )
    expect(result.prepared.records.casts[0]).toEqual(
      expect.objectContaining({
        sourceHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
        record: expect.objectContaining({
          source: expect.objectContaining({ physicalTable: 'shop_gold.girls' }),
          store: expect.objectContaining({ physicalTable: 'shop_gold.shops' }),
          panelDesignationRank: 0,
          regularDesignationRank: 0,
        }),
      })
    )
    expect(result.prepared.records.reservations[0].record).toEqual(
      expect.objectContaining({
        source: expect.objectContaining({ physicalTable: 'shop_gold.orders_2025' }),
        customer: expect.objectContaining({ physicalTable: 'member_primary.member' }),
        cast: expect.objectContaining({ physicalTable: 'shop_gold.girls' }),
        course: expect.objectContaining({ physicalTable: 'shop_gold.charge_info' }),
      })
    )
    expect(JSON.stringify(result.prepared)).not.toContain('must-be-omitted')

    const dryRun = runLegacyMigrationDryRun(manifest, offlineExport)
    expect(dryRun.readyForPersistence).toBe(false)
    expect(dryRun.report?.issues).toContainEqual(
      expect.objectContaining({
        code: 'MISSING_TARGET_REQUIRED_FIELD',
        entity: 'customers',
        field: 'password',
      })
    )
  })

  it('uses stable object-key ordering for the export digest and prepared hashes', () => {
    const reorderedExport = reverseObjectKeys(offlineExport)
    const first = prepareLegacyPreviewImport(
      manifest,
      offlineExport,
      controlFor(),
      capabilities,
      new Date('2025-07-12T00:00:00.000Z')
    )
    const second = prepareLegacyPreviewImport(
      manifest,
      reorderedExport,
      controlFor(reorderedExport),
      capabilities,
      new Date('2025-07-12T00:00:00.000Z')
    )

    expect(calculateLegacyCanonicalJsonSha256(reorderedExport)).toBe(
      calculateLegacyCanonicalJsonSha256(offlineExport)
    )
    expect(first.success).toBe(true)
    expect(second.success).toBe(true)
    if (!first.success || !second.success) return
    expect(second.prepared.canonicalDigest).toBe(first.prepared.canonicalDigest)
    expect(second.prepared.records).toEqual(first.prepared.records)
  })

  it('changes only the affected row hash and aggregate digest when canonical data changes', () => {
    const changedExport = structuredClone(offlineExport)
    changedExport.rows.courses[0].price = 19000
    const first = prepareLegacyPreviewImport(
      manifest,
      offlineExport,
      controlFor(),
      capabilities,
      new Date('2025-07-12T00:00:00.000Z')
    )
    const second = prepareLegacyPreviewImport(
      manifest,
      changedExport,
      controlFor(changedExport),
      capabilities,
      new Date('2025-07-12T00:00:00.000Z')
    )

    expect(first.success).toBe(true)
    expect(second.success).toBe(true)
    if (!first.success || !second.success) return
    expect(second.prepared.canonicalDigest).not.toBe(first.prepared.canonicalDigest)
    expect(second.prepared.records.courses[0].sourceHash).not.toBe(
      first.prepared.records.courses[0].sourceHash
    )
    expect(second.prepared.records.customers[0].sourceHash).toBe(
      first.prepared.records.customers[0].sourceHash
    )
  })

  it('rejects a migration manifest that differs from the separately approved control hash', () => {
    const result = prepareLegacyPreviewImport(
      manifest,
      offlineExport,
      { ...controlFor(), migrationManifestSha256: '0'.repeat(64) },
      capabilities,
      new Date('2025-07-12T00:00:00.000Z')
    )

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'MANIFEST_SHA256_MISMATCH' })
    )
  })

  it('rejects a preview when the latest point-history balance differs from the customer balance', () => {
    const inconsistentExport = structuredClone(offlineExport)
    inconsistentExport.rows.pointHistories[0].balance = 99

    const result = prepareLegacyPreviewImport(
      manifest,
      inconsistentExport,
      controlFor(inconsistentExport),
      capabilities,
      new Date('2025-07-12T00:00:00.000Z')
    )

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'POINT_BALANCE_MISMATCH',
        entity: 'customers',
        field: 'points',
      })
    )
  })

  it('rejects reservation point usage without one exact linked used event', () => {
    const inconsistentExport = structuredClone(offlineExport)
    inconsistentExport.rows.reservations[0].points_used = 100

    const result = prepareLegacyPreviewImport(
      manifest,
      inconsistentExport,
      controlFor(inconsistentExport),
      capabilities,
      new Date('2025-07-12T00:00:00.000Z')
    )

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'POINT_RESERVATION_USAGE_MISMATCH',
        entity: 'reservations',
        field: 'pointsUsed',
      })
    )
  })

  it('accepts reservation point usage with one exact linked negative used event', () => {
    const consistentExport = structuredClone(offlineExport)
    consistentExport.rows.reservations[0].points_used = 100
    consistentExport.rows.pointHistories = [
      {
        ...consistentExport.rows.pointHistories[0],
        id: 'member_primary.member_point_2025:point-7',
        amount: 200,
        balance: 200,
        source_order: 7,
      },
      {
        ...consistentExport.rows.pointHistories[0],
        id: 'member_primary.member_point_2025:point-8',
        type: 'used',
        amount: -100,
        balance: 100,
        source_order: 8,
      },
    ]

    const result = prepareLegacyPreviewImport(
      manifest,
      consistentExport,
      controlFor(consistentExport, {
        expectedInputCounts: { ...expectedInputCounts, pointHistories: 2 },
      }),
      capabilities,
      new Date('2025-07-12T00:00:00.000Z')
    )

    expect(result.success).toBe(true)
  })

  it('uses source order to select the latest balance when events share a timestamp', () => {
    const sameSecondExport = structuredClone(offlineExport)
    sameSecondExport.rows.pointHistories = [
      {
        ...sameSecondExport.rows.pointHistories[0],
        id: 'member_primary.member_point_2025:point-7',
        amount: 50,
        balance: 50,
        source_order: 7,
      },
      {
        ...sameSecondExport.rows.pointHistories[0],
        id: 'member_primary.member_point_2025:point-8',
        type: 'adjusted',
        amount: 50,
        balance: 100,
        source_order: 8,
      },
    ]

    const result = prepareLegacyPreviewImport(
      manifest,
      sameSecondExport,
      controlFor(sameSecondExport, {
        expectedInputCounts: { ...expectedInputCounts, pointHistories: 2 },
      }),
      capabilities,
      new Date('2025-07-12T00:00:00.000Z')
    )

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.prepared.records.pointHistories.map(({ record }) => record.sourceOrder)).toEqual([
      7, 8,
    ])
  })

  it.each([
    {
      name: 'duplicate source order',
      mutate: (exportInput: typeof offlineExport) => {
        exportInput.rows.pointHistories = [
          { ...exportInput.rows.pointHistories[0], source_order: 1 },
          {
            ...exportInput.rows.pointHistories[0],
            id: 'member_primary.member_point_2025:point-9',
            type: 'adjusted',
            source_order: 1,
          },
        ]
      },
      sourceCode: 'DUPLICATE_POINT_SOURCE_ORDER',
    },
    {
      name: 'creation time reversal',
      mutate: (exportInput: typeof offlineExport) => {
        exportInput.rows.pointHistories = [
          {
            ...exportInput.rows.pointHistories[0],
            id: 'member_primary.member_point_2025:point-7',
            source_order: 1,
            created_at: '2025-07-11 13:30:00',
          },
          {
            ...exportInput.rows.pointHistories[0],
            id: 'member_primary.member_point_2025:point-8',
            type: 'adjusted',
            source_order: 2,
            created_at: '2025-07-10 13:30:00',
          },
        ]
      },
      sourceCode: 'POINT_SOURCE_ORDER_DATE_MISMATCH',
    },
  ])('blocks a preview with $name', ({ mutate, sourceCode }) => {
    const invalidExport = structuredClone(offlineExport)
    mutate(invalidExport)

    const result = prepareLegacyPreviewImport(
      manifest,
      invalidExport,
      controlFor(invalidExport, {
        expectedInputCounts: { ...expectedInputCounts, pointHistories: 2 },
      }),
      capabilities,
      new Date('2025-07-12T00:00:00.000Z')
    )

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'DRY_RUN_BLOCKED',
        entity: 'pointHistories',
        message: expect.stringContaining(sourceCode),
      })
    )
  })

  it.each([
    {
      name: 'malformed checksum',
      control: () => controlFor(offlineExport, { canonicalExportSha256: 'not-a-sha' }),
      code: 'INVALID_SHA256',
    },
    {
      name: 'uppercase canonical checksum',
      control: () =>
        controlFor(offlineExport, {
          canonicalExportSha256: calculateLegacyCanonicalJsonSha256(offlineExport).toUpperCase(),
        }),
      code: 'INVALID_SHA256',
    },
    {
      name: 'checksum mismatch',
      control: () => controlFor(offlineExport, { canonicalExportSha256: '0'.repeat(64) }),
      code: 'EXPORT_SHA256_MISMATCH',
    },
    {
      name: 'source mismatch',
      control: () => controlFor(offlineExport, { sourceKey: 'another-source' }),
      code: 'SOURCE_KEY_MISMATCH',
    },
    {
      name: 'count mismatch',
      control: () =>
        controlFor(offlineExport, {
          expectedInputCounts: { ...expectedInputCounts, customers: 2 },
        }),
      code: 'COUNT_MISMATCH',
    },
    {
      name: 'invalid cutoff',
      control: () => controlFor(offlineExport, { cutoffAt: '2025-07-11' }),
      code: 'INVALID_CUTOFF',
    },
    {
      name: 'future cutoff',
      control: () => controlFor(offlineExport, { cutoffAt: '2025-07-13T00:00:00.000Z' }),
      code: 'FUTURE_CUTOFF',
    },
    {
      name: 'malformed snapshot manifest checksum',
      control: () => controlFor(offlineExport, { snapshotManifestSha256: 'A'.repeat(64) }),
      code: 'INVALID_SHA256',
    },
    {
      name: 'untrimmed extractor version',
      control: () => controlFor(offlineExport, { extractorVersion: ' gambit-canonical-v1 ' }),
      code: 'INVALID_CONTROL',
    },
    {
      name: 'untrimmed transformation policy version',
      control: () =>
        controlFor(offlineExport, {
          transformationPolicyVersion: ' legacy-preview-policy-v1 ',
        }),
      code: 'INVALID_CONTROL',
    },
    {
      name: 'unsorted approved source tables',
      control: () =>
        controlFor(offlineExport, {
          approvedSourceTables: ['shop_gold.shops', 'shop_gold.charge_info'],
        }),
      code: 'INVALID_APPROVED_SOURCE_TABLES',
    },
    {
      name: 'duplicate approved source tables',
      control: () =>
        controlFor(offlineExport, {
          approvedSourceTables: ['shop_gold.shops', 'shop_gold.shops'],
        }),
      code: 'INVALID_APPROVED_SOURCE_TABLES',
    },
  ])('rejects $name controls without producing prepared records', ({ control, code }) => {
    const result = prepareLegacyPreviewImport(
      manifest,
      offlineExport,
      control(),
      capabilities,
      new Date('2025-07-12T00:00:00.000Z')
    )

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues).toContainEqual(expect.objectContaining({ code }))
  })

  it.each(['stores', 'casts', 'customers', 'reservations', 'pointHistories'] as const)(
    'rejects %s records created after the approved cutoff',
    (entity) => {
      const afterCutoffExport = structuredClone(offlineExport)
      afterCutoffExport.rows[entity][0].created_at = '2025-07-11 09:00:01'

      const result = prepareLegacyPreviewImport(
        manifest,
        afterCutoffExport,
        controlFor(afterCutoffExport),
        capabilities,
        new Date('2025-07-12T00:00:00.000Z')
      )

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'RECORD_AFTER_CUTOFF',
          entity,
          field: 'createdAt',
        })
      )
    }
  )

  it('allows future reservation service times and schedules created before the cutoff', () => {
    const futureServiceExport = structuredClone(offlineExport)
    futureServiceExport.rows.reservations[0].start_time = '2025-07-12 12:00:00'
    futureServiceExport.rows.reservations[0].end_time = '2025-07-12 13:30:00'
    futureServiceExport.rows.castSchedules[0].date = '2025-07-12'
    futureServiceExport.rows.castSchedules[0].start_time = '2025-07-12 10:00:00'
    futureServiceExport.rows.castSchedules[0].end_time = '2025-07-12 20:00:00'

    const result = prepareLegacyPreviewImport(
      manifest,
      futureServiceExport,
      controlFor(futureServiceExport),
      capabilities,
      new Date('2025-07-12T00:00:00.000Z')
    )

    expect(result.success).toBe(true)
  })

  it.each([
    'snapshotManifestSha256',
    'migrationManifestSha256',
    'extractorVersion',
    'transformationPolicyVersion',
    'approvedSourceTables',
  ] as const)('rejects a control missing %s', (field) => {
    const incompleteControl = controlFor() as unknown as Record<string, unknown>
    delete incompleteControl[field]

    const result = prepareLegacyPreviewImport(
      manifest,
      offlineExport,
      incompleteControl,
      capabilities,
      new Date('2025-07-12T00:00:00.000Z')
    )

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues).toContainEqual(expect.objectContaining({ path: `$.control.${field}` }))
  })

  it('rejects an accidental all-empty snapshot even when its approved counts are zero', () => {
    const emptyExport = {
      sourceKey: 'gold-main',
      rows: Object.fromEntries(Object.keys(rows).map((entity) => [entity, []])),
    }
    const zeroCounts = Object.fromEntries(
      Object.keys(expectedInputCounts).map((entity) => [entity, 0])
    ) as Record<LegacyEntityName, number>

    const result = prepareLegacyPreviewImport(
      manifest,
      emptyExport,
      controlFor(emptyExport, { expectedInputCounts: zeroCounts }),
      capabilities,
      new Date('2025-07-12T00:00:00.000Z')
    )

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'EMPTY_SNAPSHOT' }))
  })

  it('rejects a record from a table absent from the verified snapshot control', () => {
    const control = controlFor()
    control.approvedSourceTables = control.approvedSourceTables.filter(
      (table) => table !== 'shop_gold.orders_2025'
    )

    const result = prepareLegacyPreviewImport(
      manifest,
      offlineExport,
      control,
      capabilities,
      new Date('2025-07-12T00:00:00.000Z')
    )

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'UNAPPROVED_SOURCE_TABLE',
        entity: 'reservations',
      })
    )
  })

  it('rejects unqualified table names that can collide across legacy databases', () => {
    const unqualifiedExport = structuredClone(offlineExport)
    unqualifiedExport.rows.reservations[0].source_table = 'orders_2025'

    const result = prepareLegacyPreviewImport(
      manifest,
      unqualifiedExport,
      controlFor(unqualifiedExport),
      capabilities,
      new Date('2025-07-12T00:00:00.000Z')
    )

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'INVALID_SOURCE_IDENTITY' })
    )
  })

  it('rejects an approved source table that no canonical record uses', () => {
    const control = controlFor()
    control.approvedSourceTables = [
      ...control.approvedSourceTables,
      'unused_origin.unused_table',
    ].sort()

    const result = prepareLegacyPreviewImport(
      manifest,
      offlineExport,
      control,
      capabilities,
      new Date('2025-07-12T00:00:00.000Z')
    )

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'UNUSED_APPROVED_SOURCE_TABLE' })
    )
  })

  it('requires an explicit disabled-password adapter capability', () => {
    const result = prepareLegacyPreviewImport(
      manifest,
      offlineExport,
      controlFor(),
      {},
      new Date('2025-07-12T00:00:00.000Z')
    )

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'MISSING_PERSISTENCE_CAPABILITY' })
    )
  })

  it('does not let the password capability hide any other target-schema blocker', () => {
    const incompleteExport = structuredClone(offlineExport)
    delete (incompleteExport.rows.casts[0] as Record<string, unknown>).panel_designation_rank
    const result = prepareLegacyPreviewImport(
      manifest,
      incompleteExport,
      controlFor(incompleteExport),
      capabilities,
      new Date('2025-07-12T00:00:00.000Z')
    )

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'DRY_RUN_BLOCKED', entity: 'casts' })
    )
  })

  it('allows only the deliberate credential-omission warning', () => {
    const warningExport = structuredClone(offlineExport)
    delete (warningExport.rows.customers[0] as Record<string, unknown>).email
    const result = prepareLegacyPreviewImport(
      manifest,
      warningExport,
      controlFor(warningExport),
      capabilities,
      new Date('2025-07-12T00:00:00.000Z')
    )

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'UNAPPROVED_WARNING',
        entity: 'customers',
        field: 'email',
      })
    )
  })

  it('rejects rows without a physical source table', () => {
    const untraceableExport = structuredClone(offlineExport)
    delete (untraceableExport.rows.reservations[0] as Record<string, unknown>).source_table
    const result = prepareLegacyPreviewImport(
      manifest,
      untraceableExport,
      controlFor(untraceableExport),
      capabilities,
      new Date('2025-07-12T00:00:00.000Z')
    )

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'DRY_RUN_BLOCKED', entity: 'reservations' })
    )
  })

  it.each([
    {
      name: 'a source table that does not qualify the opaque ID',
      sourceTable: 'orders_2024',
      legacyId: 'orders_2025:reservation-3',
    },
    {
      name: 'an unsafe physical SQL identifier',
      sourceTable: 'orders_2025;DROP_TABLE',
      legacyId: 'orders_2025;DROP_TABLE:reservation-3',
    },
  ])('rejects $name', ({ sourceTable, legacyId }) => {
    const spoofedExport = structuredClone(offlineExport)
    spoofedExport.rows.reservations[0].source_table = sourceTable
    spoofedExport.rows.reservations[0].id = legacyId
    const result = prepareLegacyPreviewImport(
      manifest,
      spoofedExport,
      controlFor(spoofedExport),
      capabilities,
      new Date('2025-07-12T00:00:00.000Z')
    )

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVALID_SOURCE_IDENTITY',
        entity: 'reservations',
      })
    )
  })

  it.each(['casts', 'customers', 'reservations'] as const)(
    'requires source-created timestamps for %s instead of inventing import-time values',
    (entity) => {
      const missingTimestampExport = structuredClone(offlineExport)
      delete (missingTimestampExport.rows[entity][0] as Record<string, unknown>).created_at
      const result = prepareLegacyPreviewImport(
        manifest,
        missingTimestampExport,
        controlFor(missingTimestampExport),
        capabilities,
        new Date('2025-07-12T00:00:00.000Z')
      )

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_PREVIEW_CREATED_AT',
          entity,
          field: 'createdAt',
        })
      )
    }
  )
})

function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseObjectKeys)
  if (value === null || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .reverse()
      .map(([key, nestedValue]) => [key, reverseObjectKeys(nestedValue)])
  )
}

/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md canonical transformation contract
 * @related_to   transform.ts rejects ambiguous source data before persistence
 * @known_issues Tests exercise offline fixtures only and never connect to legacy production
 */
import { describe, expect, it } from 'vitest'

import {
  transformLegacyExport,
  validateLegacyMigrationManifest,
  type LegacyMigrationManifestV1,
} from './index'

const manifest: LegacyMigrationManifestV1 = {
  version: 1,
  sources: [
    {
      sourceKey: 'gold-main',
      utcOffsetMinutes: 540,
      storeMappings: [
        {
          legacyStoreId: 'legacy-gold',
          targetStoreId: 'gold',
          targetStoreSlug: 'gold',
          targetStoreTimezone: 'Asia/Tokyo',
        },
      ],
    },
  ],
}

describe('legacy migration manifest', () => {
  it('accepts a versioned source and store mapping', () => {
    expect(validateLegacyMigrationManifest(manifest)).toEqual({
      success: true,
      data: manifest,
      issues: [],
    })
  })

  it('reports unsupported versions, duplicate source keys, and duplicate store mappings', () => {
    const result = validateLegacyMigrationManifest({
      version: 2,
      sources: [
        {
          sourceKey: 'duplicate',
          utcOffsetMinutes: 900,
          storeMappings: [
            {
              legacyStoreId: 'same',
              targetStoreId: 'gold',
              targetStoreSlug: 'gold',
              targetStoreTimezone: 'Asia/Tokyo',
            },
            {
              legacyStoreId: 'same',
              targetStoreId: 'platinum',
              targetStoreSlug: 'platinum',
              targetStoreTimezone: 'Asia/Tokyo',
            },
          ],
        },
        {
          sourceKey: 'duplicate',
          utcOffsetMinutes: 540,
          storeMappings: [],
        },
      ],
    })

    expect(result.success).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'UNSUPPORTED_VERSION',
        'DUPLICATE_SOURCE_KEY',
        'INVALID_UTC_OFFSET',
        'DUPLICATE_STORE_MAPPING',
        'EMPTY_STORE_MAPPINGS',
      ])
    )
  })

  it.each([
    ['missing slug', { targetStoreSlug: undefined }],
    ['non-canonical slug', { targetStoreSlug: 'Gold Salon' }],
    ['unsupported timezone', { targetStoreTimezone: 'UTC' }],
  ])('rejects a store mapping with %s', (_, override) => {
    const mapping = { ...manifest.sources[0].storeMappings[0], ...override }
    if ('targetStoreSlug' in override && override.targetStoreSlug === undefined)
      delete (mapping as { targetStoreSlug?: unknown }).targetStoreSlug

    const result = validateLegacyMigrationManifest({
      ...manifest,
      sources: [{ ...manifest.sources[0], storeMappings: [mapping] }],
    })

    expect(result.success).toBe(false)
    if (result.success) throw new Error('Expected manifest rejection')
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVALID_STORE_MAPPING',
      })
    )
  })

  it.each([
    ['top-level', { ...manifest, ignoredPolicy: true }],
    [
      'source',
      {
        ...manifest,
        sources: [{ ...manifest.sources[0], databaseUrl: 'private-database' }],
      },
    ],
    [
      'store mapping',
      {
        ...manifest,
        sources: [
          {
            ...manifest.sources[0],
            storeMappings: [{ ...manifest.sources[0].storeMappings[0], fallbackStore: 'other' }],
          },
        ],
      },
    ],
  ])('rejects an unsupported %s manifest field instead of silently ignoring it', (_, input) => {
    const result = validateLegacyMigrationManifest(input)

    expect(result.success).toBe(false)
    if (result.success) throw new Error('Expected manifest rejection')
    expect(result.issues.map((issue) => issue.code)).toContain('UNSUPPORTED_MANIFEST_FIELD')
  })
})

describe('legacy offline export transformation', () => {
  it('normalizes all supported entities into deterministic records with explicit source references', () => {
    const result = transformLegacyExport(manifest, {
      sourceKey: 'gold-main',
      rows: {
        stores: [
          {
            source_table: 'shops',
            id: 'legacy-gold',
            name: ' GOLD ',
            display_name: 'Gold Salon',
            phone: '03-1234-5678',
            email: ' INFO@EXAMPLE.COM ',
            is_active: '1',
            created_at: '2024-01-02 12:34:56',
          },
        ],
        courses: [
          {
            source_table: 'charge_info',
            id: 'course-1',
            store_id: 'legacy-gold',
            name: 'Standard 90',
            duration: '90',
            price: '18000',
            description: 'standard course',
            is_active: '1',
            enable_web_booking: '1',
          },
        ],
        casts: [
          {
            source_table: 'girls',
            id: 'cast-7',
            store_id: 'legacy-gold',
            name: ' Alice ',
            age: '24',
            height: '160',
            bust: 'C',
            waist: '58',
            hip: '84',
            type: 'standard',
            image: '/legacy/alice.jpg',
            description: ' profile ',
            panel_designation_rank: '0',
            regular_designation_rank: '0',
            net_reservation: 'yes',
            work_status: '在籍',
            created_at: '2024-01-02 12:34:56',
          },
        ],
        customers: [
          {
            source_table: 'member',
            id: 'customer-9',
            name: ' Bob ',
            name_kana: ' ボブ ',
            phone: '090-1234-5678',
            email: ' USER@EXAMPLE.COM ',
            birth_date: '1990-02-03',
            member_type: 'regular',
            points: '100',
            sms_enabled: '0',
            email_notification_enabled: 'はい',
            password: 'plain-secret-must-never-leave-the-row',
            created_at: '2024-01-02 12:34:56',
          },
        ],
        reservations: [
          {
            source_table: 'orders_2025',
            id: 'reservation-3',
            store_id: 'legacy-gold',
            customer_id: 'customer-9',
            cast_id: 'cast-7',
            course_id: 'course-1',
            start_time: '2025-07-10 12:00:00',
            end_time: '2025-07-10 13:30:00',
            status: '予約確定',
            price: '18000',
            points_used: '100',
            created_at: '2025-07-01 09:30:00',
          },
        ],
        castSchedules: [
          {
            source_table: 'yotei_2025',
            id: 'schedule-4',
            cast_id: 'cast-7',
            date: '2025-07-10',
            start_time: '2025-07-10 10:00:00',
            end_time: '2025-07-10 20:00:00',
            is_available: 'はい',
          },
        ],
        pointHistories: [
          {
            source_table: 'member_point_2025',
            id: 'point-8',
            customer_id: 'customer-9',
            reservation_id: 'reservation-3',
            type: '付与',
            amount: '100',
            balance: '200',
            source_order: '8',
            description: ' 利用ポイント ',
            expires_at: '2026-07-10 23:59:59',
            is_expired: 'false',
            created_at: '2025-07-10 13:30:00',
          },
        ],
      },
    })

    expect(result.records.stores).toEqual([
      expect.objectContaining({
        source: {
          sourceKey: 'gold-main',
          entity: 'stores',
          physicalTable: 'shops',
          legacyId: 'legacy-gold',
        },
        targetStoreId: 'gold',
        targetStoreSlug: 'gold',
        targetStoreTimezone: 'Asia/Tokyo',
        name: 'GOLD',
        displayName: 'Gold Salon',
        phone: '+81312345678',
        email: 'info@example.com',
        isActive: true,
        createdAt: '2024-01-02T03:34:56.000Z',
      }),
    ])
    expect(result.records.casts).toEqual([
      expect.objectContaining({
        source: {
          sourceKey: 'gold-main',
          entity: 'casts',
          physicalTable: 'girls',
          legacyId: 'cast-7',
        },
        store: {
          sourceKey: 'gold-main',
          entity: 'stores',
          physicalTable: 'shops',
          legacyId: 'legacy-gold',
        },
        targetStoreId: 'gold',
        name: 'Alice',
        age: 24,
        netReservation: true,
        workStatus: 'active',
      }),
    ])
    expect(result.records.courses).toEqual([
      expect.objectContaining({
        source: {
          sourceKey: 'gold-main',
          entity: 'courses',
          physicalTable: 'charge_info',
          legacyId: 'course-1',
        },
        targetStoreId: 'gold',
        name: 'Standard 90',
        duration: 90,
        price: 18000,
      }),
    ])
    expect(result.records.customers).toEqual([
      expect.objectContaining({
        source: {
          sourceKey: 'gold-main',
          entity: 'customers',
          physicalTable: 'member',
          legacyId: 'customer-9',
        },
        name: 'Bob',
        nameKana: 'ボブ',
        phone: '+819012345678',
        email: 'user@example.com',
        birthDate: '1990-02-03',
        points: 100,
        smsEnabled: false,
        emailNotificationEnabled: true,
        credentialStrategy: 'reset-required',
      }),
    ])
    expect(result.records.reservations).toEqual([
      expect.objectContaining({
        source: {
          sourceKey: 'gold-main',
          entity: 'reservations',
          physicalTable: 'orders_2025',
          legacyId: 'reservation-3',
        },
        targetStoreId: 'gold',
        customer: {
          sourceKey: 'gold-main',
          entity: 'customers',
          physicalTable: 'member',
          legacyId: 'customer-9',
        },
        cast: {
          sourceKey: 'gold-main',
          entity: 'casts',
          physicalTable: 'girls',
          legacyId: 'cast-7',
        },
        course: {
          sourceKey: 'gold-main',
          entity: 'courses',
          physicalTable: 'charge_info',
          legacyId: 'course-1',
        },
        startTime: '2025-07-10T03:00:00.000Z',
        endTime: '2025-07-10T04:30:00.000Z',
        status: 'confirmed',
        price: 18000,
      }),
    ])
    expect(result.issues).not.toContainEqual(
      expect.objectContaining({
        code: 'UNRESOLVED_REFERENCE',
        entity: 'reservations',
        field: 'course_id',
      })
    )
    expect(result.records.castSchedules).toEqual([
      expect.objectContaining({
        source: {
          sourceKey: 'gold-main',
          entity: 'castSchedules',
          physicalTable: 'yotei_2025',
          legacyId: 'schedule-4',
        },
        cast: {
          sourceKey: 'gold-main',
          entity: 'casts',
          physicalTable: 'girls',
          legacyId: 'cast-7',
        },
        date: '2025-07-10',
        startTime: '2025-07-10T01:00:00.000Z',
        endTime: '2025-07-10T11:00:00.000Z',
        isAvailable: true,
      }),
    ])
    expect(result.records.pointHistories).toEqual([
      expect.objectContaining({
        source: {
          sourceKey: 'gold-main',
          entity: 'pointHistories',
          physicalTable: 'member_point_2025',
          legacyId: 'point-8',
        },
        customer: {
          sourceKey: 'gold-main',
          entity: 'customers',
          physicalTable: 'member',
          legacyId: 'customer-9',
        },
        reservation: {
          sourceKey: 'gold-main',
          entity: 'reservations',
          physicalTable: 'orders_2025',
          legacyId: 'reservation-3',
        },
        type: 'earned',
        amount: 100,
        balance: 200,
        sourceOrder: 8,
        expiresAt: '2026-07-10T14:59:59.000Z',
        isExpired: false,
      }),
    ])
    expect(JSON.stringify(result.records)).not.toContain('plain-secret-must-never-leave-the-row')
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        severity: 'warning',
        code: 'PLAINTEXT_CREDENTIAL_OMITTED',
        entity: 'customers',
        rowIndex: 0,
        legacyId: 'customer-9',
      })
    )
    expect(result.reconciliation).toEqual({
      stores: { input: 1, accepted: 1, rejected: 0 },
      courses: { input: 1, accepted: 1, rejected: 0 },
      casts: { input: 1, accepted: 1, rejected: 0 },
      customers: { input: 1, accepted: 1, rejected: 0 },
      reservations: { input: 1, accepted: 1, rejected: 0 },
      castSchedules: { input: 1, accepted: 1, rejected: 0 },
      pointHistories: { input: 1, accepted: 1, rejected: 0 },
    })
  })

  it('returns row-level errors and reconciliation counts instead of silently dropping invalid rows', () => {
    const result = transformLegacyExport(manifest, {
      sourceKey: 'gold-main',
      rows: {
        stores: [],
        courses: [],
        casts: [
          {
            source_table: 'girls',
            id: 'cast-with-unmapped-store',
            store_id: 'missing-store',
            name: 'Alice',
            net_reservation: 'maybe',
            work_status: 'mystery',
          },
        ],
        customers: [
          {
            source_table: 'member',
            id: 'bad-customer',
            name: 'Bob',
            phone: 'not-a-phone',
            password: 'never-output-this',
          },
        ],
        reservations: [
          {
            source_table: 'orders_2025',
            id: 'bad-reservation',
            store_id: 'legacy-gold',
            customer_id: 'missing-customer',
            cast_id: 'missing-cast',
            course_id: 'course-1',
            start_time: '2025-07-10 13:00:00',
            end_time: '2025-07-10 12:00:00',
            status: 'unknown-status',
          },
        ],
        castSchedules: [],
        pointHistories: [
          {
            source_table: 'member_point_2025',
            id: 'orphan-point',
            customer_id: 'missing-customer',
            type: '付与',
            amount: '100.5',
            balance: '100',
            source_order: 1,
            created_at: '0000-00-00 00:00:00',
          },
        ],
      },
    })

    expect(result.records.casts).toHaveLength(0)
    expect(result.records.customers).toHaveLength(0)
    expect(result.records.reservations).toHaveLength(0)
    expect(result.records.pointHistories).toHaveLength(0)
    expect(result.reconciliation).toEqual({
      stores: { input: 0, accepted: 0, rejected: 0 },
      courses: { input: 0, accepted: 0, rejected: 0 },
      casts: { input: 1, accepted: 0, rejected: 1 },
      customers: { input: 1, accepted: 0, rejected: 1 },
      reservations: { input: 1, accepted: 0, rejected: 1 },
      castSchedules: { input: 0, accepted: 0, rejected: 0 },
      pointHistories: { input: 1, accepted: 0, rejected: 1 },
    })
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'UNMAPPED_STORE',
          entity: 'casts',
          rowIndex: 0,
          legacyId: 'cast-with-unmapped-store',
          field: 'store_id',
        }),
        expect.objectContaining({
          code: 'INVALID_BOOLEAN',
          entity: 'casts',
          rowIndex: 0,
          legacyId: 'cast-with-unmapped-store',
          field: 'net_reservation',
        }),
        expect.objectContaining({
          code: 'INVALID_STATUS',
          entity: 'casts',
          rowIndex: 0,
          legacyId: 'cast-with-unmapped-store',
          field: 'work_status',
        }),
        expect.objectContaining({
          code: 'INVALID_PHONE',
          entity: 'customers',
          rowIndex: 0,
          legacyId: 'bad-customer',
          field: 'phone',
        }),
        expect.objectContaining({
          code: 'UNRESOLVED_REFERENCE',
          entity: 'reservations',
          rowIndex: 0,
          legacyId: 'bad-reservation',
          field: 'customer_id',
        }),
        expect.objectContaining({
          code: 'INVALID_DATE_RANGE',
          entity: 'reservations',
          rowIndex: 0,
          legacyId: 'bad-reservation',
        }),
        expect.objectContaining({
          code: 'INVALID_INTEGER',
          entity: 'pointHistories',
          rowIndex: 0,
          legacyId: 'orphan-point',
          field: 'amount',
        }),
        expect.objectContaining({
          code: 'INVALID_DATETIME',
          entity: 'pointHistories',
          rowIndex: 0,
          legacyId: 'orphan-point',
          field: 'created_at',
        }),
      ])
    )
    expect(JSON.stringify(result)).not.toContain('never-output-this')
  })

  it('reports missing email as a persistence blocker without fabricating customer identity', () => {
    const result = transformLegacyExport(manifest, {
      sourceKey: 'gold-main',
      rows: {
        stores: [],
        courses: [],
        casts: [],
        customers: [
          {
            source_table: 'member',
            id: 'phone-only-customer',
            name: 'Phone Customer',
            phone: '080-1111-2222',
            member_type: 'regular',
            points: 0,
            sms_enabled: false,
            email_notification_enabled: true,
          },
        ],
        reservations: [],
        castSchedules: [],
        pointHistories: [],
      },
    })

    expect(result.records.customers).toEqual([
      expect.objectContaining({
        email: null,
        credentialStrategy: 'reset-required',
        persistenceDisposition: 'blocked-missing-email',
      }),
    ])
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        severity: 'warning',
        code: 'MISSING_EMAIL_REQUIRES_RESOLUTION',
        entity: 'customers',
        rowIndex: 0,
        legacyId: 'phone-only-customer',
        field: 'email',
      })
    )
  })

  it('rejects duplicate normalized customer email and phone identities within an export', () => {
    const customerState = {
      member_type: 'regular',
      points: 0,
      sms_enabled: false,
      email_notification_enabled: true,
    }
    const result = transformLegacyExport(manifest, {
      sourceKey: 'gold-main',
      rows: {
        stores: [],
        courses: [],
        casts: [],
        customers: [
          {
            source_table: 'member',
            id: 'customer-1',
            name: 'First',
            phone: '090-1234-5678',
            email: 'owner@example.com',
            ...customerState,
          },
          {
            source_table: 'member',
            id: 'customer-2',
            name: 'Duplicate email',
            phone: '080-1111-2222',
            email: ' OWNER@EXAMPLE.COM ',
            ...customerState,
          },
          {
            source_table: 'member',
            id: 'customer-3',
            name: 'Duplicate phone',
            phone: '+81 90 1234 5678',
            email: 'other@example.com',
            ...customerState,
          },
        ],
        reservations: [],
        castSchedules: [],
        pointHistories: [],
      },
    })

    expect(result.records.customers.map((customer) => customer.source.legacyId)).toEqual([
      'customer-1',
    ])
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'DUPLICATE_CUSTOMER_EMAIL',
          legacyId: 'customer-2',
          field: 'email',
        }),
        expect.objectContaining({
          code: 'DUPLICATE_CUSTOMER_PHONE',
          legacyId: 'customer-3',
          field: 'phone',
        }),
      ])
    )
  })

  it('rejects rows when financially or operationally material values are omitted', () => {
    const storesResult = transformLegacyExport(manifest, {
      sourceKey: 'gold-main',
      rows: {
        stores: [{ source_table: 'shops', id: 'legacy-gold', name: 'Gold' }],
        courses: [],
        casts: [],
        customers: [],
        reservations: [],
        castSchedules: [],
        pointHistories: [],
      },
    })
    expect(storesResult.records.stores).toHaveLength(0)
    expect(storesResult.issues).toContainEqual(
      expect.objectContaining({
        code: 'MISSING_REQUIRED_FIELD',
        entity: 'stores',
        field: 'is_active',
      })
    )

    const customersResult = transformLegacyExport(manifest, {
      sourceKey: 'gold-main',
      rows: {
        stores: [],
        courses: [],
        casts: [],
        customers: [
          {
            source_table: 'member',
            id: 'customer-with-implicit-state',
            name: 'Customer',
            phone: '090-1234-5678',
            email: 'customer@example.com',
          },
        ],
        reservations: [],
        castSchedules: [],
        pointHistories: [],
      },
    })
    expect(customersResult.records.customers).toHaveLength(0)
    expect(customersResult.issues).toEqual(
      expect.arrayContaining(
        ['member_type', 'points', 'sms_enabled', 'email_notification_enabled'].map((field) =>
          expect.objectContaining({
            code: 'MISSING_REQUIRED_FIELD',
            entity: 'customers',
            field,
          })
        )
      )
    )

    const reservationsResult = transformLegacyExport(manifest, {
      sourceKey: 'gold-main',
      rows: {
        stores: [{ source_table: 'shops', id: 'legacy-gold', name: 'Gold', is_active: true }],
        courses: [
          {
            source_table: 'charge_info',
            id: 'course-1',
            store_id: 'legacy-gold',
            name: 'Course',
            duration: 60,
            price: 10000,
            is_active: true,
            enable_web_booking: true,
          },
        ],
        casts: [
          {
            source_table: 'girls',
            id: 'cast-1',
            store_id: 'legacy-gold',
            name: 'Cast',
            panel_designation_rank: 0,
            regular_designation_rank: 0,
            net_reservation: true,
            work_status: 'active',
          },
        ],
        customers: [
          {
            source_table: 'member',
            id: 'customer-1',
            name: 'Customer',
            phone: '090-1234-5678',
            email: 'customer@example.com',
            points: 0,
            sms_enabled: false,
            email_notification_enabled: true,
          },
        ],
        reservations: [
          {
            source_table: 'orders_2099',
            id: 'reservation-with-implicit-financials',
            store_id: 'legacy-gold',
            customer_id: 'customer-1',
            cast_id: 'cast-1',
            course_id: 'course-1',
            start_time: '2099-07-10 12:00:00',
            end_time: '2099-07-10 13:00:00',
            status: 'confirmed',
          },
        ],
        castSchedules: [],
        pointHistories: [],
      },
    })
    expect(reservationsResult.records.reservations).toHaveLength(0)
    expect(reservationsResult.issues).toEqual(
      expect.arrayContaining(
        ['price', 'points_used'].map((field) =>
          expect.objectContaining({
            code: 'MISSING_REQUIRED_FIELD',
            entity: 'reservations',
            field,
          })
        )
      )
    )
  })

  it('requires an explicit point-expiry state instead of assuming an active balance', () => {
    const result = transformLegacyExport(manifest, {
      sourceKey: 'gold-main',
      rows: {
        stores: [],
        courses: [],
        casts: [],
        customers: [
          {
            source_table: 'member',
            id: 'customer-1',
            name: 'Customer',
            phone: '090-1234-5678',
            email: 'customer@example.com',
            member_type: 'regular',
            points: 100,
            sms_enabled: false,
            email_notification_enabled: true,
          },
        ],
        reservations: [],
        castSchedules: [],
        pointHistories: [
          {
            source_table: 'member_point_2025',
            id: 'point-with-implicit-expiry',
            customer_id: 'customer-1',
            type: 'earned',
            amount: 100,
            balance: 100,
            source_order: 1,
            created_at: '2025-07-10 13:30:00',
          },
        ],
      },
    })

    expect(result.records.pointHistories).toHaveLength(0)
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'MISSING_REQUIRED_FIELD',
        entity: 'pointHistories',
        field: 'is_expired',
      })
    )
  })

  it('rejects a negative customer point balance', () => {
    const result = transformLegacyExport(manifest, {
      sourceKey: 'gold-main',
      rows: {
        stores: [],
        courses: [],
        casts: [],
        customers: [
          {
            source_table: 'member',
            id: 'customer-1',
            name: 'Customer',
            phone: '090-1234-5678',
            email: 'customer@example.com',
            member_type: 'regular',
            points: -1,
            sms_enabled: false,
            email_notification_enabled: true,
          },
        ],
        reservations: [],
        castSchedules: [],
        pointHistories: [],
      },
    })

    expect(result.records.customers).toHaveLength(0)
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVALID_INTEGER',
        entity: 'customers',
        field: 'points',
      })
    )
  })

  it.each([
    { type: 'earned', amount: 0 },
    { type: 'earned', amount: -1 },
    { type: 'used', amount: 0 },
    { type: 'used', amount: 1 },
    { type: 'expired', amount: 0 },
    { type: 'expired', amount: 1 },
    { type: 'adjusted', amount: 0 },
  ])('rejects an invalid $type point amount $amount', ({ type, amount }) => {
    const result = transformLegacyExport(manifest, {
      sourceKey: 'gold-main',
      rows: {
        stores: [],
        courses: [],
        casts: [],
        customers: [
          {
            source_table: 'member',
            id: 'customer-1',
            name: 'Customer',
            phone: '090-1234-5678',
            email: 'customer@example.com',
            member_type: 'regular',
            points: 100,
            sms_enabled: false,
            email_notification_enabled: true,
          },
        ],
        reservations: [],
        castSchedules: [],
        pointHistories: [
          {
            source_table: 'member_point_2025',
            id: 'point-1',
            customer_id: 'customer-1',
            type,
            amount,
            balance: 100,
            source_order: 1,
            is_expired: false,
            created_at: '2025-07-10 13:00:00',
          },
        ],
      },
    })

    expect(result.records.pointHistories).toHaveLength(0)
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'POINT_AMOUNT_SIGN_MISMATCH',
        entity: 'pointHistories',
        field: 'amount',
      })
    )
  })

  it('rejects a negative point-history balance', () => {
    const result = transformLegacyExport(manifest, {
      sourceKey: 'gold-main',
      rows: {
        stores: [],
        courses: [],
        casts: [],
        customers: [
          {
            source_table: 'member',
            id: 'customer-1',
            name: 'Customer',
            phone: '090-1234-5678',
            email: 'customer@example.com',
            member_type: 'regular',
            points: 0,
            sms_enabled: false,
            email_notification_enabled: true,
          },
        ],
        reservations: [],
        castSchedules: [],
        pointHistories: [
          {
            source_table: 'member_point_2025',
            id: 'point-1',
            customer_id: 'customer-1',
            type: 'used',
            amount: -1,
            balance: -1,
            source_order: 1,
            is_expired: false,
            created_at: '2025-07-10 13:00:00',
          },
        ],
      },
    })

    expect(result.records.pointHistories).toHaveLength(0)
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVALID_INTEGER',
        entity: 'pointHistories',
        field: 'balance',
      })
    )
  })

  it('rejects a first point event that implies a negative opening balance', () => {
    const result = transformLegacyExport(manifest, {
      sourceKey: 'gold-main',
      rows: {
        stores: [],
        courses: [],
        casts: [],
        customers: [
          {
            source_table: 'member',
            id: 'customer-1',
            name: 'Customer',
            phone: '090-1234-5678',
            email: 'customer@example.com',
            member_type: 'regular',
            points: 50,
            sms_enabled: false,
            email_notification_enabled: true,
          },
        ],
        reservations: [],
        castSchedules: [],
        pointHistories: [
          {
            source_table: 'member_point_2025',
            id: 'point-1',
            customer_id: 'customer-1',
            type: 'earned',
            amount: 100,
            balance: 50,
            source_order: 1,
            is_expired: false,
            created_at: '2025-07-10 13:00:00',
          },
        ],
      },
    })

    expect(result.records.pointHistories).toHaveLength(0)
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'POINT_OPENING_BALANCE_MISMATCH',
        entity: 'pointHistories',
        field: 'balance',
      })
    )
  })

  it("rejects a point history linked to another customer's reservation", () => {
    const result = transformLegacyExport(manifest, {
      sourceKey: 'gold-main',
      rows: {
        stores: [{ source_table: 'shops', id: 'legacy-gold', name: 'Gold', is_active: true }],
        courses: [
          {
            source_table: 'charge_info',
            id: 'course-1',
            store_id: 'legacy-gold',
            name: 'Course',
            duration: 60,
            price: 10000,
            is_active: true,
            enable_web_booking: true,
          },
        ],
        casts: [
          {
            source_table: 'girls',
            id: 'cast-1',
            store_id: 'legacy-gold',
            name: 'Cast',
            panel_designation_rank: 0,
            regular_designation_rank: 0,
            net_reservation: true,
            work_status: 'active',
          },
        ],
        customers: [
          {
            source_table: 'member',
            id: 'customer-1',
            name: 'First customer',
            phone: '090-1111-1111',
            email: 'first@example.com',
            member_type: 'regular',
            points: 100,
            sms_enabled: false,
            email_notification_enabled: false,
          },
          {
            source_table: 'member',
            id: 'customer-2',
            name: 'Second customer',
            phone: '090-2222-2222',
            email: 'second@example.com',
            member_type: 'regular',
            points: 100,
            sms_enabled: false,
            email_notification_enabled: false,
          },
        ],
        reservations: [
          {
            source_table: 'orders_2025',
            id: 'reservation-1',
            store_id: 'legacy-gold',
            customer_id: 'customer-1',
            cast_id: 'cast-1',
            course_id: 'course-1',
            start_time: '2025-07-10 12:00:00',
            end_time: '2025-07-10 13:00:00',
            status: 'confirmed',
            price: 10000,
            points_used: 0,
          },
        ],
        castSchedules: [],
        pointHistories: [
          {
            source_table: 'member_point_2025',
            id: 'point-1',
            customer_id: 'customer-2',
            reservation_id: 'reservation-1',
            type: 'earned',
            amount: 100,
            balance: 100,
            source_order: 1,
            is_expired: false,
            created_at: '2025-07-10 13:00:00',
          },
        ],
      },
    })

    expect(result.records.reservations).toHaveLength(1)
    expect(result.records.pointHistories).toHaveLength(0)
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'CUSTOMER_REFERENCE_MISMATCH',
        entity: 'pointHistories',
        rowIndex: 0,
        field: 'reservation_id',
      })
    )
  })

  it.each([
    { name: 'missing', value: undefined, code: 'MISSING_REQUIRED_FIELD' },
    { name: 'negative', value: -1, code: 'INVALID_INTEGER' },
    { name: 'fractional', value: 1.5, code: 'INVALID_INTEGER' },
    { name: 'unsafe', value: Number.MAX_SAFE_INTEGER + 1, code: 'INVALID_INTEGER' },
  ])('rejects a $name point-history source order', ({ value, code }) => {
    const pointHistory: Record<string, unknown> = {
      source_table: 'member_point_2025',
      id: 'point-1',
      customer_id: 'customer-1',
      type: 'earned',
      amount: 100,
      balance: 100,
      is_expired: false,
      created_at: '2025-07-10 13:00:00',
    }
    if (value !== undefined) pointHistory.source_order = value

    const result = transformLegacyExport(manifest, {
      sourceKey: 'gold-main',
      rows: {
        stores: [],
        courses: [],
        casts: [],
        customers: [
          {
            source_table: 'member',
            id: 'customer-1',
            name: 'Customer',
            phone: '090-1111-1111',
            email: 'customer@example.com',
            member_type: 'regular',
            points: 100,
            sms_enabled: false,
            email_notification_enabled: false,
          },
        ],
        reservations: [],
        castSchedules: [],
        pointHistories: [pointHistory],
      },
    })

    expect(result.records.pointHistories).toHaveLength(0)
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code,
        entity: 'pointHistories',
        rowIndex: 0,
        field: 'source_order',
      })
    )
  })

  it('rejects duplicate point-history source orders within one customer', () => {
    const result = transformLegacyExport(manifest, {
      sourceKey: 'gold-main',
      rows: {
        stores: [],
        courses: [],
        casts: [],
        customers: [
          {
            source_table: 'member',
            id: 'customer-1',
            name: 'Customer',
            phone: '090-1111-1111',
            email: 'customer@example.com',
            member_type: 'regular',
            points: 150,
            sms_enabled: false,
            email_notification_enabled: false,
          },
        ],
        reservations: [],
        castSchedules: [],
        pointHistories: [
          {
            source_table: 'member_point_2025',
            id: 'point-1',
            customer_id: 'customer-1',
            type: 'earned',
            amount: 100,
            balance: 100,
            source_order: 7,
            is_expired: false,
            created_at: '2025-07-10 13:00:00',
          },
          {
            source_table: 'member_point_2025',
            id: 'point-2',
            customer_id: 'customer-1',
            type: 'adjusted',
            amount: 50,
            balance: 150,
            source_order: 7,
            is_expired: false,
            created_at: '2025-07-10 13:00:00',
          },
        ],
      },
    })

    expect(result.records.pointHistories).toHaveLength(0)
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'DUPLICATE_POINT_SOURCE_ORDER',
        entity: 'pointHistories',
        field: 'source_order',
      })
    )
  })

  it('rejects point-history source order that contradicts creation time', () => {
    const result = transformLegacyExport(manifest, {
      sourceKey: 'gold-main',
      rows: {
        stores: [],
        courses: [],
        casts: [],
        customers: [
          {
            source_table: 'member',
            id: 'customer-1',
            name: 'Customer',
            phone: '090-1111-1111',
            email: 'customer@example.com',
            member_type: 'regular',
            points: 150,
            sms_enabled: false,
            email_notification_enabled: false,
          },
        ],
        reservations: [],
        castSchedules: [],
        pointHistories: [
          {
            source_table: 'member_point_2025',
            id: 'point-1',
            customer_id: 'customer-1',
            type: 'earned',
            amount: 100,
            balance: 100,
            source_order: 1,
            is_expired: false,
            created_at: '2025-07-11 13:00:00',
          },
          {
            source_table: 'member_point_2025',
            id: 'point-2',
            customer_id: 'customer-1',
            type: 'adjusted',
            amount: 50,
            balance: 150,
            source_order: 2,
            is_expired: false,
            created_at: '2025-07-10 13:00:00',
          },
        ],
      },
    })

    expect(result.records.pointHistories).toHaveLength(0)
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'POINT_SOURCE_ORDER_DATE_MISMATCH',
        entity: 'pointHistories',
        field: 'source_order',
      })
    )
  })

  it('rejects a broken point-history balance chain for the entire customer', () => {
    const result = transformLegacyExport(manifest, {
      sourceKey: 'gold-main',
      rows: {
        stores: [],
        courses: [],
        casts: [],
        customers: [
          {
            source_table: 'member',
            id: 'customer-1',
            name: 'Customer',
            phone: '090-1111-1111',
            email: 'customer@example.com',
            member_type: 'regular',
            points: 150,
            sms_enabled: false,
            email_notification_enabled: false,
          },
        ],
        reservations: [],
        castSchedules: [],
        pointHistories: [
          {
            source_table: 'member_point_2025',
            id: 'point-1',
            customer_id: 'customer-1',
            type: 'earned',
            amount: 100,
            balance: 100,
            source_order: 1,
            is_expired: false,
            created_at: '2025-07-10 13:00:00',
          },
          {
            source_table: 'member_point_2025',
            id: 'point-2',
            customer_id: 'customer-1',
            type: 'adjusted',
            amount: 50,
            balance: 999,
            source_order: 2,
            is_expired: false,
            created_at: '2025-07-10 13:00:00',
          },
        ],
      },
    })

    expect(result.records.pointHistories).toHaveLength(0)
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'POINT_BALANCE_CHAIN_MISMATCH',
        entity: 'pointHistories',
        rowIndex: 1,
        field: 'balance',
      })
    )
  })

  it('rejects unknown columns when the canonical transformer is called directly', () => {
    const result = transformLegacyExport(manifest, {
      sourceKey: 'gold-main',
      rows: {
        stores: [
          {
            source_table: 'shops',
            id: 'legacy-gold',
            name: 'Gold',
            is_active: true,
            silently_discarded_value: 'must-be-rejected',
          },
        ],
        courses: [],
        casts: [],
        customers: [],
        reservations: [],
        castSchedules: [],
        pointHistories: [],
      },
    })

    expect(result.records.stores).toHaveLength(0)
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'UNSUPPORTED_EXPORT_COLUMN',
        entity: 'stores',
        rowIndex: 0,
        legacyId: 'legacy-gold',
        field: 'silently_discarded_value',
      })
    )
  })

  it('rejects duplicate legacy IDs and reports the duplicate row explicitly', () => {
    const result = transformLegacyExport(manifest, {
      sourceKey: 'gold-main',
      rows: {
        stores: [
          { source_table: 'shops', id: 'legacy-gold', name: 'First', is_active: true },
          { source_table: 'shops_archive', id: 'legacy-gold', name: 'Second', is_active: true },
        ],
        courses: [],
        casts: [],
        customers: [],
        reservations: [],
        castSchedules: [],
        pointHistories: [],
      },
    })

    expect(result.records.stores).toHaveLength(1)
    expect(result.reconciliation.stores).toEqual({
      input: 2,
      accepted: 1,
      rejected: 1,
    })
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        code: 'DUPLICATE_LEGACY_ID',
        entity: 'stores',
        rowIndex: 1,
        legacyId: 'legacy-gold',
      })
    )
  })

  it('rejects exports from an unknown source before reading rows', () => {
    expect(() =>
      transformLegacyExport(manifest, {
        sourceKey: 'not-configured',
        rows: {
          stores: [],
          courses: [],
          casts: [],
          customers: [],
          reservations: [],
          castSchedules: [],
          pointHistories: [],
        },
      })
    ).toThrowError('Unknown legacy source: not-configured')
  })
})

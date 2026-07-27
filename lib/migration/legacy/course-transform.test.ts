/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md course migration contract
 * @related_to   transform.ts converts canonical offline course rows before reservations
 * @known_issues Tests use canonical exports and never connect to the legacy production database
 */
import { describe, expect, it } from 'vitest'

import { transformLegacyExport, type LegacyMigrationManifestV1 } from './index'

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
        {
          legacyStoreId: 'legacy-platinum',
          targetStoreId: 'platinum',
          targetStoreSlug: 'platinum',
          targetStoreTimezone: 'Asia/Tokyo',
        },
      ],
    },
  ],
}

describe('legacy course transformation', () => {
  it('normalizes courses and resolves same-store reservation references', () => {
    const result = transformLegacyExport(manifest, {
      sourceKey: 'gold-main',
      rows: {
        stores: [
          { source_table: 'shops', id: 'legacy-gold', name: 'Gold', is_active: true },
          { source_table: 'shops', id: 'legacy-platinum', name: 'Platinum', is_active: true },
        ],
        courses: [
          {
            source_table: 'charge_info',
            id: 'course-1',
            store_id: 'legacy-gold',
            name: ' 90分 ',
            duration: '90',
            price: '18000',
            store_share: '10000',
            cast_share: '8000',
            description: ' standard ',
            is_active: '1',
            enable_web_booking: 'yes',
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
            net_reservation: '1',
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
            member_type: 'regular',
            points: 0,
            sms_enabled: false,
            email_notification_enabled: true,
          },
        ],
        reservations: [
          {
            source_table: 'orders_2099',
            id: 'reservation-1',
            store_id: 'legacy-gold',
            customer_id: 'customer-1',
            cast_id: 'cast-1',
            course_id: 'course-1',
            start_time: '2099-07-10 12:00:00',
            end_time: '2099-07-10 13:30:00',
            status: 'confirmed',
            price: 18000,
            points_used: 0,
          },
        ],
        castSchedules: [],
        pointHistories: [],
      },
    })

    expect(result.records.courses).toEqual([
      expect.objectContaining({
        source: {
          sourceKey: 'gold-main',
          entity: 'courses',
          physicalTable: 'charge_info',
          legacyId: 'course-1',
        },
        targetStoreId: 'gold',
        name: '90分',
        duration: 90,
        price: 18000,
        storeShare: 10000,
        castShare: 8000,
        description: 'standard',
        isActive: true,
        enableWebBooking: true,
      }),
    ])
    expect(result.records.reservations).toHaveLength(1)
    expect(result.reconciliation.courses).toEqual({ input: 1, accepted: 1, rejected: 0 })
    expect(result.issues).not.toContainEqual(
      expect.objectContaining({ entity: 'reservations', field: 'course_id' })
    )
  })

  it('rejects a reservation whose course belongs to another target store', () => {
    const result = transformLegacyExport(manifest, {
      sourceKey: 'gold-main',
      rows: {
        stores: [
          { source_table: 'shops', id: 'legacy-gold', name: 'Gold', is_active: true },
          { source_table: 'shops', id: 'legacy-platinum', name: 'Platinum', is_active: true },
        ],
        courses: [
          {
            source_table: 'charge_info',
            id: 'course-platinum',
            store_id: 'legacy-platinum',
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
            member_type: 'regular',
            points: 0,
            sms_enabled: false,
            email_notification_enabled: true,
          },
        ],
        reservations: [
          {
            source_table: 'orders_2099',
            id: 'reservation-1',
            store_id: 'legacy-gold',
            customer_id: 'customer-1',
            cast_id: 'cast-1',
            course_id: 'course-platinum',
            start_time: '2099-07-10 12:00:00',
            end_time: '2099-07-10 13:00:00',
            status: 'confirmed',
            price: 10000,
            points_used: 0,
          },
        ],
        castSchedules: [],
        pointHistories: [],
      },
    })

    expect(result.records.reservations).toHaveLength(0)
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'STORE_REFERENCE_MISMATCH',
        entity: 'reservations',
        field: 'course_id',
      })
    )
  })

  it('rejects a course whose legacy store row is not present in the accepted export', () => {
    const result = transformLegacyExport(manifest, {
      sourceKey: 'gold-main',
      rows: {
        stores: [],
        courses: [
          {
            source_table: 'charge_info',
            id: 'orphan-course',
            store_id: 'legacy-gold',
            name: 'Course',
            duration: 60,
            price: 10000,
            is_active: true,
            enable_web_booking: true,
          },
        ],
        casts: [],
        customers: [],
        reservations: [],
        castSchedules: [],
        pointHistories: [],
      },
    })

    expect(result.records.courses).toHaveLength(0)
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'UNRESOLVED_REFERENCE',
        entity: 'courses',
        field: 'store_id',
      })
    )
  })

  it('rejects database-overflow integers and missing publication flags', () => {
    const result = transformLegacyExport(manifest, {
      sourceKey: 'gold-main',
      rows: {
        stores: [{ source_table: 'shops', id: 'legacy-gold', name: 'Gold', is_active: true }],
        courses: [
          {
            source_table: 'charge_info',
            id: 'overflow-course',
            store_id: 'legacy-gold',
            name: 'Overflow',
            duration: 60,
            price: 2147483648,
            is_active: true,
            enable_web_booking: true,
          },
          {
            source_table: 'charge_info',
            id: 'implicit-publication-course',
            store_id: 'legacy-gold',
            name: 'Implicit',
            duration: 60,
            price: 10000,
          },
        ],
        casts: [],
        customers: [],
        reservations: [],
        castSchedules: [],
        pointHistories: [],
      },
    })

    expect(result.records.courses).toHaveLength(0)
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'INVALID_INTEGER',
          entity: 'courses',
          legacyId: 'overflow-course',
          field: 'price',
        }),
        expect.objectContaining({
          code: 'MISSING_REQUIRED_FIELD',
          entity: 'courses',
          legacyId: 'implicit-publication-course',
          field: 'is_active',
        }),
        expect.objectContaining({
          code: 'MISSING_REQUIRED_FIELD',
          entity: 'courses',
          legacyId: 'implicit-publication-course',
          field: 'enable_web_booking',
        }),
      ])
    )
  })

  it('rejects archived courses that are still marked active or web-bookable', () => {
    const result = transformLegacyExport(manifest, {
      sourceKey: 'gold-main',
      rows: {
        stores: [{ source_table: 'shops', id: 'legacy-gold', name: 'Gold', is_active: true }],
        courses: [
          {
            source_table: 'charge_info',
            id: 'contradictory-course',
            store_id: 'legacy-gold',
            name: 'Archived',
            duration: 60,
            price: 10000,
            is_active: true,
            enable_web_booking: true,
            archived_at: '2026-07-01 00:00:00',
          },
        ],
        casts: [],
        customers: [],
        reservations: [],
        castSchedules: [],
        pointHistories: [],
      },
    })

    expect(result.records.courses).toHaveLength(0)
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVALID_STATUS',
        entity: 'courses',
        field: 'archived_at',
      })
    )
  })
})

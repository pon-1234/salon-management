/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md V5 post-import reconciliation
 * @related_to   gold-master-post-import-sql.ts renders read-only SQL from the approved control
 * @known_issues SQL validation is offline; execution belongs to an isolated preview rehearsal
 */
import { describe, expect, it } from 'vitest'

import { buildGoldMasterPostImportSql } from './gold-master-post-import-sql'
import type { GoldMasterPreviewVerificationControl } from './gold-master-verification'
import { PREVIEW_UAT_EMPTY_TABLES } from './setup'

function control(): GoldMasterPreviewVerificationControl {
  const models = Object.fromEntries(
    PREVIEW_UAT_EMPTY_TABLES.map((model) => [
      model,
      { count: 0, fieldCount: 1, canonicalSha256: '7'.repeat(64) },
    ])
  ) as GoldMasterPreviewVerificationControl['models']
  models.Customer = { count: 13313, fieldCount: 29, canonicalSha256: '2'.repeat(64) }
  models.Reservation = { count: 2122, fieldCount: 45, canonicalSha256: '3'.repeat(64) }
  models.ReservationOption = { count: 3753, fieldCount: 7, canonicalSha256: '4'.repeat(64) }
  models.Cast = { count: 35, fieldCount: 29, canonicalSha256: '5'.repeat(64) }
  models.HotelSettings = { count: 2, fieldCount: 18, canonicalSha256: '8'.repeat(64) }

  return {
    version: 1,
    evidenceScope: 'ikebukuro-preview-artifact',
    snapshot: {
      schemaVersion: 4,
      sha256: 'a'.repeat(64),
      cutoffAt: '2026-08-14T10:31:10.000Z',
      scheduleFrom: '2026-08-01',
      scheduleTo: '2026-09-30',
      reservationFrom: '2026-01-01',
      sourceRowCounts: {},
    },
    images: {
      manifestVersion: 1,
      manifestSha256: 'b'.repeat(64),
      fileCount: 105,
      byteCount: 9794316,
      inventorySha256: 'c'.repeat(64),
      canonicalSha256: 'd'.repeat(64),
    },
    migrations: {
      count: 2,
      canonicalSha256: 'e'.repeat(64),
      entries: [
        { name: '20260101000000_baseline', sha256: 'f'.repeat(64) },
        { name: '20260814000000_current', sha256: '1'.repeat(64) },
      ],
    },
    models,
    fixtureCanonicalSha256: '6'.repeat(64),
    aggregates: {
      customers: {
        count: 13313,
        active: 13270,
        blocked: 28,
        pending: 4,
        withdrawn: 10,
        unknown: 1,
        regularStage: 13302,
        silverStage: 8,
        goldStage: 2,
        platinumStage: 1,
        godStage: 0,
        regularMember: 1420,
        vipMember: 11893,
        points: 11464870,
        lastLogin: 958,
        lastVisit: 11905,
        emailVerified: 1,
        smsEnabled: 0,
        emailNotificationEnabled: 0,
        distinctPhones: 13313,
        distinctEmails: 13313,
      },
      reservations: {
        count: 2122,
        completed: 2108,
        confirmed: 3,
        pending: 11,
        cancelled: 0,
        settlementPending: 2122,
        cash: 2074,
        creditCard: 48,
        paymentReference: 0,
        designationNone: 0,
        designationPanel: 2122,
        designationRegular: 0,
        price: 62187800,
        storeRevenue: 24972800,
        staffRevenue: 37215000,
        designationFee: 0,
        transportationFee: 46000,
        additionalFee: 280000,
        hotelExpense: 0,
        discountAmount: 1360500,
        welfareExpense: 0,
        pointsUsed: 38000,
      },
      reservationOptions: { count: 3753, price: 8646000, storeShare: 0, castShare: 8646000 },
      courses: { count: 13, price: 357000, storeShare: 171000, castShare: 186000 },
      options: { count: 11, price: 13000, storeShare: 0, castShare: 13000 },
      schedules: { count: 241, available: 158, unavailable: 83 },
      reviews: { count: 261, published: 261 },
    },
  }
}

describe('buildGoldMasterPostImportSql', () => {
  it('renders a fail-closed read-only reconciliation with exact migrations and orphan-safe joins', () => {
    const sql = buildGoldMasterPostImportSql(control())

    expect(sql).toContain('\\set ON_ERROR_STOP on')
    expect(sql).toContain('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;')
    expect(sql).toContain("('Customer', 13313::bigint)")
    expect(sql).toContain("('ReservationOption', 3753::bigint)")
    expect(sql).toContain(
      "('20260814000000_current', '1111111111111111111111111111111111111111111111111111111111111111')"
    )
    expect(sql).toContain('LEFT JOIN "Cast" c')
    expect(sql).toContain('c."id" IS NULL')
    expect(sql).toContain('LEFT JOIN "Reservation" r')
    expect(sql).toContain('r."id" IS NULL')
    expect(sql).toContain('FROM "CustomerStoreAssignment" assignment')
    expect(sql).toContain("'customer assignment relation mismatch'")
    expect(sql).toContain('HAVING count(assignment."storeId") <> 1')
    expect(sql).toContain("'customer assignment coverage mismatch'")
    expect(sql).toContain('assignment."storeId" = r."storeId"')
    expect(sql).toContain("'reservation customer store assignment mismatch'")
    expect(sql).toContain(
      '"nameKana" IS NULL OR "email" IS NULL OR "password" IS NULL OR "birthDate" IS NULL'
    )
    expect(sql).toContain("'imported customer required profile mismatch'")
    expect(sql).toContain('FROM "HotelSettings"')
    expect(sql).toContain('WHERE NOT "isActive"')
    expect(sql).toContain("'active hotel count mismatch'")
    expect(sql).toContain('V5_FULL_DATABASE_RECONCILIATION_OK')
    expect(sql).toContain('ROLLBACK;')
    expect(sql).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|DROP|ALTER|CREATE)\b/u)
  })
})

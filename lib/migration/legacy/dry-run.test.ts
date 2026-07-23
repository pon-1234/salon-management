/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md staging dry-run gate
 * @related_to   transform.ts, manifest.ts, scripts/legacy-migration-dry-run.ts
 * @known_issues Course persistence stays blocked until its adapter is implemented
 */
import { describe, expect, it } from 'vitest'
import { runLegacyMigrationDryRun } from './dry-run'

const manifest = {
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
          targetStoreTimezone: 'Asia/Tokyo' as const,
        },
      ],
    },
  ],
}

const emptyRows = {
  stores: [],
  courses: [],
  casts: [],
  customers: [],
  reservations: [],
  castSchedules: [],
  pointHistories: [],
}

describe('runLegacyMigrationDryRun', () => {
  it('rejects malformed offline input without attempting transformation', () => {
    const execution = runLegacyMigrationDryRun(manifest, {
      sourceKey: 'gold-main',
      rows: { stores: 'not-an-array' },
    })

    expect(execution.transformed).toBe(false)
    expect(execution.readyForPersistence).toBe(false)
    expect(execution.inputIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '$.rows.stores', code: 'INVALID_EXPORT_ROWS' }),
        expect.objectContaining({ path: '$.rows.casts', code: 'INVALID_EXPORT_ROWS' }),
      ])
    )
  })

  it('rejects unknown record collections before transformation instead of silently dropping them', () => {
    const execution = runLegacyMigrationDryRun(manifest, {
      sourceKey: 'gold-main',
      rows: {
        ...emptyRows,
        reviews: [],
      },
    })

    expect(execution.transformed).toBe(false)
    expect(execution.readyForPersistence).toBe(false)
    expect(execution.inputIssues).toContainEqual(
      expect.objectContaining({
        code: 'UNSUPPORTED_EXPORT_ENTITY',
        path: '$.rows',
      })
    )
    expect(JSON.stringify(execution.inputIssues)).not.toContain('reviews')
  })

  it('rejects unknown top-level fields instead of silently treating metadata as verified', () => {
    const execution = runLegacyMigrationDryRun(manifest, {
      sourceKey: 'gold-main',
      rows: emptyRows,
      snapshotChecksum: 'unverified-checksum',
    })

    expect(execution.transformed).toBe(false)
    expect(execution.inputIssues).toContainEqual(
      expect.objectContaining({
        code: 'UNSUPPORTED_EXPORT_FIELD',
        path: '$',
      })
    )
    expect(JSON.stringify(execution.inputIssues)).not.toContain('snapshotChecksum')
  })

  it('rejects unknown columns in every canonical row collection before transformation', () => {
    const rowsWithUnknownColumns = Object.fromEntries(
      Object.keys(emptyRows).map((entity) => [entity, [{ unexpected_legacy_column: true }]])
    )

    const execution = runLegacyMigrationDryRun(manifest, {
      sourceKey: 'gold-main',
      rows: rowsWithUnknownColumns,
    })

    expect(execution.transformed).toBe(false)
    expect(execution.readyForPersistence).toBe(false)
    expect(execution.inputIssues).toEqual(
      Object.keys(emptyRows).map((entity) =>
        expect.objectContaining({
          code: 'UNSUPPORTED_EXPORT_COLUMN',
          path: `$.rows.${entity}[0]`,
        })
      )
    )
    expect(JSON.stringify(execution.inputIssues)).not.toContain('unexpected_legacy_column')
  })

  it('redacts arbitrary unsupported manifest property names from dry-run issues', () => {
    const privateMarker = 'customer_password_secret_column'
    const execution = runLegacyMigrationDryRun(
      {
        ...manifest,
        [privateMarker]: true,
      },
      { sourceKey: 'gold-main', rows: emptyRows }
    )

    expect(execution.transformed).toBe(false)
    expect(execution.inputIssues).toContainEqual(
      expect.objectContaining({ code: 'INVALID_MANIFEST', path: '$' })
    )
    expect(JSON.stringify(execution.inputIssues)).not.toContain(privateMarker)
  })

  it('does not expose an unapproved source key through transformation errors', () => {
    const privateMarker = 'password-secret-source'
    const execution = runLegacyMigrationDryRun(manifest, {
      sourceKey: privateMarker,
      rows: emptyRows,
    })

    expect(execution.transformed).toBe(false)
    expect(execution.inputIssues).toContainEqual({
      code: 'INVALID_EXPORT',
      path: '$.sourceKey',
      message: 'Legacy export could not be transformed.',
    })
    expect(JSON.stringify(execution.inputIssues)).not.toContain(privateMarker)
  })

  it('rejects non-object rows with their exact input paths', () => {
    const execution = runLegacyMigrationDryRun(manifest, {
      sourceKey: 'gold-main',
      rows: {
        ...emptyRows,
        casts: [null],
        customers: ['not-an-object'],
      },
    })

    expect(execution.transformed).toBe(false)
    expect(execution.readyForPersistence).toBe(false)
    expect(execution.inputIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INVALID_EXPORT_ROW', path: '$.rows.casts[0]' }),
        expect.objectContaining({ code: 'INVALID_EXPORT_ROW', path: '$.rows.customers[0]' }),
      ])
    )
  })

  it('keeps persistence closed until the staging writer is implemented', () => {
    const execution = runLegacyMigrationDryRun(manifest, {
      sourceKey: 'gold-main',
      rows: emptyRows,
    })

    expect(execution.transformed).toBe(true)
    expect(execution.readyForPersistence).toBe(false)
    expect(execution.report).toEqual({
      sourceKey: 'gold-main',
      readyForPersistence: false,
      persistenceAdapterReady: false,
      errorCount: 0,
      warningCount: 0,
      blockedCustomerCount: 0,
      deferredCourseReferenceCount: 0,
      targetSchemaBlockerCount: 0,
      reconciliation: expect.any(Object),
      issues: [],
    })
  })

  it('blocks persistence for missing customer email and target-required fields', () => {
    const execution = runLegacyMigrationDryRun(manifest, {
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
            member_type: 'regular',
            points: 0,
            sms_enabled: false,
            email_notification_enabled: true,
            password: 'must-not-appear',
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

    expect(execution.transformed).toBe(true)
    expect(execution.readyForPersistence).toBe(false)
    expect(execution.report).toEqual(
      expect.objectContaining({
        blockedCustomerCount: 1,
        deferredCourseReferenceCount: 0,
        targetSchemaBlockerCount: 12,
        errorCount: 12,
      })
    )
    expect(JSON.stringify(execution.report)).not.toContain('must-not-appear')
  })

  it('blocks records that cannot satisfy required Prisma Cast and Customer fields', () => {
    const execution = runLegacyMigrationDryRun(manifest, {
      sourceKey: 'gold-main',
      rows: {
        ...emptyRows,
        stores: [{ source_table: 'shops', id: 'legacy-gold', name: 'Gold', is_active: true }],
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
      },
    })

    expect(execution.transformed).toBe(true)
    expect(execution.readyForPersistence).toBe(false)
    expect(execution.report).toEqual(
      expect.objectContaining({
        targetSchemaBlockerCount: 11,
        errorCount: 11,
      })
    )
    expect(execution.report?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'MISSING_TARGET_REQUIRED_FIELD',
          entity: 'casts',
          rowIndex: 0,
          field: 'age',
        }),
        expect.objectContaining({
          code: 'MISSING_TARGET_REQUIRED_FIELD',
          entity: 'casts',
          rowIndex: 0,
          field: 'image',
        }),
        expect.objectContaining({
          code: 'MISSING_TARGET_REQUIRED_FIELD',
          entity: 'customers',
          rowIndex: 0,
          field: 'nameKana',
        }),
        expect.objectContaining({
          code: 'MISSING_TARGET_REQUIRED_FIELD',
          entity: 'customers',
          rowIndex: 0,
          field: 'password',
        }),
      ])
    )
  })
})

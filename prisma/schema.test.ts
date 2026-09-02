/**
 * @design_doc   Not available
 * @related_to   Prisma schema validation
 * @known_issues Not available
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Prisma schema', () => {
  const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma')
  let schemaContent: string

  beforeEach(() => {
    schemaContent = readFileSync(schemaPath, 'utf-8')
  })

  it('should have Cast model defined', () => {
    expect(schemaContent).toContain('model Cast {')
  })

  it('persists the cast phonetic name used by administrator search and editing', () => {
    expect(schemaContent).toMatch(/nameKana\s+String\?/)
    const migration = readFileSync(
      join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260720014000_add_cast_name_kana',
        'migration.sql'
      ),
      'utf8'
    )
    expect(migration).toContain('ADD COLUMN "nameKana" TEXT')
  })

  it('persists a cast employment lifecycle independently from daily attendance', () => {
    expect(schemaContent).toMatch(/employmentStatus\s+String\s+@default\("provisional"\)/)
    const migration = readFileSync(
      join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260902090000_add_cast_employment_status',
        'migration.sql'
      ),
      'utf8'
    )
    expect(migration).toContain(
      'ADD COLUMN "employmentStatus" TEXT NOT NULL DEFAULT \'provisional\''
    )
    expect(migration).toContain('SET "employmentStatus" = \'active\'')
  })

  it('links a cast special designation selection to the store master entry', () => {
    expect(schemaContent).toMatch(/specialDesignationFeeId\s+String\?/)
    expect(schemaContent).toContain('CastSpecialDesignationFee')
    const migration = readFileSync(
      join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260902090000_add_cast_employment_status',
        'migration.sql'
      ),
      'utf8'
    )
    expect(migration).toContain('ADD COLUMN "specialDesignationFeeId" TEXT')
    expect(migration).toContain('Cast_specialDesignationFeeId_fkey')
  })

  it('links panel and repeat take-home bonuses to named store master entries', () => {
    expect(schemaContent).toMatch(/panelTakeHomeBonusId\s+String\?/)
    expect(schemaContent).toMatch(/regularTakeHomeBonusId\s+String\?/)
    expect(schemaContent).toContain('CastPanelTakeHomeBonus')
    expect(schemaContent).toContain('CastRegularTakeHomeBonus')
    const migration = readFileSync(
      join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260902100000_add_cast_take_home_bonus_tiers',
        'migration.sql'
      ),
      'utf8'
    )
    expect(migration).toContain('ADD COLUMN "panelTakeHomeBonusId" TEXT')
    expect(migration).toContain('ADD COLUMN "regularTakeHomeBonusId" TEXT')
  })

  it('should have Customer model defined', () => {
    expect(schemaContent).toContain('model Customer {')
  })

  it('enforces canonical customer emails without silently rewriting legacy rows', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260720024500_enforce_customer_email_canonical',
        'migration.sql'
      ),
      'utf8'
    )

    expect(migration.trimStart()).toMatch(/^BEGIN;/)
    expect(migration).toContain('LOCK TABLE "Customer" IN SHARE ROW EXCLUSIVE MODE')
    expect(migration).toContain('GROUP BY lower(btrim("email"))')
    expect(migration).toContain('HAVING COUNT(*) > 1')
    expect(migration).toContain('"email" <> lower(btrim("email"))')
    expect(migration).toContain('RAISE EXCEPTION')
    expect(migration).toContain('CONSTRAINT "Customer_email_canonical_check"')
    expect(migration).toContain('CHECK ("email" = lower(btrim("email"))')
    expect(migration.trimEnd()).toMatch(/COMMIT;$/)
    expect(migration).not.toMatch(/UPDATE\s+"Customer"/i)
    expect(migration).not.toMatch(/DELETE\s+FROM\s+"Customer"/i)
  })

  it('should have Reservation model defined', () => {
    expect(schemaContent).toContain('model Reservation {')
  })

  it('persists the reception staff assigned to a reservation', () => {
    expect(schemaContent).toMatch(/receptionStaffId\s+String\?/)
    expect(schemaContent).toContain('receptionStaff')
    const migration = readFileSync(
      join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260829120000_add_reservation_reception_staff',
        'migration.sql'
      ),
      'utf8'
    )
    expect(migration).toContain('ADD COLUMN "receptionStaffId" TEXT')
    expect(migration).toContain('Reservation_receptionStaffId_fkey')
  })

  it('persists up to three ordered course snapshots on a reservation', () => {
    expect(schemaContent).toMatch(/courseItems\s+Json\?/)
    const migration = readFileSync(
      join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260830090000_add_reservation_course_items',
        'migration.sql'
      ),
      'utf8'
    )
    expect(migration).toContain('ADD COLUMN "courseItems" JSONB')
  })

  it('should have CoursePrice model defined', () => {
    expect(schemaContent).toContain('model CoursePrice {')
  })

  it('should have OptionPrice model defined', () => {
    expect(schemaContent).toContain('model OptionPrice {')
  })

  it('should have Review model defined', () => {
    expect(schemaContent).toContain('model Review {')
  })

  it('should have proper database provider', () => {
    expect(schemaContent).toMatch(/provider\s*=\s*"postgresql"/)
  })

  it('generates the Prisma engine required by the VPS runtime', () => {
    expect(schemaContent).toContain('binaryTargets = ["native", "debian-openssl-3.0.x"]')
  })

  it('keeps the baseline index migration idempotent after the rebased schema', () => {
    const baselineMigration = readFileSync(
      join(process.cwd(), 'prisma', 'migrations', '20260121013000_baseline', 'migration.sql'),
      'utf8'
    )

    expect(baselineMigration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "Cast_loginEmail_key"')
  })

  it('keeps an idempotent legacy source-to-target ID mapping for audited imports', () => {
    expect(schemaContent).toContain('model LegacyMigrationMapping {')
    expect(schemaContent).toMatch(/sourceKey\s+String/)
    expect(schemaContent).toMatch(/legacyEntity\s+String/)
    expect(schemaContent).toMatch(/legacyId\s+String/)
    expect(schemaContent).toMatch(/targetId\s+String/)
    expect(schemaContent).toMatch(/sourceHash\s+String/)
    expect(schemaContent).toContain('@@unique([sourceKey, legacyEntity, legacyId])')
  })

  it('stores one immutable preview-import provenance ledger per legacy source', () => {
    const runModel = schemaContent.match(/model LegacyMigrationRun \{[\s\S]*?\n\}/u)?.[0]
    const mappingModel = schemaContent.match(/model LegacyMigrationMapping \{[\s\S]*?\n\}/u)?.[0]
    expect(runModel).toBeDefined()
    expect(mappingModel).toBeDefined()
    if (!runModel || !mappingModel) return
    expect(runModel).toMatch(/sourceKey\s+String\s+@unique/)
    expect(runModel).toMatch(/targetId\s+String/)
    expect(runModel).toMatch(/cutoffAt\s+DateTime/)
    expect(runModel).toMatch(/migrationManifestSha256\s+String/)
    expect(runModel).toMatch(/canonicalExportSha256\s+String/)
    expect(runModel).toMatch(/snapshotManifestSha256\s+String/)
    expect(runModel).toMatch(/extractorVersion\s+String/)
    expect(runModel).toMatch(/transformationPolicyVersion\s+String/)
    expect(runModel).toMatch(/canonicalDigest\s+String/)
    expect(runModel).toMatch(/migrationVersion\s+Int\s+@default\(1\)/)
    expect(runModel).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\)/)
    expect(runModel).toMatch(/mappings\s+LegacyMigrationMapping\[\]/)
    expect(runModel).not.toContain('updatedAt')
    expect(mappingModel).toMatch(
      /run\s+LegacyMigrationRun\s+@relation\(fields: \[sourceKey\], references: \[sourceKey\], onDelete: Restrict, onUpdate: Restrict\)/
    )

    const migration = readFileSync(
      join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260720033000_add_legacy_migration_run',
        'migration.sql'
      ),
      'utf8'
    )
    expect(migration).toContain('CREATE TABLE "LegacyMigrationRun"')
    expect(migration).toContain('"sourceKey" TEXT NOT NULL')
    expect(migration).toContain('"targetId" TEXT NOT NULL')
    expect(migration).toContain('"cutoffAt" TIMESTAMP(3) NOT NULL')
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "LegacyMigrationRun_sourceKey_key" ON "LegacyMigrationRun"("sourceKey")'
    )
    expect(migration.trimStart()).toMatch(/^BEGIN;/u)
    expect(migration).toContain('LOCK TABLE "LegacyMigrationMapping" IN SHARE ROW EXCLUSIVE MODE')
    expect(migration).toContain('IF EXISTS (SELECT 1 FROM "LegacyMigrationMapping")')
    expect(migration).toContain('RAISE EXCEPTION')
    expect(migration.indexOf('LOCK TABLE')).toBeLessThan(
      migration.indexOf('CREATE TABLE "LegacyMigrationRun"')
    )
    expect(migration).toContain('CONSTRAINT "LegacyMigrationRun_migrationVersion_check"')
    expect(migration).toContain('CONSTRAINT "LegacyMigrationRun_canonicalDigest_check"')
    expect(migration).toContain('CONSTRAINT "LegacyMigrationRun_extractorVersion_check"')
    expect(migration).toContain('CONSTRAINT "LegacyMigrationRun_transformationPolicyVersion_check"')
    expect(migration).toContain('CONSTRAINT "LegacyMigrationMapping_sourceHash_check"')
    expect(migration).toContain('CONSTRAINT "LegacyMigrationMapping_migrationVersion_check"')
    expect(migration).toContain('CONSTRAINT "LegacyMigrationMapping_sourceKey_fkey"')
    expect(migration).toContain('ON DELETE RESTRICT ON UPDATE RESTRICT')
    expect(migration).toContain('CREATE TRIGGER "LegacyMigrationRun_immutable"')
    expect(migration).toContain('CREATE TRIGGER "LegacyMigrationMapping_immutable"')
    expect(migration.trimEnd()).toMatch(/COMMIT;$/u)
    expect(migration).not.toMatch(/UPDATE\s+"LegacyMigration(?:Run|Mapping)"\s+SET/iu)
    expect(migration).not.toMatch(/DELETE\s+FROM\s+"LegacyMigration(?:Run|Mapping)"/iu)
  })

  it('models explicit store assignments for non-super-admin access control', () => {
    expect(schemaContent).toContain('model AdminStoreAssignment {')
    expect(schemaContent).toMatch(/adminId\s+String/)
    expect(schemaContent).toMatch(/storeId\s+String/)
    expect(schemaContent).toContain('@@id([adminId, storeId])')
    expect(schemaContent).toMatch(/storeAssignments\s+AdminStoreAssignment\[\]/)
    expect(schemaContent).toMatch(/adminAssignments\s+AdminStoreAssignment\[\]/)
  })

  it('models multi-store customer assignments and backfills only evidenced or unambiguous membership', () => {
    const customerModel = schemaContent.match(/model Customer \{[\s\S]*?\n\}/u)?.[0]
    const storeModel = schemaContent.match(/model Store \{[\s\S]*?\n\}/u)?.[0]
    const assignmentModel = schemaContent.match(
      /model CustomerStoreAssignment \{[\s\S]*?\n\}/u
    )?.[0]

    expect(customerModel).toMatch(/storeAssignments\s+CustomerStoreAssignment\[\]/)
    expect(storeModel).toMatch(/customerAssignments\s+CustomerStoreAssignment\[\]/)
    expect(assignmentModel).toMatch(/customerId\s+String/)
    expect(assignmentModel).toMatch(/storeId\s+String/)
    expect(assignmentModel).toContain('@@id([customerId, storeId])')
    expect(assignmentModel).toContain('@@index([storeId])')
    expect(assignmentModel).toMatch(/onDelete: Cascade/)

    const migration = readFileSync(
      join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260815010000_add_customer_store_assignments',
        'migration.sql'
      ),
      'utf8'
    )

    expect(migration.trimStart()).toMatch(/^BEGIN;/u)
    expect(migration).toContain('CREATE TABLE "CustomerStoreAssignment"')
    expect(migration).toContain('PRIMARY KEY ("customerId", "storeId")')
    expect(migration).toMatch(
      /SELECT DISTINCT reservation\."customerId", reservation\."storeId"[\s\S]*FROM "Reservation" AS reservation/u
    )
    expect(migration).toContain('HAVING COUNT(*) = 1')
    expect(migration).toContain('ON CONFLICT ("customerId", "storeId") DO NOTHING')
    expect(migration).toContain('ON DELETE CASCADE ON UPDATE CASCADE')
    expect(migration.trimEnd()).toMatch(/COMMIT;$/u)
    expect(migration).not.toMatch(/UPDATE\s+"Customer"/iu)
    expect(migration).not.toMatch(/DELETE\s+FROM\s+"Customer"/iu)
  })

  it('prevents duplicate point events for the same reservation and event type', () => {
    expect(schemaContent).toContain(
      '@@unique([reservationId, type], map: "unique_reservation_point_event")'
    )

    const migration = readFileSync(
      join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260719235500_add_reservation_point_event_uniqueness',
        'migration.sql'
      ),
      'utf8'
    )
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "unique_reservation_point_event" ON "CustomerPointHistory"("reservationId", "type")'
    )
  })

  it('stores only one-time hashed LINE registration credentials and enforces unique LINE links', () => {
    expect(schemaContent).toMatch(/lineUserId\s+String\?\s+@unique/)
    expect(schemaContent).toContain('model CastLineRegistrationToken {')
    expect(schemaContent).toMatch(/castId\s+String\s+@unique/)
    expect(schemaContent).toMatch(/tokenHash\s+String\s+@unique/)
    expect(schemaContent).toMatch(/expiresAt\s+DateTime/)
    expect(schemaContent).toMatch(/usedAt\s+DateTime\?/)

    const migration = readFileSync(
      join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260720010000_secure_line_cast_registration',
        'migration.sql'
      ),
      'utf8'
    )

    expect(migration).toContain('HAVING COUNT(*) > 1')
    expect(migration).toContain('btrim("lineUserId") = \'\'')
    expect(migration).toContain('GROUP BY btrim("lineUserId")')
    expect(migration).toContain('CONSTRAINT "Cast_lineUserId_normalized_check"')
    expect(migration).toContain('RAISE EXCEPTION')
    expect(migration.trimStart()).toMatch(/^BEGIN;/)
    expect(migration).toContain('LOCK TABLE "Cast" IN SHARE ROW EXCLUSIVE MODE')
    expect(migration.trimEnd()).toMatch(/COMMIT;$/)
    expect(migration).toContain('CREATE UNIQUE INDEX "Cast_lineUserId_key"')
    expect(migration).not.toMatch(/DELETE\s+FROM\s+"Cast"/i)
    expect(migration).not.toMatch(/UPDATE\s+"Cast"/i)
  })

  it('enforces reservation-bound payment integrity without deleting legacy rows', () => {
    expect(schemaContent).toMatch(/paymentTransactions\s+PaymentTransaction\[\]/)
    expect(schemaContent).toMatch(
      /customer\s+Customer\?\s+@relation\(fields: \[customerId\], references: \[id\], onDelete: SetNull\)/
    )
    expect(schemaContent).toMatch(
      /reservation\s+Reservation\?\s+@relation\(fields: \[reservationId\], references: \[id\], onDelete: SetNull\)/
    )
    const migration = readFileSync(
      join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260720020000_enforce_payment_integrity',
        'migration.sql'
      ),
      'utf8'
    )

    expect(migration.indexOf('BEGIN;')).toBeLessThan(migration.indexOf('LOCK TABLE'))
    expect(migration).toContain('LOCK TABLE "PaymentTransaction" IN SHARE ROW EXCLUSIVE MODE')
    expect(migration).toMatch(
      /CREATE UNIQUE INDEX "PaymentTransaction_one_active_payment_per_reservation"[\s\S]*?WHERE "reservationId" IS NOT NULL\s+AND "type" = 'payment'\s+AND "status" IN \('pending', 'processing', 'completed'\)/
    )
    expect(migration).toContain('HAVING COUNT(*) > 1')
    expect(migration).toContain('RAISE EXCEPTION')
    expect(migration).toContain(
      'LEFT JOIN "Customer" AS customer ON customer."id" = payment."customerId"'
    )
    expect(migration).toContain(
      'LEFT JOIN "Reservation" AS reservation ON reservation."id" = payment."reservationId"'
    )
    expect(migration).toContain('payment."customerId" IS NOT NULL')
    expect(migration).toContain('payment."reservationId" IS NOT NULL')
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "PaymentTransaction_one_active_payment_per_reservation"'
    )
    expect(migration).toContain('PaymentTransaction_customerId_fkey')
    expect(migration).toContain('PaymentTransaction_reservationId_fkey')
    expect(migration.trimEnd()).toMatch(/COMMIT;$/)
    expect(migration).not.toMatch(/DELETE\s+FROM/i)
    expect(migration).not.toMatch(/UPDATE\s+"PaymentTransaction"/i)
  })

  it('records partial settlement allocations against the same reservation', () => {
    const allocationModel = schemaContent.match(
      /model SettlementPaymentReservation \{[\s\S]*?\n\}/u
    )?.[0]
    expect(allocationModel).toBeDefined()
    expect(allocationModel).toContain('allocatedAmount')
    expect(allocationModel).toContain('@@index([reservationId])')
    expect(allocationModel).not.toMatch(/@@unique\(\[reservationId\]/)

    const uniqueMigration = readFileSync(
      join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260814193000_enforce_settlement_allocation_integrity',
        'migration.sql'
      ),
      'utf8'
    )
    expect(uniqueMigration.trimStart()).toMatch(/^BEGIN;/u)
    expect(uniqueMigration).toContain(
      'LOCK TABLE "SettlementPaymentReservation" IN SHARE ROW EXCLUSIVE MODE'
    )
    expect(uniqueMigration).toContain(
      'CREATE UNIQUE INDEX "SettlementPaymentReservation_reservationId_key"'
    )

    const partialMigration = readFileSync(
      join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260822090000_meeting_ops_requirements',
        'migration.sql'
      ),
      'utf8'
    )
    expect(partialMigration).toContain(
      'DROP INDEX IF EXISTS "SettlementPaymentReservation_reservationId_key"'
    )
    expect(partialMigration).toContain('allocatedAmount')
  })

  it('persists non-sensitive card references and free-text cancellation reasons', () => {
    const reservationModel = schemaContent.match(/model Reservation \{[\s\S]*?\n\}/u)?.[0]
    expect(reservationModel).toBeDefined()
    expect(reservationModel).toMatch(/paymentReference\s+String\?/)
    expect(reservationModel).toMatch(/cancellationReason\s+String\?/)

    const migration = readFileSync(
      join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260814200000_add_reservation_payment_and_cancellation_details',
        'migration.sql'
      ),
      'utf8'
    )
    expect(migration).toContain('ADD COLUMN "paymentReference" TEXT')
    expect(migration).toContain('ADD COLUMN "cancellationReason" TEXT')
    expect(migration).not.toMatch(/DROP\s+(?:TABLE|COLUMN)/iu)
    expect(migration).not.toMatch(/DELETE\s+FROM/iu)
  })
})

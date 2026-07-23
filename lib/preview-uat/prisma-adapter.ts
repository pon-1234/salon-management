/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md empty isolated preview transaction gate
 * @related_to   setup.ts validates operator input and builds the synthetic fixture
 * @known_issues PostgreSQL marker settings must be provisioned independently before this adapter runs
 */
import { Prisma, type PrismaClient } from '@prisma/client'

import {
  PREVIEW_UAT_EMPTY_TABLES,
  PreviewUatSetupError,
  assertPreviewUatTargetIdentity,
  type PreviewUatDatabase,
  type PreviewUatFixture,
  type PreviewUatSetupSummary,
  type PreviewUatTargetIdentity,
} from './setup'

type PreviewUatPrismaClient = Pick<PrismaClient, '$queryRaw' | '$transaction' | '$disconnect'>

const TRANSACTION_MAX_WAIT_MS = 60_000
const TRANSACTION_TIMEOUT_MS = 120_000

function identityQuery() {
  return Prisma.sql`
    SELECT
      current_database() AS "databaseName",
      current_setting('salon.environment', true) AS "environment",
      current_setting('salon.target_id', true) AS "marker"
  `
}

const EMPTY_COUNTS_QUERY = `SELECT ${PREVIEW_UAT_EMPTY_TABLES.map(
  (table) => `(SELECT COUNT(*)::bigint FROM "${table}") AS "${table}"`
).join(', ')}`

function parseCount(value: unknown): bigint | null {
  if (typeof value === 'bigint' && value >= BigInt(0)) return value
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    return BigInt(value)
  }
  if (typeof value === 'string' && /^(?:0|[1-9][0-9]*)$/u.test(value)) {
    return BigInt(value)
  }
  return null
}

function assertCompletelyEmpty(rows: Array<Record<string, unknown>>): void {
  if (rows.length !== 1) {
    throw new PreviewUatSetupError('PREVIEW_UAT_DATABASE_NOT_EMPTY')
  }
  const counts = rows[0]
  for (const table of PREVIEW_UAT_EMPTY_TABLES) {
    const count = parseCount(counts[table])
    if (count === null || count !== BigInt(0)) {
      throw new PreviewUatSetupError('PREVIEW_UAT_DATABASE_NOT_EMPTY')
    }
  }
}

async function createExact(
  expectedCount: number,
  operation: () => Promise<{ count: number }>
): Promise<void> {
  const result = await operation()
  if (result.count !== expectedCount) {
    throw new PreviewUatSetupError('PREVIEW_UAT_WRITE_FAILED')
  }
}

async function writeFixture(
  transaction: Prisma.TransactionClient,
  fixture: PreviewUatFixture
): Promise<PreviewUatSetupSummary> {
  await createExact(fixture.stores.length, () =>
    transaction.store.createMany({ data: fixture.stores })
  )
  await createExact(fixture.storeSettings.length, () =>
    transaction.storeSettings.createMany({ data: fixture.storeSettings })
  )
  await createExact(fixture.admins.length, () =>
    transaction.admin.createMany({ data: fixture.admins })
  )
  await createExact(fixture.adminStoreAssignments.length, () =>
    transaction.adminStoreAssignment.createMany({ data: fixture.adminStoreAssignments })
  )
  await createExact(fixture.customers.length, () =>
    transaction.customer.createMany({ data: fixture.customers })
  )
  await createExact(fixture.courses.length, () =>
    transaction.coursePrice.createMany({ data: fixture.courses })
  )
  await createExact(fixture.options.length, () =>
    transaction.optionPrice.createMany({ data: fixture.options })
  )
  await createExact(fixture.areas.length, () =>
    transaction.areaInfo.createMany({ data: fixture.areas })
  )
  await createExact(fixture.stations.length, () =>
    transaction.stationInfo.createMany({ data: fixture.stations })
  )
  await createExact(fixture.hotels.length, () =>
    transaction.hotelSettings.createMany({ data: fixture.hotels })
  )
  await createExact(fixture.hotelServiceAreas.length, () =>
    transaction.hotelServiceArea.createMany({ data: fixture.hotelServiceAreas })
  )
  await createExact(fixture.hotelRates.length, () =>
    transaction.hotelRate.createMany({ data: fixture.hotelRates })
  )
  await createExact(fixture.designationFees.length, () =>
    transaction.designationFee.createMany({ data: fixture.designationFees })
  )
  await createExact(fixture.casts.length, () =>
    transaction.cast.createMany({ data: fixture.casts })
  )
  await createExact(fixture.castOptionSettings.length, () =>
    transaction.castOptionSetting.createMany({ data: fixture.castOptionSettings })
  )
  await createExact(fixture.castSchedules.length, () =>
    transaction.castSchedule.createMany({ data: fixture.castSchedules })
  )
  await createExact(fixture.reservations.length, () =>
    transaction.reservation.createMany({ data: fixture.reservations })
  )
  await createExact(fixture.reservationOptions.length, () =>
    transaction.reservationOption.createMany({ data: fixture.reservationOptions })
  )
  await createExact(fixture.pointHistories.length, () =>
    transaction.customerPointHistory.createMany({ data: fixture.pointHistories })
  )
  await createExact(fixture.reviews.length, () =>
    transaction.review.createMany({ data: fixture.reviews })
  )
  await createExact(fixture.messages.length, () =>
    transaction.message.createMany({ data: fixture.messages })
  )

  return {
    stores: fixture.stores.length,
    admins: fixture.admins.length,
    customers: fixture.customers.length,
    casts: fixture.casts.length,
    reservations: fixture.reservations.length,
    options: fixture.options.length,
    areas: fixture.areas.length,
    stations: fixture.stations.length,
    hotels: fixture.hotels.length,
    hotelServiceAreas: fixture.hotelServiceAreas.length,
    hotelRates: fixture.hotelRates.length,
    reservationOptions: fixture.reservationOptions.length,
  }
}

async function readIdentity(
  query: (query: Prisma.Sql) => Promise<PreviewUatTargetIdentity[]>
): Promise<PreviewUatTargetIdentity> {
  const rows = await query(identityQuery())
  if (rows.length !== 1) {
    throw new PreviewUatSetupError('PREVIEW_UAT_TARGET_REJECTED')
  }
  return rows[0]
}

/** Creates the read-only preflight and single Serializable synthetic-fixture write boundary. */
export function createPrismaPreviewUatDatabase(client: PreviewUatPrismaClient): PreviewUatDatabase {
  return {
    async readTargetIdentity() {
      try {
        return await readIdentity((query) => client.$queryRaw<PreviewUatTargetIdentity[]>(query))
      } catch (error) {
        if (error instanceof PreviewUatSetupError) throw error
        throw new PreviewUatSetupError('PREVIEW_UAT_TARGET_REJECTED')
      }
    },

    async createSyntheticFixture(expectedIdentity, fixture) {
      try {
        return await client.$transaction(
          async (transaction) => {
            await transaction.$executeRaw(
              Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${expectedIdentity.marker}, 0))`
            )
            const actualIdentity = await readIdentity((query) =>
              transaction.$queryRaw<PreviewUatTargetIdentity[]>(query)
            )
            assertPreviewUatTargetIdentity(actualIdentity, expectedIdentity)

            const countRows =
              await transaction.$queryRawUnsafe<Array<Record<string, unknown>>>(EMPTY_COUNTS_QUERY)
            assertCompletelyEmpty(countRows)
            return writeFixture(transaction, fixture)
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            maxWait: TRANSACTION_MAX_WAIT_MS,
            timeout: TRANSACTION_TIMEOUT_MS,
          }
        )
      } catch (error) {
        if (error instanceof PreviewUatSetupError) throw error
        throw new PreviewUatSetupError('PREVIEW_UAT_WRITE_FAILED')
      }
    },

    disconnect: () => client.$disconnect(),
  }
}

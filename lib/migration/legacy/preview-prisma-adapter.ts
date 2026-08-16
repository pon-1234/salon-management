/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md Prisma preview persistence adapter
 * @related_to   preview-persistence.ts owns orchestration and fail-closed idempotency checks
 * @known_issues The PostgreSQL marker settings must be provisioned outside the application
 */
import { randomBytes } from 'node:crypto'

import { Prisma, type PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

import {
  isLegacyPreviewDisabledCredential,
  type LegacyPreviewAggregateCounts,
  type LegacyPreviewDisabledCredentialFactory,
  type LegacyPreviewMapping,
  type LegacyPreviewPersistencePort,
  type LegacyPreviewRunProvenance,
  type LegacyPreviewStoreProjection,
  type LegacyPreviewStoredRun,
  type LegacyPreviewStoredTarget,
  type LegacyPreviewTargetIdentity,
  type LegacyPreviewTargetRow,
  type LegacyPreviewTransactionPort,
} from './preview-persistence'
import { LEGACY_ENTITY_NAMES, type LegacyEntityName } from './types'

const DISABLED_CREDENTIAL_PREFIX = '!legacy-preview-disabled!'
const LEGACY_PREVIEW_TRANSACTION_MAX_WAIT_MS = 60_000
const LEGACY_PREVIEW_TRANSACTION_TIMEOUT_MS = 1_800_000

type PrismaLegacyPreviewClient = Pick<PrismaClient, '$transaction'>

export class BcryptLegacyPreviewDisabledCredentialFactory
  implements LegacyPreviewDisabledCredentialFactory
{
  constructor(private readonly cost = 12) {
    if (!Number.isInteger(cost) || cost < 4 || cost > 31) {
      throw new Error('[legacy preview credential] bcrypt cost must be between 4 and 31.')
    }
  }

  async createDisabledCredential(): Promise<string> {
    const unknownSecret = randomBytes(32).toString('base64url')
    const bcryptHash = await hash(unknownSecret, this.cost)
    return `${DISABLED_CREDENTIAL_PREFIX}${bcryptHash}`
  }
}

export function createPrismaLegacyPreviewPersistence(
  client: PrismaLegacyPreviewClient
): LegacyPreviewPersistencePort {
  return {
    withSerializableTransaction: <Result>(
      operation: (transaction: LegacyPreviewTransactionPort) => Promise<Result>
    ) =>
      client.$transaction(
        (transaction) => operation(new PrismaLegacyPreviewTransaction(transaction)),
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: LEGACY_PREVIEW_TRANSACTION_MAX_WAIT_MS,
          timeout: LEGACY_PREVIEW_TRANSACTION_TIMEOUT_MS,
        }
      ),
  }
}

class PrismaLegacyPreviewTransaction implements LegacyPreviewTransactionPort {
  constructor(private readonly transaction: Prisma.TransactionClient) {}

  async acquireSourceLock(sourceKey: string): Promise<void> {
    await this.transaction.$executeRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${sourceKey}, 0))`
    )
  }

  async readTargetIdentity(): Promise<LegacyPreviewTargetIdentity> {
    const rows = await this.transaction.$queryRaw<LegacyPreviewTargetIdentity[]>(Prisma.sql`
      SELECT
        current_database() AS "databaseName",
        current_setting('salon.environment', true) AS "environment",
        current_setting('salon.target_id', true) AS "marker"
    `)
    if (rows.length !== 1) {
      throw new Error('[legacy preview persistence] TARGET_IDENTITY_UNAVAILABLE')
    }
    return rows[0]
  }

  async readMappings(sourceKey: string): Promise<LegacyPreviewMapping[]> {
    const rows = await this.transaction.legacyMigrationMapping.findMany({
      where: { sourceKey },
      select: {
        sourceKey: true,
        legacyEntity: true,
        legacyId: true,
        targetId: true,
        sourceHash: true,
        migrationVersion: true,
      },
      orderBy: [{ legacyEntity: 'asc' }, { legacyId: 'asc' }],
    })

    return rows.map((row) => {
      if (!isLegacyEntityName(row.legacyEntity)) {
        throw new Error('[legacy preview persistence] UNEXPECTED_MAPPING_ENTITY')
      }
      return { ...row, legacyEntity: row.legacyEntity }
    })
  }

  async readRun(sourceKey: string): Promise<LegacyPreviewStoredRun | null> {
    const run = await this.transaction.legacyMigrationRun.findUnique({
      where: { sourceKey },
      select: {
        sourceKey: true,
        targetId: true,
        cutoffAt: true,
        migrationManifestSha256: true,
        canonicalExportSha256: true,
        snapshotManifestSha256: true,
        extractorVersion: true,
        transformationPolicyVersion: true,
        canonicalDigest: true,
        migrationVersion: true,
        createdAt: true,
      },
    })
    return run
      ? {
          ...run,
          cutoffAt: run.cutoffAt.toISOString(),
          createdAt: run.createdAt.toISOString(),
        }
      : null
  }

  async readAggregateCounts(): Promise<LegacyPreviewAggregateCounts> {
    const [
      stores,
      courses,
      casts,
      customers,
      castSchedules,
      reservations,
      pointHistories,
      mappings,
      runs,
    ] = await Promise.all([
      this.transaction.store.count(),
      this.transaction.coursePrice.count(),
      this.transaction.cast.count(),
      this.transaction.customer.count(),
      this.transaction.castSchedule.count(),
      this.transaction.reservation.count(),
      this.transaction.customerPointHistory.count(),
      this.transaction.legacyMigrationMapping.count(),
      this.transaction.legacyMigrationRun.count(),
    ])
    return {
      stores,
      courses,
      casts,
      customers,
      castSchedules,
      reservations,
      pointHistories,
      mappings,
      runs,
    }
  }

  async readStore(targetId: string): Promise<LegacyPreviewStoreProjection | null> {
    return this.transaction.store.findUnique({
      where: { id: targetId },
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
  }

  async readTarget(
    entity: LegacyPreviewTargetRow['entity'],
    targetId: string
  ): Promise<LegacyPreviewStoredTarget | null> {
    switch (entity) {
      case 'courses':
        return this.readCourse(targetId)
      case 'casts':
        return this.readCast(targetId)
      case 'customers':
        return this.readCustomer(targetId)
      case 'castSchedules':
        return this.readCastSchedule(targetId)
      case 'reservations':
        return this.readReservation(targetId)
      case 'pointHistories':
        return this.readPointHistory(targetId)
    }
  }

  async findNaturalKeyConflict(row: LegacyPreviewTargetRow): Promise<string | null> {
    switch (row.entity) {
      case 'customers': {
        const conflict = await this.transaction.customer.findFirst({
          where: {
            OR: [{ email: row.data.email }, { phone: row.data.phone }],
          },
          select: { id: true },
        })
        return conflict?.id ?? null
      }
      case 'castSchedules': {
        const conflict = await this.transaction.castSchedule.findUnique({
          where: {
            castId_date: { castId: row.data.castId, date: new Date(row.data.date) },
          },
          select: { id: true },
        })
        return conflict?.id ?? null
      }
      case 'pointHistories': {
        const sourceConflict = await this.transaction.customerPointHistory.findUnique({
          where: { sourceHistoryId: row.data.sourceHistoryId },
          select: { id: true },
        })
        if (sourceConflict) return sourceConflict.id
        if (row.data.reservationId === null) return null
        const reservationConflict = await this.transaction.customerPointHistory.findUnique({
          where: {
            reservationId_type: {
              reservationId: row.data.reservationId,
              type: row.data.type,
            },
          },
          select: { id: true },
        })
        return reservationConflict?.id ?? null
      }
      case 'courses':
      case 'casts':
      case 'reservations':
        return null
    }
  }

  async createTarget(
    row: LegacyPreviewTargetRow,
    customerCredential: string | null
  ): Promise<void> {
    switch (row.entity) {
      case 'courses':
        await this.transaction.coursePrice.create({
          data: {
            ...row.data,
            archivedAt: toDate(row.data.archivedAt),
          },
        })
        return
      case 'casts':
        await this.transaction.cast.create({
          data: {
            ...row.data,
            publicProfile: Prisma.JsonNull,
            createdAt: new Date(row.data.createdAt),
            updatedAt: new Date(row.data.updatedAt),
          },
        })
        return
      case 'customers':
        if (!isLegacyPreviewDisabledCredential(customerCredential)) {
          throw new Error('[legacy preview persistence] INVALID_DISABLED_CREDENTIAL')
        }
        await this.transaction.customer.create({
          data: {
            ...row.data,
            password: customerCredential,
            birthDate: new Date(row.data.birthDate),
            createdAt: new Date(row.data.createdAt),
            updatedAt: new Date(row.data.updatedAt),
          },
        })
        return
      case 'castSchedules':
        await this.transaction.castSchedule.create({
          data: {
            ...row.data,
            date: new Date(row.data.date),
            startTime: new Date(row.data.startTime),
            endTime: new Date(row.data.endTime),
          },
        })
        return
      case 'reservations':
        await this.transaction.reservation.create({
          data: {
            ...row.data,
            startTime: new Date(row.data.startTime),
            endTime: new Date(row.data.endTime),
            createdAt: new Date(row.data.createdAt),
            updatedAt: new Date(row.data.updatedAt),
          },
        })
        return
      case 'pointHistories':
        await this.transaction.customerPointHistory.create({
          data: {
            ...row.data,
            expiresAt: toDate(row.data.expiresAt),
            createdAt: new Date(row.data.createdAt),
            updatedAt: new Date(row.data.updatedAt),
          },
        })
    }
  }

  async createMapping(mapping: LegacyPreviewMapping): Promise<void> {
    await this.transaction.legacyMigrationMapping.create({ data: mapping })
  }

  async createRun(run: LegacyPreviewRunProvenance): Promise<void> {
    await this.transaction.legacyMigrationRun.create({
      data: { ...run, cutoffAt: new Date(run.cutoffAt) },
    })
  }

  private async readCourse(targetId: string): Promise<LegacyPreviewStoredTarget | null> {
    const row = await this.transaction.coursePrice.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        name: true,
        displayOrder: true,
        duration: true,
        price: true,
        storeShare: true,
        castShare: true,
        description: true,
        isActive: true,
        enableWebBooking: true,
        archivedAt: true,
        storeId: true,
      },
    })
    return row
      ? {
          projection: {
            entity: 'courses',
            data: { ...row, archivedAt: toIso(row.archivedAt) },
          },
          customerCredential: null,
        }
      : null
  }

  private async readCast(targetId: string): Promise<LegacyPreviewStoredTarget | null> {
    const row = await this.transaction.cast.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        name: true,
        nameKana: true,
        age: true,
        height: true,
        bust: true,
        waist: true,
        hip: true,
        type: true,
        image: true,
        images: true,
        description: true,
        publicProfile: true,
        netReservation: true,
        requestAttendanceEnabled: true,
        specialDesignationFee: true,
        regularDesignationFee: true,
        panelDesignationRank: true,
        regularDesignationRank: true,
        workStatus: true,
        availableOptions: true,
        lineUserId: true,
        welfareExpenseRate: true,
        loginEmail: true,
        passwordHash: true,
        storeId: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!row) return null
    return {
      projection: {
        entity: 'casts',
        data: {
          ...row,
          publicProfile: row.publicProfile,
          welfareExpenseRate: row.welfareExpenseRate?.toString() ?? null,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        },
      },
      customerCredential: null,
    }
  }

  private async readCustomer(targetId: string): Promise<LegacyPreviewStoredTarget | null> {
    const row = await this.transaction.customer.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        name: true,
        nameKana: true,
        phone: true,
        email: true,
        password: true,
        birthDate: true,
        memberType: true,
        points: true,
        smsEnabled: true,
        emailNotificationEnabled: true,
        resetToken: true,
        resetTokenExpiry: true,
        emailVerified: true,
        emailVerificationToken: true,
        emailVerificationExpiry: true,
        phoneVerified: true,
        phoneVerifiedAt: true,
        phoneVerificationCode: true,
        phoneVerificationExpiry: true,
        phoneVerificationAttempts: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!row) return null
    const { password, birthDate, createdAt, updatedAt, ...projection } = row
    if (
      typeof projection.nameKana !== 'string' ||
      typeof projection.email !== 'string' ||
      typeof password !== 'string' ||
      birthDate === null
    ) {
      throw new Error('[legacy preview persistence] INCOMPLETE_CUSTOMER_PROFILE')
    }
    return {
      projection: {
        entity: 'customers',
        data: {
          ...projection,
          birthDate: birthDate.toISOString(),
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
        },
      },
      customerCredential: password,
    }
  }

  private async readCastSchedule(targetId: string): Promise<LegacyPreviewStoredTarget | null> {
    const row = await this.transaction.castSchedule.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        castId: true,
        date: true,
        startTime: true,
        endTime: true,
        isAvailable: true,
      },
    })
    return row
      ? {
          projection: {
            entity: 'castSchedules',
            data: {
              ...row,
              date: row.date.toISOString(),
              startTime: row.startTime.toISOString(),
              endTime: row.endTime.toISOString(),
            },
          },
          customerCredential: null,
        }
      : null
  }

  private async readReservation(targetId: string): Promise<LegacyPreviewStoredTarget | null> {
    const row = await this.transaction.reservation.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        customerId: true,
        castId: true,
        courseId: true,
        startTime: true,
        endTime: true,
        status: true,
        settlementStatus: true,
        price: true,
        storeId: true,
        designationType: true,
        designationFee: true,
        transportationFee: true,
        additionalFee: true,
        discountAmount: true,
        welfareExpense: true,
        paymentMethod: true,
        marketingChannel: true,
        storeRevenue: true,
        staffRevenue: true,
        areaId: true,
        stationId: true,
        hotelName: true,
        roomNumber: true,
        entryMemo: true,
        entryReceivedAt: true,
        entryReceivedBy: true,
        entryNotifiedAt: true,
        entryConfirmedAt: true,
        entryReminderSentAt: true,
        locationMemo: true,
        notes: true,
        castCheckedInAt: true,
        castCheckedOutAt: true,
        pointsUsed: true,
        cancellationSource: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!row) return null
    return {
      projection: {
        entity: 'reservations',
        data: normalizeDates(row, [
          'startTime',
          'endTime',
          'entryReceivedAt',
          'entryNotifiedAt',
          'entryConfirmedAt',
          'entryReminderSentAt',
          'castCheckedInAt',
          'castCheckedOutAt',
          'createdAt',
          'updatedAt',
        ]),
      },
      customerCredential: null,
    }
  }

  private async readPointHistory(targetId: string): Promise<LegacyPreviewStoredTarget | null> {
    const row = await this.transaction.customerPointHistory.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        customerId: true,
        type: true,
        amount: true,
        description: true,
        relatedService: true,
        reservationId: true,
        balance: true,
        expiresAt: true,
        isExpired: true,
        sourceHistoryId: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return row
      ? {
          projection: {
            entity: 'pointHistories',
            data: normalizeDates(row, ['expiresAt', 'createdAt', 'updatedAt']),
          },
          customerCredential: null,
        }
      : null
  }
}

function normalizeDates<Row extends Record<string, unknown>>(
  row: Row,
  fields: readonly (keyof Row)[]
): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...row }
  fields.forEach((field) => {
    const value = row[field]
    normalized[String(field)] = value instanceof Date ? value.toISOString() : value
  })
  return normalized
}

function toDate(value: string | null): Date | null {
  return value === null ? null : new Date(value)
}

function toIso(value: Date | null): string | null {
  return value?.toISOString() ?? null
}

function isLegacyEntityName(value: string): value is LegacyEntityName {
  return (LEGACY_ENTITY_NAMES as readonly string[]).includes(value)
}

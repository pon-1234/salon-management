/**
 * @design_doc   Point domain helper utilities
 * @related_to   CustomerPointHistory Prisma model, customer point APIs
 * @known_issues None currently
 */
import { Prisma, PrismaClient } from '@prisma/client'
import { addMonths } from 'date-fns'
import { db } from '@/lib/db'
import { DEFAULT_POINT_CONFIG, PointConfig, PointTransaction } from './types'

export type PrismaPointClient = PrismaClient | Prisma.TransactionClient

/**
 * ポイント加算/減算処理。必ずトランザクションコンテキストで呼び出すこと。
 * @no-test-required reason: Covered by higher level integration tests once APIs/reservations use it.
 */
export async function addPointTransaction(
  transaction: PointTransaction,
  tx: PrismaPointClient = db
): Promise<void> {
  const customer = await tx.customer.findUnique({
    where: { id: transaction.customerId },
    select: { points: true },
  })

  if (!customer) {
    throw new Error('Customer not found')
  }

  const newBalance = customer.points + transaction.amount
  if (newBalance < 0) {
    throw new Error('Insufficient points')
  }

  await tx.customerPointHistory.create({
    data: {
      customerId: transaction.customerId,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      relatedService: transaction.relatedService,
      reservationId: transaction.reservationId,
      balance: newBalance,
      expiresAt: transaction.expiresAt,
      sourceHistoryId: transaction.sourceHistoryId,
    },
  })

  await tx.customer.update({
    where: { id: transaction.customerId },
    data: { points: newBalance },
  })
}

export function calculateEarnedPoints(amount: number, config: PointConfig = DEFAULT_POINT_CONFIG): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0
  }
  return Math.floor(amount * config.earnRate)
}

export function calculateExpiryDate(
  config: PointConfig = DEFAULT_POINT_CONFIG,
  fromDate: Date = new Date()
): Date {
  return addMonths(fromDate, config.expirationMonths)
}

export async function getExpiringPoints(
  customerId: string,
  beforeDate: Date,
  tx: PrismaPointClient = db
) {
  return tx.customerPointHistory.findFirst({
    where: {
      customerId,
      type: 'earned',
      isExpired: false,
      expiresAt: {
        lte: beforeDate,
        gte: new Date(),
      },
    },
    orderBy: {
      expiresAt: 'asc',
    },
  })
}

export function resolvePointConfig(settings?: {
  pointEarnRate?: Prisma.Decimal | number | null
  pointExpirationMonths?: number | null
  pointMinUsage?: number | null
} | null): PointConfig {
  const rawEarnRate = Number(settings?.pointEarnRate ?? 1)
  const earnRate = Number.isFinite(rawEarnRate) ? rawEarnRate / 100 : DEFAULT_POINT_CONFIG.earnRate

  const rawExpiration = Number(settings?.pointExpirationMonths ?? DEFAULT_POINT_CONFIG.expirationMonths)
  const expirationMonths = Number.isFinite(rawExpiration)
    ? Math.max(1, Math.floor(rawExpiration))
    : DEFAULT_POINT_CONFIG.expirationMonths

  const rawMinUsage = Number(settings?.pointMinUsage ?? DEFAULT_POINT_CONFIG.minPointsToUse)
  const minPointsToUse = Number.isFinite(rawMinUsage)
    ? Math.max(0, Math.floor(rawMinUsage))
    : DEFAULT_POINT_CONFIG.minPointsToUse

  return {
    earnRate,
    expirationMonths,
    minPointsToUse,
  }
}

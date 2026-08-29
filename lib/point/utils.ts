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
 * ポイント加算/減算処理。残高の確保と履歴作成を同じトランザクション内で行う。
 */
export async function addPointTransaction(
  transaction: PointTransaction,
  tx: Prisma.TransactionClient
): Promise<void> {
  const amountToReserve = transaction.amount < 0 ? -transaction.amount : 0
  const result = await tx.customer.updateMany({
    where: {
      id: transaction.customerId,
      ...(amountToReserve > 0 ? { points: { gte: amountToReserve } } : {}),
    },
    data: { points: { increment: transaction.amount } },
  })

  if (result.count === 0) {
    const customer = await tx.customer.findUnique({
      where: { id: transaction.customerId },
      select: { id: true },
    })

    if (!customer) {
      throw new Error('Customer not found')
    }

    throw new Error('Insufficient points')
  }

  const customer = await tx.customer.findUnique({
    where: { id: transaction.customerId },
    select: { points: true },
  })

  if (!customer) {
    throw new Error('Customer not found')
  }

  await tx.customerPointHistory.create({
    data: {
      customerId: transaction.customerId,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      relatedService: transaction.relatedService,
      reservationId: transaction.reservationId,
      balance: customer.points,
      expiresAt: transaction.expiresAt,
      sourceHistoryId: transaction.sourceHistoryId,
    },
  })
}

type ReservationPointUsageInput = {
  customerId: string
  reservationId: string
  previousPointsUsed: number
  nextPointsUsed: number
}

/**
 * 予約編集時のポイント利用差分を残高と単一の利用履歴へ原子的に同期する。
 */
export async function syncReservationPointUsage(
  input: ReservationPointUsageInput,
  tx: Prisma.TransactionClient
): Promise<void> {
  const previousPointsUsed = Math.max(0, Math.floor(input.previousPointsUsed))
  const nextPointsUsed = Math.max(0, Math.floor(input.nextPointsUsed))
  const usageDelta = nextPointsUsed - previousPointsUsed

  if (usageDelta !== 0) {
    const result = await tx.customer.updateMany({
      where: {
        id: input.customerId,
        ...(usageDelta > 0 ? { points: { gte: usageDelta } } : {}),
      },
      data: { points: { increment: -usageDelta } },
    })

    if (result.count === 0) {
      const customer = await tx.customer.findUnique({
        where: { id: input.customerId },
        select: { id: true },
      })
      if (!customer) throw new Error('Customer not found')
      throw new Error('Insufficient points')
    }
  }

  const customer = await tx.customer.findUnique({
    where: { id: input.customerId },
    select: { id: true, points: true },
  })
  if (!customer) throw new Error('Customer not found')

  if (nextPointsUsed === 0) {
    await tx.customerPointHistory.deleteMany({
      where: { reservationId: input.reservationId, type: 'used' },
    })
    return
  }

  await tx.customerPointHistory.upsert({
    where: {
      reservationId_type: {
        reservationId: input.reservationId,
        type: 'used',
      },
    },
    create: {
      customerId: input.customerId,
      reservationId: input.reservationId,
      type: 'used',
      amount: -nextPointsUsed,
      description: '予約でポイントを利用',
      balance: customer.points,
    },
    update: {
      amount: -nextPointsUsed,
      description: '予約でポイントを利用',
      balance: customer.points,
    },
  })
}

export function calculateEarnedPoints(
  amount: number,
  config: PointConfig = DEFAULT_POINT_CONFIG
): number {
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

export function resolvePointConfig(
  settings?: {
    pointEarnRate?: Prisma.Decimal | number | null
    pointExpirationMonths?: number | null
    pointMinUsage?: number | null
  } | null
): PointConfig {
  const rawEarnRate = Number(settings?.pointEarnRate ?? 1)
  const earnRate = Number.isFinite(rawEarnRate) ? rawEarnRate / 100 : DEFAULT_POINT_CONFIG.earnRate

  const rawExpiration = Number(
    settings?.pointExpirationMonths ?? DEFAULT_POINT_CONFIG.expirationMonths
  )
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

/**
 * @design_doc   Store-wide payment and settlement ledgers for Ikebukuro operations
 * @related_to   GET /api/admin/settlements, payment-processing and settlement-processing pages
 * @known_issues Yearly nyukin/shukkin archives and SK-DB guarantee rows are outside this extract
 */
import { db } from '@/lib/db'
import { getJstMonthRange } from '@/lib/analytics/server/cast-performance'
import { resolveCastTakeHome } from '@/lib/reservation/take-home'

export type StoreSettlementPendingReservation = {
  id: string
  castId: string
  castName: string
  customerName: string
  courseName: string | null
  startTime: string
  price: number
  staffRevenue: number
  storeRevenue: number
  takeHome: number
  paymentMethod: string | null
  paymentReference: string | null
  settlementStatus: string
}

export type StoreSettlementCastSummary = {
  castId: string
  castName: string
  completedCount: number
  pendingCount: number
  pendingAmount: number
  settledAmount: number
  staffRevenue: number
  storeRevenue: number
  pendingReservations: StoreSettlementPendingReservation[]
}

export type StoreSettlementPaymentRow = {
  id: string
  castId: string
  castName: string
  amount: number
  method: string
  handledBy: string
  paidAt: string
  notes: string | null
  reservationIds: string[]
}

export type StoreLegacyLedgerRow = {
  id: string
  castId: string
  castName: string
  sourceTable: string
  direction: string
  kind: string
  amount: number
  notes: string
  handledBy: string
  occurredAt: string
}

export type StoreSettlementLedger = {
  month: string
  hourlyGuaranteeAmount: number
  casts: StoreSettlementCastSummary[]
  payments: StoreSettlementPaymentRow[]
  legacyEntries: StoreLegacyLedgerRow[]
}

export async function getStoreSettlementLedger(
  storeId: string,
  year: number,
  month: number
): Promise<StoreSettlementLedger> {
  const { start, endExclusive } = getJstMonthRange(year, month)
  const monthKey = `${year}-${String(month).padStart(2, '0')}`

  const [reservations, payments, legacyEntries, settings] = await Promise.all([
    db.reservation.findMany({
      where: {
        storeId,
        status: 'completed',
        startTime: {
          gte: start,
          lt: endExclusive,
        },
      },
      select: {
        id: true,
        castId: true,
        startTime: true,
        status: true,
        settlementStatus: true,
        price: true,
        staffRevenue: true,
        storeRevenue: true,
        welfareExpense: true,
        paymentMethod: true,
        paymentReference: true,
        cast: { select: { id: true, name: true } },
        course: { select: { name: true } },
        customer: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    }),
    db.settlementPayment.findMany({
      where: {
        storeId,
        paidAt: {
          gte: start,
          lt: endExclusive,
        },
      },
      select: {
        id: true,
        castId: true,
        amount: true,
        method: true,
        handledBy: true,
        paidAt: true,
        notes: true,
        cast: { select: { name: true } },
        reservations: { select: { reservationId: true } },
      },
      orderBy: { paidAt: 'desc' },
    }),
    db.castLedgerEntry.findMany({
      where: {
        storeId,
        businessMonth: monthKey,
      },
      select: {
        id: true,
        castId: true,
        sourceTable: true,
        direction: true,
        kind: true,
        amount: true,
        notes: true,
        handledBy: true,
        occurredAt: true,
        cast: { select: { name: true } },
      },
      orderBy: { occurredAt: 'asc' },
    }),
    db.storeSettings.findUnique({
      where: { storeId },
      select: { hourlyGuaranteeAmount: true },
    }),
  ])

  const casts = new Map<string, StoreSettlementCastSummary>()

  for (const reservation of reservations) {
    const castId = reservation.castId ?? reservation.cast?.id
    if (!castId) continue
    const castName = reservation.cast?.name ?? '未設定'
    const staffRevenue = reservation.staffRevenue ?? 0
    const storeRevenue = reservation.storeRevenue ?? 0
    const takeHome = resolveCastTakeHome({
      staffRevenue,
      welfareExpense: reservation.welfareExpense ?? 0,
    })
    const current = casts.get(castId) ?? {
      castId,
      castName,
      completedCount: 0,
      pendingCount: 0,
      pendingAmount: 0,
      settledAmount: 0,
      staffRevenue: 0,
      storeRevenue: 0,
      pendingReservations: [],
    }

    current.completedCount += 1
    current.staffRevenue += staffRevenue
    current.storeRevenue += storeRevenue
    if (reservation.settlementStatus === 'settled') {
      current.settledAmount += storeRevenue
    } else {
      current.pendingCount += 1
      current.pendingAmount += storeRevenue
      current.pendingReservations.push({
        id: reservation.id,
        castId,
        castName,
        customerName: reservation.customer?.name ?? '名前未設定',
        courseName: reservation.course?.name ?? null,
        startTime: reservation.startTime.toISOString(),
        price: reservation.price ?? 0,
        staffRevenue,
        storeRevenue,
        takeHome,
        paymentMethod: reservation.paymentMethod ?? null,
        paymentReference: reservation.paymentReference ?? null,
        settlementStatus: reservation.settlementStatus ?? 'pending',
      })
    }
    casts.set(castId, current)
  }

  return {
    month: monthKey,
    hourlyGuaranteeAmount: settings?.hourlyGuaranteeAmount ?? 0,
    casts: [...casts.values()].sort((left, right) =>
      left.castName.localeCompare(right.castName, 'ja')
    ),
    legacyEntries: legacyEntries.map((entry) => ({
      id: entry.id,
      castId: entry.castId,
      castName: entry.cast?.name ?? '未設定',
      sourceTable: entry.sourceTable,
      direction: entry.direction,
      kind: entry.kind,
      amount: entry.amount,
      notes: entry.notes,
      handledBy: entry.handledBy,
      occurredAt: entry.occurredAt.toISOString(),
    })),
    payments: payments.map((payment) => ({
      id: payment.id,
      castId: payment.castId,
      castName: payment.cast?.name ?? '未設定',
      amount: payment.amount,
      method: payment.method,
      handledBy: payment.handledBy,
      paidAt: payment.paidAt.toISOString(),
      notes: payment.notes,
      reservationIds: payment.reservations.map((rel) => rel.reservationId),
    })),
  }
}

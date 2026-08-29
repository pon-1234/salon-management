/**
 * @design_doc   Reservation API mutation invariants
 * @related_to   Reservation route, Admin store assignments, and customer point ledger
 * @known_issues None currently
 */
import type { Prisma } from '@prisma/client'
import { calculateReservationRevenue } from '@/lib/reservation/revenue'
import { syncReservationPointUsage } from '@/lib/point/utils'

type MutationClient = Pick<Prisma.TransactionClient, 'admin'>

export async function resolveReceptionStaffId(
  tx: MutationClient,
  rawReceptionStaffId: unknown,
  storeId: string
): Promise<string | null> {
  const receptionStaffId =
    typeof rawReceptionStaffId === 'string' && rawReceptionStaffId.trim().length > 0
      ? rawReceptionStaffId.trim()
      : null
  if (!receptionStaffId) return null

  const receptionStaff = await tx.admin.findFirst({
    where: {
      id: receptionStaffId,
      isActive: true,
      OR: [{ role: 'super_admin' }, { storeAssignments: { some: { storeId } } }],
    },
    select: { id: true },
  })
  if (!receptionStaff) {
    throw new Error('指定された受付担当者はこの店舗で利用できません。')
  }
  return receptionStaffId
}

export function calculateRevenueWithPointUsage(
  revenueInput: Parameters<typeof calculateReservationRevenue>[0],
  pointsUsed: number
) {
  const baseRevenue = calculateReservationRevenue(revenueInput)
  if (pointsUsed > baseRevenue.total) {
    throw new Error('ポイント利用数が合計金額を超えています')
  }
  return pointsUsed > 0
    ? calculateReservationRevenue({
        ...revenueInput,
        discountAmount: (revenueInput.discountAmount ?? 0) + pointsUsed,
      })
    : baseRevenue
}

export async function syncUpdatedReservationPointUsage(
  tx: Prisma.TransactionClient,
  previousReservation: { id: string; customerId: string; pointsUsed: number | null },
  requestedPointsUsed: unknown
): Promise<void> {
  if (typeof requestedPointsUsed !== 'number') return
  const nextPointsUsed = Math.max(0, Math.floor(requestedPointsUsed))
  if (nextPointsUsed === (previousReservation.pointsUsed ?? 0)) return

  await syncReservationPointUsage(
    {
      customerId: previousReservation.customerId,
      reservationId: previousReservation.id,
      previousPointsUsed: previousReservation.pointsUsed ?? 0,
      nextPointsUsed,
    },
    tx
  )
}

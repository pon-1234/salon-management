/**
 * @design_doc   Multi-store settlement integrity boundary
 * @related_to   Settlement API routes and reservation settlement state
 * @known_issues Settlement reversal accounting requires a separately approved policy
 */
import { db } from '@/lib/db'
import { SettlementStatus, SettlementPaymentDto } from '@/lib/cast-portal/types'

type UpsertInput = {
  id?: string
  castId: string
  storeId: string
  amount: number
  method: string
  handledBy: string
  paidAt?: string
  notes?: string
  reservationIds: string[]
}

export async function upsertSettlementPayment(input: UpsertInput): Promise<SettlementPaymentDto> {
  const paidAt = input.paidAt ? new Date(input.paidAt) : new Date()
  const reservationIds = [...new Set(input.reservationIds)]

  const payment = await db.$transaction(async (tx) => {
    if (input.id) {
      const existingPayment = await tx.settlementPayment.findFirst({
        where: {
          id: input.id,
          castId: input.castId,
          storeId: input.storeId,
        },
        select: { id: true },
      })

      if (!existingPayment) {
        throw new Error('Settlement payment not found')
      }
    }

    if (reservationIds.length > 0) {
      const matchingReservationCount = await tx.reservation.count({
        where: {
          id: { in: reservationIds },
          castId: input.castId,
          storeId: input.storeId,
        },
      })

      if (matchingReservationCount !== reservationIds.length) {
        throw new Error('Settlement reservation not found')
      }
    }

    const paymentRecord = input.id
      ? await tx.settlementPayment.update({
          where: { id: input.id },
          data: {
            amount: input.amount,
            method: input.method,
            handledBy: input.handledBy,
            paidAt,
            notes: input.notes,
          },
        })
      : await tx.settlementPayment.create({
          data: {
            castId: input.castId,
            storeId: input.storeId,
            amount: input.amount,
            method: input.method,
            handledBy: input.handledBy,
            paidAt,
            notes: input.notes,
          },
        })

    // Clear existing links when updating
    if (input.id) {
      await tx.settlementPaymentReservation.deleteMany({ where: { paymentId: paymentRecord.id } })
    }

    if (reservationIds.length > 0) {
      await tx.settlementPaymentReservation.createMany({
        data: reservationIds.map((reservationId) => ({
          paymentId: paymentRecord.id,
          reservationId,
        })),
      })

      await tx.reservation.updateMany({
        where: {
          id: { in: reservationIds },
          castId: input.castId,
          storeId: input.storeId,
        },
        data: { settlementStatus: 'settled' },
      })
    }

    return paymentRecord
  })

  return mapPaymentDto(payment)
}

export async function listSettlementPayments(castId: string, storeId: string) {
  const payments = await db.settlementPayment.findMany({
    where: { castId, storeId },
    include: {
      reservations: {
        include: {
          reservation: {
            select: {
              id: true,
              startTime: true,
              course: { select: { name: true } },
              staffRevenue: true,
              settlementStatus: true,
            },
          },
        },
      },
    },
    orderBy: { paidAt: 'desc' },
  })

  return payments.map(mapPaymentDto)
}

function mapPaymentDto(payment: any): SettlementPaymentDto {
  return {
    id: payment.id,
    castId: payment.castId,
    storeId: payment.storeId,
    amount: payment.amount,
    method: payment.method,
    handledBy: payment.handledBy,
    paidAt: payment.paidAt.toISOString(),
    notes: payment.notes,
    reservations:
      payment.reservations?.map((rel: any) => ({
        id: rel.reservation.id,
        startTime: rel.reservation.startTime.toISOString(),
        courseName: rel.reservation.course?.name ?? null,
        staffRevenue: rel.reservation.staffRevenue ?? 0,
        settlementStatus: (rel.reservation.settlementStatus as SettlementStatus) ?? 'pending',
      })) ?? [],
  }
}

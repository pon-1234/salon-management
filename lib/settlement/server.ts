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

export class SettlementValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SettlementValidationError'
  }
}

export async function upsertSettlementPayment(input: UpsertInput): Promise<SettlementPaymentDto> {
  const paidAt = input.paidAt ? new Date(input.paidAt) : new Date()
  const reservationIds = [...new Set(input.reservationIds)]

  if (reservationIds.length === 0) {
    throw new SettlementValidationError('At least one settlement reservation is required')
  }
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new SettlementValidationError('Settlement amount must be a positive integer')
  }
  if (Number.isNaN(paidAt.getTime())) {
    throw new SettlementValidationError('Settlement paidAt is invalid')
  }

  const payment = await db.$transaction(async (tx) => {
    let existingReservationIds: string[] = []
    if (input.id) {
      const existingPayment = await tx.settlementPayment.findFirst({
        where: {
          id: input.id,
          castId: input.castId,
          storeId: input.storeId,
        },
        select: {
          id: true,
          reservations: { select: { reservationId: true } },
        },
      })

      if (!existingPayment) {
        throw new SettlementValidationError('Settlement payment not found')
      }

      existingReservationIds = existingPayment.reservations.map(
        (reservation) => reservation.reservationId
      )
    }

    const reservations = await tx.reservation.findMany({
      where: {
        id: { in: reservationIds },
        castId: input.castId,
        storeId: input.storeId,
      },
      select: {
        id: true,
        status: true,
        settlementStatus: true,
        staffRevenue: true,
        settlementPayments: {
          select: { paymentId: true },
        },
      },
    })

    if (reservations.length !== reservationIds.length) {
      throw new SettlementValidationError('Settlement reservation not found')
    }

    const containsIneligibleReservation = reservations.some((reservation) => {
      const belongsToCurrentPayment = reservation.settlementPayments.some(
        ({ paymentId }) => paymentId === input.id
      )
      const belongsToAnotherPayment = reservation.settlementPayments.some(
        ({ paymentId }) => paymentId !== input.id
      )
      return (
        reservation.status !== 'completed' ||
        reservation.staffRevenue === null ||
        belongsToAnotherPayment ||
        (reservation.settlementStatus === 'settled' && !belongsToCurrentPayment)
      )
    })

    if (containsIneligibleReservation) {
      throw new SettlementValidationError('Only completed, unallocated reservations can be settled')
    }

    const expectedAmount = reservations.reduce(
      (sum, reservation) => sum + (reservation.staffRevenue ?? 0),
      0
    )
    if (input.amount !== expectedAmount) {
      throw new SettlementValidationError(
        'Settlement amount must equal selected reservation staff revenue'
      )
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

    if (input.id) {
      await tx.settlementPaymentReservation.deleteMany({ where: { paymentId: paymentRecord.id } })

      const removedReservationIds = existingReservationIds.filter(
        (reservationId) => !reservationIds.includes(reservationId)
      )
      if (removedReservationIds.length > 0) {
        await tx.reservation.updateMany({
          where: {
            id: { in: removedReservationIds },
            castId: input.castId,
            storeId: input.storeId,
          },
          data: { settlementStatus: 'pending' },
        })
      }
    }

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

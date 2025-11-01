import { db } from '@/lib/db'
import { endOfDay, startOfDay } from 'date-fns'
import { Reservation, Prisma } from '@prisma/client'

export const FALLBACK_STORE_ID = 'ikebukuro'

export type ReservationWithRelations = Prisma.ReservationGetPayload<{
  include: {
    area: true
    customer: true
    cast: true
    course: true
    options: true
  }
}>

export async function fetchReservationsBetween(
  storeId: string,
  start: Date,
  end: Date
): Promise<ReservationWithRelations[]> {
  return db.reservation.findMany({
    where: {
      storeId,
      status: { not: 'cancelled' },
      startTime: {
        gte: start,
        lte: end,
      },
    },
    include: {
      area: true,
      customer: true,
      cast: true,
      course: true,
      options: true,
    },
  })
}

export async function fetchAllReservationsForStore(
  storeId: string
): Promise<ReservationWithRelations[]> {
  return db.reservation.findMany({
    where: {
      storeId,
      status: { not: 'cancelled' },
    },
    include: {
      area: true,
      customer: true,
      cast: true,
      course: true,
      options: true,
    },
  })
}

export async function buildCustomerFirstReservationMap(
  storeId: string
): Promise<Map<string, Date>> {
  const firstReservations = await db.reservation.groupBy({
    by: ['customerId'],
    where: {
      storeId,
      status: { not: 'cancelled' },
    },
    _min: {
      startTime: true,
    },
  })

  const map = new Map<string, Date>()
  firstReservations.forEach((entry) => {
    if (entry.customerId && entry._min.startTime) {
      map.set(entry.customerId, entry._min.startTime)
    }
  })
  return map
}

export function normaliseStoreId(storeId?: string | null): string {
  return storeId?.trim() && storeId !== 'undefined' ? storeId : FALLBACK_STORE_ID
}

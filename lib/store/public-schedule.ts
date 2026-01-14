import { addDays, startOfDay } from 'date-fns'
import { format as formatDateFns, formatISO } from 'date-fns'
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'
import { db } from '@/lib/db'

export interface PublicReservationBlock {
  id: string
  startTime: string
  endTime: string
  status: string
}

export interface PublicCastSchedule {
  id: string
  castId: string
  date: string
  startTime: string
  endTime: string
  isAvailable: boolean
  reservations: PublicReservationBlock[]
  cast: {
    id: string
    name: string
    age: number | null
    height: number | null
    bust: string | null
    waist: number | null
    hip: number | null
    type: string | null
    image: string | null
    images: string[]
    panelDesignationRank: number
    workStatus: string | null
  }
}

export interface PublicScheduleDay {
  date: string
  entries: PublicCastSchedule[]
}

const DEFAULT_TIME_ZONE = 'Asia/Tokyo'

function startOfDayInTimeZone(date: Date, timeZone: string): Date {
  const zoned = utcToZonedTime(date, timeZone)
  const start = startOfDay(zoned)
  return zonedTimeToUtc(start, timeZone)
}

function parseDateInput(value: Date | string | null | undefined): Date {
  if (!value) {
    return new Date()
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date() : value
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return new Date()
  }
  return parsed
}

function normalizeCastImage(images: any, image: any) {
  const raw = Array.isArray(images)
    ? images
    : typeof images === 'string'
      ? [images]
      : image
        ? [image]
        : []
  const cleaned = raw.filter((url) => typeof url === 'string' && url.length > 0)
  const primary = cleaned[0] ?? '/images/non-photo.svg'
  return { primary, all: cleaned.length > 0 ? cleaned : [primary] }
}

function normalizeSchedule(
  entry: any,
  reservationsByKey: Map<string, PublicReservationBlock[]>
): PublicCastSchedule {
  const { primary, all } = normalizeCastImage(entry.cast?.images, entry.cast?.image)
  const dateLocal = utcToZonedTime(entry.date, DEFAULT_TIME_ZONE)
  const startLocal = utcToZonedTime(entry.startTime, DEFAULT_TIME_ZONE)
  const endLocal = utcToZonedTime(entry.endTime, DEFAULT_TIME_ZONE)
  const dateKey = formatDateFns(dateLocal, 'yyyy-MM-dd')
  const mapKey = `${entry.castId}_${dateKey}`

  return {
    id: entry.id,
    castId: entry.castId,
    date: formatISO(dateLocal),
    startTime: formatISO(startLocal),
    endTime: formatISO(endLocal),
    isAvailable: entry.isAvailable ?? true,
    reservations: reservationsByKey.get(mapKey) ?? [],
    cast: {
      id: entry.cast?.id ?? entry.castId,
      name: entry.cast?.name ?? '匿名キャスト',
      age: entry.cast?.age ?? null,
      height: entry.cast?.height ?? null,
      bust: entry.cast?.bust ?? null,
      waist: entry.cast?.waist ?? null,
      hip: entry.cast?.hip ?? null,
      type: entry.cast?.type ?? null,
      image: primary,
      images: all,
      panelDesignationRank: entry.cast?.panelDesignationRank ?? 0,
      workStatus: entry.cast?.workStatus ?? null,
    },
  }
}

interface StoreScheduleOptions {
  startDate?: Date | string | null
  days?: number
}

async function fetchStoreScheduleDays(
  storeId: string,
  { startDate, days = 7 }: StoreScheduleOptions
): Promise<PublicScheduleDay[]> {
  try {
    const referenceDate = startDate ? parseDateInput(startDate) : new Date()
    const normalizedDays = Math.max(1, Math.floor(days))
    const start = startOfDayInTimeZone(referenceDate, DEFAULT_TIME_ZONE)
    const rangeEndSource = addDays(referenceDate, normalizedDays)
    const end = startOfDayInTimeZone(rangeEndSource, DEFAULT_TIME_ZONE)

    const schedules = await db.castSchedule.findMany({
      where: {
        cast: { storeId },
        date: {
          gte: start,
          lt: end,
        },
        isAvailable: true,
      },
      include: {
        cast: true,
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    })

    const reservations = await db.reservation.findMany({
      where: {
        storeId,
        status: {
          notIn: ['cancelled'],
        },
        startTime: {
          gte: start,
          lt: end,
        },
      },
      select: {
        id: true,
        castId: true,
        startTime: true,
        endTime: true,
        status: true,
      },
      orderBy: [{ startTime: 'asc' }],
    })

    const reservationMap = new Map<string, PublicReservationBlock[]>()
    reservations.forEach((reservation) => {
      if (!reservation.castId) {
        return
      }
      const dateLocal = utcToZonedTime(reservation.startTime, DEFAULT_TIME_ZONE)
      const dateKey = formatDateFns(dateLocal, 'yyyy-MM-dd')
      const key = `${reservation.castId}_${dateKey}`
      const block: PublicReservationBlock = {
        id: reservation.id,
        startTime: reservation.startTime.toISOString(),
        endTime: reservation.endTime.toISOString(),
        status: reservation.status,
      }
      if (!reservationMap.has(key)) {
        reservationMap.set(key, [block])
      } else {
        reservationMap.get(key)!.push(block)
      }
    })

    const normalized = schedules.map((entry) => normalizeSchedule(entry, reservationMap))
    const grouped = new Map<string, PublicScheduleDay>()

    normalized.forEach((entry) => {
      const dayKey = formatDateFns(utcToZonedTime(new Date(entry.date), DEFAULT_TIME_ZONE), 'yyyy-MM-dd')
      if (!grouped.has(dayKey)) {
        grouped.set(dayKey, { date: entry.date, entries: [] })
      }
      grouped.get(dayKey)?.entries.push(entry)
    })

    const daysResult: PublicScheduleDay[] = Array.from(grouped.values())

    if (daysResult.length < normalizedDays) {
      const totalDays = normalizedDays
      for (let i = 0; i < totalDays; i++) {
        const current = addDays(start, i)
        const dateKey = formatDateFns(utcToZonedTime(current, DEFAULT_TIME_ZONE), 'yyyy-MM-dd')
        if (!grouped.has(dateKey)) {
          daysResult.push({
            date: formatISO(utcToZonedTime(current, DEFAULT_TIME_ZONE)),
            entries: [],
          })
        }
      }
    }

    return daysResult
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, normalizedDays)
  } catch (error) {
    console.error('Failed to fetch store schedule:', error)
    return []
  }
}

export async function getStoreScheduleDays(
  storeId: string,
  options?: StoreScheduleOptions
): Promise<PublicScheduleDay[]> {
  return fetchStoreScheduleDays(storeId, options ?? {})
}

export async function getPublicStoreSchedule(
  storeId: string,
  options?: { days?: number }
): Promise<PublicScheduleDay[]> {
  return fetchStoreScheduleDays(storeId, { days: options?.days })
}

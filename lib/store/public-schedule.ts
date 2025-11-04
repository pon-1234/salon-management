import { addDays, startOfDay } from 'date-fns'
import { format as formatDateFns, formatISO } from 'date-fns'
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'
import { db } from '@/lib/db'

export interface PublicCastSchedule {
  id: string
  castId: string
  date: string
  startTime: string
  endTime: string
  isAvailable: boolean
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

function normalizeCastImage(images: any, image: any) {
  const raw = Array.isArray(images)
    ? images
    : typeof images === 'string'
      ? [images]
      : image
        ? [image]
        : []
  const cleaned = raw.filter((url) => typeof url === 'string' && url.length > 0)
  const primary = cleaned[0] ?? '/placeholder-user.jpg'
  return { primary, all: cleaned.length > 0 ? cleaned : [primary] }
}

function normalizeSchedule(entry: any): PublicCastSchedule {
  const { primary, all } = normalizeCastImage(entry.cast?.images, entry.cast?.image)
  const dateLocal = utcToZonedTime(entry.date, DEFAULT_TIME_ZONE)
  const startLocal = utcToZonedTime(entry.startTime, DEFAULT_TIME_ZONE)
  const endLocal = utcToZonedTime(entry.endTime, DEFAULT_TIME_ZONE)

  return {
    id: entry.id,
    castId: entry.castId,
    date: formatISO(dateLocal),
    startTime: formatISO(startLocal),
    endTime: formatISO(endLocal),
    isAvailable: entry.isAvailable ?? true,
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

export async function getPublicStoreSchedule(
  storeId: string,
  options?: { days?: number }
): Promise<PublicScheduleDay[]> {
  try {
    const days = options?.days ?? 7
    const start = startOfDayInTimeZone(new Date(), DEFAULT_TIME_ZONE)
    const end = startOfDayInTimeZone(addDays(new Date(), days), DEFAULT_TIME_ZONE)

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

    const normalized = schedules.map(normalizeSchedule)
    const grouped = new Map<string, PublicScheduleDay>()

    normalized.forEach((entry) => {
      const dayKey = formatDateFns(utcToZonedTime(new Date(entry.date), DEFAULT_TIME_ZONE), 'yyyy-MM-dd')
      if (!grouped.has(dayKey)) {
        grouped.set(dayKey, { date: entry.date, entries: [] })
      }
      grouped.get(dayKey)?.entries.push(entry)
    })

    const daysResult: PublicScheduleDay[] = Array.from(grouped.values())

    // Ensure we return at least day slots for upcoming days even if empty
    if (daysResult.length < days) {
      for (let i = 0; i < days; i++) {
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
      .slice(0, days)
  } catch (error) {
    console.error('Failed to fetch public store schedule:', error)
    return []
  }
}

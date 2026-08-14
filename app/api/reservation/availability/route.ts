/**
 * @design_doc   Public slot listing and administrator-only reservation conflict checks
 * @related_to   reservation/route.ts, requireAdmin, canonical store resolver
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { PrismaClient } from '@prisma/client'
import { requireAdmin } from '@/lib/auth/utils'
import logger from '@/lib/logger'
import { ensureStoreId, resolveStoreId } from '@/lib/store/server'
import { differenceInCalendarDays, parse } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import {
  BusinessHoursRange,
  parseBusinessHoursString,
  minutesToIsoInJst,
} from '@/lib/settings/business-hours'
import { getConfiguredBusinessHours } from '@/lib/settings/business-hours.server'

const JST_TIMEZONE = 'Asia/Tokyo'

function convertJstStringToUtc(dateTime: string): Date {
  if (typeof dateTime !== 'string') {
    throw new Error('Invalid date format')
  }

  const trimmed = dateTime.trim()
  if (trimmed.length === 0) {
    throw new Error('Invalid date format')
  }

  let candidate = trimmed.replace(/\s+/g, 'T')

  if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    candidate = `${candidate}T00:00:00`
  }

  if (/T\d{2}:\d{2}$/.test(candidate)) {
    candidate = `${candidate}:00`
  }

  if (!/[Zz]|[+-]\d{2}:?\d{2}$/.test(candidate)) {
    candidate = `${candidate}+09:00`
  }

  const parsed = new Date(candidate)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid date format')
  }

  return parsed
}

interface TimeSlot {
  startTime: string
  endTime: string
}

interface AvailabilityCheck {
  available: boolean
  conflicts: Array<{
    id: string
    startTime: string
    endTime: string
  }>
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const path = request.nextUrl.pathname
    const mode = searchParams.get('mode')
    const requestedStoreId = await resolveStoreId(request)

    if (!requestedStoreId) {
      return NextResponse.json({ error: 'Missing required parameter: storeId' }, { status: 400 })
    }

    const storeId = await ensureStoreId(requestedStoreId)

    // Check if this is a conflict check request
    if (path.endsWith('/check') || mode === 'check') {
      const authError = await requireAdmin({ permissions: 'reservation:read', storeId })
      if (authError) {
        return authError
      }

      return handleConflictCheck(searchParams, storeId)
    }

    // Otherwise, return available time slots
    return handleAvailableSlots(searchParams, storeId)
  } catch (error) {
    logger.error({ err: error }, 'Error checking availability')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleConflictCheck(
  searchParams: URLSearchParams,
  storeId: string
): Promise<NextResponse> {
  try {
    const castId = searchParams.get('castId')
    const castIds = searchParams.get('castIds')
    const startTimeStr = searchParams.get('startTime')
    const endTimeStr = searchParams.get('endTime')

    // Validate required parameters
    if (!castId && !castIds) {
      return NextResponse.json(
        { error: 'Missing required parameters: castId or castIds' },
        { status: 400 }
      )
    }

    if (!startTimeStr || !endTimeStr) {
      return NextResponse.json(
        { error: 'Missing required parameters: startTime and endTime' },
        { status: 400 }
      )
    }

    // Validate date formats
    const startTime = new Date(startTimeStr)
    const endTime = new Date(endTimeStr)

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    const castIdArray = Array.from(
      new Set(
        (castIds ? castIds.split(',') : [castId!])
          .map((candidate) => candidate.trim())
          .filter(Boolean)
      )
    )
    const matchingCasts = await db.cast.findMany({
      where: {
        id: { in: castIdArray },
        storeId,
      },
      select: { id: true },
    })

    if (matchingCasts.length !== castIdArray.length) {
      return NextResponse.json({ error: 'Cast not found' }, { status: 404 })
    }

    // Handle multiple cast check
    if (castIds) {
      const results: Record<string, AvailabilityCheck> = {}

      for (const id of castIdArray) {
        const availability = await checkCastAvailability(storeId, id, startTime, endTime)
        results[id] = availability
      }

      return NextResponse.json(results)
    }

    // Single cast check
    const availability = await checkCastAvailability(storeId, castIdArray[0], startTime, endTime)
    return NextResponse.json(availability)
  } catch (error) {
    logger.error({ err: error }, 'Error in handleConflictCheck')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

async function checkCastAvailability(
  storeId: string,
  castId: string,
  startTime: Date,
  endTime: Date,
  tx: PrismaTransactionClient | PrismaClient = db
): Promise<AvailabilityCheck> {
  // Find overlapping reservations
  const conflicts = await tx.reservation.findMany({
    where: {
      storeId,
      castId,
      status: {
        not: 'cancelled',
      },
      OR: [
        {
          // New reservation starts during existing reservation
          startTime: {
            lte: startTime,
          },
          endTime: {
            gt: startTime,
          },
        },
        {
          // New reservation ends during existing reservation
          startTime: {
            lt: endTime,
          },
          endTime: {
            gte: endTime,
          },
        },
        {
          // New reservation completely contains existing reservation
          startTime: {
            gte: startTime,
          },
          endTime: {
            lte: endTime,
          },
        },
      ],
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
    },
  })

  return {
    available: conflicts.length === 0,
    conflicts: conflicts.map((reservation: { id: string; startTime: Date; endTime: Date }) => ({
      id: reservation.id,
      startTime: reservation.startTime.toISOString(),
      endTime: reservation.endTime.toISOString(),
    })),
  }
}

async function handleAvailableSlots(
  searchParams: URLSearchParams,
  storeId: string
): Promise<NextResponse> {
  try {
    const castId = searchParams.get('castId')
    const dateStr = searchParams.get('date')
    const durationStr = searchParams.get('duration')

    if (!castId || !dateStr || !durationStr) {
      return NextResponse.json(
        { error: 'Missing required parameters: castId, date, and duration' },
        { status: 400 }
      )
    }

    const duration = parseInt(durationStr, 10)

    if (!dateStr || isNaN(duration)) {
      return NextResponse.json({ error: 'Invalid date or duration format' }, { status: 400 })
    }

    // Get cast info
    const cast = await db.cast.findUnique({
      where: { id: castId },
      select: {
        id: true,
        name: true,
        storeId: true,
        netReservation: true,
      },
    })

    if (!cast || (storeId && cast.storeId !== storeId)) {
      return NextResponse.json({ error: 'Cast not found' }, { status: 404 })
    }

    const emptyAvailability = () =>
      NextResponse.json({
        castId,
        date: dateStr,
        duration,
        availableSlots: [],
      })

    if (!cast.netReservation) {
      return emptyAvailability()
    }

    const businessHours = await resolveBusinessHours(cast.storeId)
    const rangeStartUtc = convertJstStringToUtc(
      minutesToIsoInJst(dateStr, businessHours.startMinutes)
    )
    const rangeEndUtc = convertJstStringToUtc(minutesToIsoInJst(dateStr, businessHours.endMinutes))

    const schedule = await db.castSchedule.findFirst({
      where: {
        castId,
        isAvailable: true,
        startTime: {
          lt: rangeEndUtc,
        },
        endTime: {
          gt: rangeStartUtc,
        },
      },
      orderBy: {
        startTime: 'asc',
      },
      select: {
        startTime: true,
        endTime: true,
      },
    })

    if (!schedule) {
      return emptyAvailability()
    }

    const availableStartUtc = new Date(
      Math.max(rangeStartUtc.getTime(), schedule.startTime.getTime())
    )
    const availableEndUtc = new Date(Math.min(rangeEndUtc.getTime(), schedule.endTime.getTime()))

    if (availableStartUtc >= availableEndUtc) {
      return emptyAvailability()
    }

    const reservations = await db.reservation.findMany({
      where: {
        castId,
        storeId: cast.storeId,
        status: {
          not: 'cancelled',
        },
        startTime: {
          lt: availableEndUtc,
        },
        endTime: {
          gt: availableStartUtc,
        },
      },
      orderBy: {
        startTime: 'asc',
      },
      select: {
        startTime: true,
        endTime: true,
      },
    })

    // Calculate available slots
    const baseDate = parse(dateStr, 'yyyy-MM-dd', new Date())
    const getMinutesFromDate = (date: Date) => {
      const dateKey = formatInTimeZone(date, JST_TIMEZONE, 'yyyy-MM-dd')
      const targetDate = parse(dateKey, 'yyyy-MM-dd', new Date())
      const dayDiff = differenceInCalendarDays(targetDate, baseDate)
      const minutesOfDay =
        Number(formatInTimeZone(date, JST_TIMEZONE, 'HH')) * 60 +
        Number(formatInTimeZone(date, JST_TIMEZONE, 'mm'))
      return dayDiff * 24 * 60 + minutesOfDay
    }

    const availableSlots: TimeSlot[] = []
    const availableStartMinute = Math.max(
      businessHours.startMinutes,
      getMinutesFromDate(availableStartUtc)
    )
    const availableEndMinute = Math.min(
      businessHours.endMinutes,
      getMinutesFromDate(availableEndUtc)
    )
    let currentMinute = availableStartMinute

    for (const reservation of reservations) {
      const reservationStartMinute = Math.max(
        getMinutesFromDate(reservation.startTime),
        availableStartMinute
      )
      const reservationEndMinute = Math.min(
        getMinutesFromDate(reservation.endTime),
        availableEndMinute
      )

      if (reservationEndMinute <= reservationStartMinute) {
        continue
      }

      if (reservationStartMinute - currentMinute >= duration) {
        availableSlots.push({
          startTime: convertJstStringToUtc(minutesToIsoInJst(dateStr, currentMinute)).toISOString(),
          endTime: convertJstStringToUtc(
            minutesToIsoInJst(dateStr, reservationStartMinute)
          ).toISOString(),
        })
      }

      currentMinute = Math.max(currentMinute, reservationEndMinute)
    }

    if (availableEndMinute - currentMinute >= duration) {
      availableSlots.push({
        startTime: convertJstStringToUtc(minutesToIsoInJst(dateStr, currentMinute)).toISOString(),
        endTime: convertJstStringToUtc(
          minutesToIsoInJst(dateStr, availableEndMinute)
        ).toISOString(),
      })
    }

    return NextResponse.json({
      castId,
      date: dateStr,
      duration,
      availableSlots,
    })
  } catch (error) {
    logger.error({ err: error }, 'Error in handleAvailableSlots')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
async function resolveBusinessHours(storeId: string): Promise<BusinessHoursRange> {
  try {
    const settings = await db.storeSettings.findUnique({
      where: { storeId },
      select: { businessHours: true },
    })
    if (settings?.businessHours) {
      return parseBusinessHoursString(settings.businessHours)
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch store business hours')
  }
  return getConfiguredBusinessHours()
}

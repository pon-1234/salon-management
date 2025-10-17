/**
 * @design_doc   Reservation availability check API for conflict detection
 * @related_to   reservation/route.ts, ReservationRepository, Prisma Reservation model
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { PrismaClient } from '@prisma/client'
import logger from '@/lib/logger'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { env } from '@/lib/config/env'

const JST_TIMEZONE = 'Asia/Tokyo'

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

    // Check if this is a conflict check request
    if (path.endsWith('/check')) {
      return handleConflictCheck(searchParams)
    }

    // Otherwise, return available time slots
    return handleAvailableSlots(searchParams)
  } catch (error) {
    logger.error({ err: error }, 'Error checking availability')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleConflictCheck(searchParams: URLSearchParams): Promise<NextResponse> {
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

    // Handle multiple cast check
    if (castIds) {
      const castIdArray = castIds.split(',')
      const results: Record<string, AvailabilityCheck> = {}

      for (const id of castIdArray) {
        const availability = await checkCastAvailability(id, startTime, endTime)
        results[id] = availability
      }

      return NextResponse.json(results)
    }

    // Single cast check
    const availability = await checkCastAvailability(castId!, startTime, endTime)
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
  castId: string,
  startTime: Date,
  endTime: Date,
  tx: PrismaTransactionClient | PrismaClient = db
): Promise<AvailabilityCheck> {
  // Find overlapping reservations
  const conflicts = await tx.reservation.findMany({
    where: {
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

async function handleAvailableSlots(searchParams: URLSearchParams): Promise<NextResponse> {
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

    const date = new Date(dateStr)
    const duration = parseInt(durationStr, 10)

    if (isNaN(date.getTime()) || isNaN(duration)) {
      return NextResponse.json({ error: 'Invalid date or duration format' }, { status: 400 })
    }

    // Get cast info
    const cast = await db.cast.findUnique({
      where: { id: castId },
      select: {
        id: true,
        name: true,
      },
    })

    if (!cast) {
      return NextResponse.json({ error: 'Cast not found' }, { status: 404 })
    }

    const businessHourStart = env.businessHours.start
    const businessHourEnd = env.businessHours.end

    // JSTでその日の一日を定義
    const dateInJst = toZonedTime(date, JST_TIMEZONE)

    const startOfDayInJst = new Date(dateInJst)
    startOfDayInJst.setHours(0, 0, 0, 0)

    const endOfDayInJst = new Date(dateInJst)
    endOfDayInJst.setHours(23, 59, 59, 999)

    // DBクエリのためにUTCに変換
    const startOfDayInUtc = fromZonedTime(startOfDayInJst, JST_TIMEZONE)
    const endOfDayInUtc = fromZonedTime(endOfDayInJst, JST_TIMEZONE)

    const reservations = await db.reservation.findMany({
      where: {
        castId,
        status: {
          not: 'cancelled',
        },
        startTime: {
          gte: startOfDayInUtc,
          lte: endOfDayInUtc,
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
    const availableSlots: TimeSlot[] = []

    const [startHour, startMinute] = businessHourStart.split(':').map(Number)
    const workStartInJst = new Date(dateInJst)
    workStartInJst.setHours(startHour, startMinute, 0, 0)

    const [endHour, endMinute] = businessHourEnd.split(':').map(Number)
    const workEndInJst = new Date(dateInJst)
    workEndInJst.setHours(endHour, endMinute, 0, 0)

    let currentTimeInJst = new Date(workStartInJst)

    for (const reservation of reservations) {
      const reservationStartTimeInJst = toZonedTime(reservation.startTime, JST_TIMEZONE)
      const reservationEndTimeInJst = toZonedTime(reservation.endTime, JST_TIMEZONE)

      if (
        reservationStartTimeInJst.getTime() - currentTimeInJst.getTime() >=
        duration * 60 * 1000
      ) {
        availableSlots.push({
          startTime: fromZonedTime(currentTimeInJst, JST_TIMEZONE).toISOString(),
          endTime: fromZonedTime(reservationStartTimeInJst, JST_TIMEZONE).toISOString(),
        })
      }
      currentTimeInJst = new Date(reservationEndTimeInJst)
    }

    // Check if there's time after the last reservation
    if (workEndInJst.getTime() - currentTimeInJst.getTime() >= duration * 60 * 1000) {
      availableSlots.push({
        startTime: fromZonedTime(currentTimeInJst, JST_TIMEZONE).toISOString(),
        endTime: fromZonedTime(workEndInJst, JST_TIMEZONE).toISOString(),
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

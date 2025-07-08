/**
 * @design_doc   Reservation availability check API for conflict detection
 * @related_to   reservation/route.ts, ReservationRepository, Prisma Reservation model
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
    console.error('Error checking availability:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleConflictCheck(searchParams: URLSearchParams): Promise<NextResponse> {
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
}

export async function checkCastAvailability(
  castId: string,
  startTime: Date,
  endTime: Date
): Promise<AvailabilityCheck> {
  // Find overlapping reservations
  const conflicts = await db.reservation.findMany({
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
    conflicts: conflicts.map((reservation) => ({
      id: reservation.id,
      startTime: reservation.startTime.toISOString(),
      endTime: reservation.endTime.toISOString(),
    })),
  }
}

async function handleAvailableSlots(searchParams: URLSearchParams): Promise<NextResponse> {
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

  // Default working hours for all casts
  // In the future, this could be stored in a separate table or settings
  const parsedWorkingHours = { start: '09:00', end: '18:00' }

  // Get all reservations for the cast on the specified date
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const reservations = await db.reservation.findMany({
    where: {
      castId,
      status: {
        not: 'cancelled',
      },
      startTime: {
        gte: startOfDay,
        lte: endOfDay,
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
  const workStart = new Date(date)
  const [startHour, startMinute] = parsedWorkingHours.start.split(':').map(Number)
  workStart.setUTCHours(startHour, startMinute, 0, 0)

  const workEnd = new Date(date)
  const [endHour, endMinute] = parsedWorkingHours.end.split(':').map(Number)
  workEnd.setUTCHours(endHour, endMinute, 0, 0)

  let currentTime = new Date(workStart)

  for (const reservation of reservations) {
    // If there's a gap before this reservation that fits the duration
    if (reservation.startTime.getTime() - currentTime.getTime() >= duration * 60 * 1000) {
      availableSlots.push({
        startTime: currentTime.toISOString(),
        endTime: reservation.startTime.toISOString(),
      })
    }
    currentTime = new Date(reservation.endTime)
  }

  // Check if there's time after the last reservation
  if (workEnd.getTime() - currentTime.getTime() >= duration * 60 * 1000) {
    availableSlots.push({
      startTime: currentTime.toISOString(),
      endTime: workEnd.toISOString(),
    })
  }

  return NextResponse.json({
    castId,
    date: dateStr,
    duration,
    availableSlots,
  })
}

/**
 * @design_doc   Reservation backend API with time slot management and conflict control
 * @related_to   Reservation processing, notification system, availability checking
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/generated/prisma'
import { z } from 'zod'
import { ReservationService } from '@/lib/reservation/service'

const prisma = new PrismaClient()

const createReservationSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  staffId: z.string().min(1, 'Staff ID is required'),
  serviceId: z.string().min(1, 'Service ID is required'),
  startTime: z.string().datetime('Invalid start time format'),
  endTime: z.string().datetime('Invalid end time format'),
  notes: z.string().optional(),
})


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const staffId = searchParams.get('staffId')

    const whereClause: any = {}

    if (date) {
      const targetDate = new Date(date)
      const nextDay = new Date(targetDate)
      nextDay.setDate(nextDay.getDate() + 1)

      whereClause.startTime = {
        gte: targetDate,
        lt: nextDay
      }
    }

    if (staffId) {
      whereClause.staffId = staffId
    }

    const reservations = await prisma.reservation.findMany({
      where: whereClause,
      orderBy: {
        startTime: 'asc'
      }
    })

    return NextResponse.json(reservations)
  } catch (error) {
    console.error('Error fetching reservations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reservations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request data
    const validatedData = createReservationSchema.parse(body)

    const startTime = new Date(validatedData.startTime)
    const endTime = new Date(validatedData.endTime)

    // Use reservation service
    const reservationService = new ReservationService()
    
    // Validate reservation
    const validation = await reservationService.validateReservation({
      customerId: validatedData.customerId,
      staffId: validatedData.staffId,
      serviceId: validatedData.serviceId,
      startTime,
      endTime,
      notes: validatedData.notes
    })

    if (!validation.isValid) {
      if (validation.conflicts && validation.conflicts.length > 0) {
        return NextResponse.json(
          { 
            error: 'Time slot conflict detected',
            conflicts: validation.conflicts
          },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: validation.errors?.join(', ') || 'Validation failed' },
        { status: 400 }
      )
    }

    // Create reservation
    const reservation = await reservationService.createReservation({
      customerId: validatedData.customerId,
      staffId: validatedData.staffId,
      serviceId: validatedData.serviceId,
      startTime,
      endTime,
      notes: validatedData.notes
    })

    return NextResponse.json(reservation, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating reservation:', error)
    return NextResponse.json(
      { error: 'Failed to create reservation' },
      { status: 500 }
    )
  }
}
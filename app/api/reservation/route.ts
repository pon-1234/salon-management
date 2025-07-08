/**
 * @design_doc   Reservation API endpoints for CRUD operations
 * @related_to   ReservationRepository, Reservation type, Prisma Reservation model
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkCastAvailability } from './availability/route'
import { NotificationService } from '@/lib/notification/service'

const notificationService = new NotificationService()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const castId = searchParams.get('castId')
    const customerId = searchParams.get('customerId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (id) {
      const reservation = await db.reservation.findUnique({
        where: { id },
        include: {
          customer: true,
          cast: true,
          course: true,
          options: {
            include: {
              option: true,
            },
          },
        },
      })

      if (!reservation) {
        return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
      }

      return NextResponse.json(reservation)
    }

    // Build filters for querying reservations
    const where: any = {}

    if (castId) where.castId = castId
    if (customerId) where.customerId = customerId
    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const reservations = await db.reservation.findMany({
      where,
      include: {
        customer: true,
        cast: true,
        course: true,
        options: {
          include: {
            option: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    return NextResponse.json(reservations)
  } catch (error) {
    console.error('Error fetching reservation data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Validate required fields
    if (!data.customerId || !data.castId || !data.courseId || !data.startTime || !data.endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: customerId, castId, courseId, startTime, endTime' },
        { status: 400 }
      )
    }

    // Validate date formats
    const startTime = new Date(data.startTime)
    const endTime = new Date(data.endTime)

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    // Validate end time is after start time
    if (endTime <= startTime) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
    }

    // Check availability
    const availability = await checkCastAvailability(data.castId, startTime, endTime)

    if (!availability.available) {
      return NextResponse.json(
        {
          error: 'Time slot is not available',
          conflicts: availability.conflicts,
        },
        { status: 409 }
      )
    }

    const newReservation = await db.reservation.create({
      data: {
        customerId: data.customerId,
        castId: data.castId,
        courseId: data.courseId,
        startTime: startTime,
        endTime: endTime,
        status: data.status || 'confirmed',
        options: data.options
          ? {
              create: data.options.map((optionId: string) => ({
                optionId,
              })),
            }
          : undefined,
      },
      include: {
        customer: true,
        cast: true,
        course: true,
        options: {
          include: {
            option: true,
          },
        },
      },
    })

    // Send confirmation notification
    try {
      await notificationService.sendReservationConfirmation(newReservation)
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError)
      // Don't fail the request if notification fails
    }

    return NextResponse.json(newReservation, { status: 201 })
  } catch (error) {
    console.error('Error creating reservation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const { id, options, ...updates } = data

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // Get existing reservation
    const existingReservation = await db.reservation.findUnique({
      where: { id },
    })

    if (!existingReservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // Check if reservation is cancelled
    if (existingReservation.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot modify cancelled reservation' }, { status: 400 })
    }

    // If updating time, validate dates and check availability
    if (updates.startTime || updates.endTime) {
      const startTime = updates.startTime
        ? new Date(updates.startTime)
        : existingReservation.startTime
      const endTime = updates.endTime ? new Date(updates.endTime) : existingReservation.endTime

      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
      }

      if (endTime <= startTime) {
        return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
      }

      // Check availability if time is being changed
      const castId = updates.castId || existingReservation.castId
      const availability = await checkCastAvailability(castId, startTime, endTime)

      // Exclude current reservation from conflicts
      const filteredConflicts = availability.conflicts.filter((c) => c.id !== id)

      if (filteredConflicts.length > 0) {
        return NextResponse.json(
          {
            error: 'Time slot is not available',
            conflicts: filteredConflicts,
          },
          { status: 409 }
        )
      }
    }

    // Update reservation within a transaction
    const updatedReservation = await db.$transaction(async (tx) => {
      // Delete existing options
      await tx.reservationOption.deleteMany({
        where: { reservationId: id },
      })

      // Update reservation
      return await tx.reservation.update({
        where: { id },
        data: {
          customerId: updates.customerId,
          castId: updates.castId,
          courseId: updates.courseId,
          startTime: updates.startTime ? new Date(updates.startTime) : undefined,
          endTime: updates.endTime ? new Date(updates.endTime) : undefined,
          status: updates.status,
          options: options
            ? {
                create: options.map((optionId: string) => ({
                  optionId,
                })),
              }
            : undefined,
        },
        include: {
          customer: true,
          cast: true,
          course: true,
          options: {
            include: {
              option: true,
            },
          },
        },
      })
    })

    // Send modification notification if time was changed
    if (updates.startTime || updates.endTime) {
      try {
        await notificationService.sendReservationModification(updatedReservation, {
          startTime: existingReservation.startTime,
          endTime: existingReservation.endTime,
        })
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError)
      }
    }

    return NextResponse.json(updatedReservation)
  } catch (error) {
    console.error('Error updating reservation:', error)
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // Get existing reservation
    const existingReservation = await db.reservation.findUnique({
      where: { id },
    })

    if (!existingReservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // Check if already cancelled
    if (existingReservation.status === 'cancelled') {
      return NextResponse.json({ error: 'Reservation is already cancelled' }, { status: 400 })
    }

    // Check if reservation is in the past
    if (existingReservation.startTime < new Date()) {
      return NextResponse.json({ error: 'Cannot cancel past reservations' }, { status: 400 })
    }

    // Soft delete by updating status to cancelled
    const cancelledReservation = await db.reservation.update({
      where: { id },
      data: { status: 'cancelled' },
      include: {
        customer: true,
        cast: true,
        course: true,
      },
    })

    // Send cancellation notification
    try {
      await notificationService.sendReservationCancellation(cancelledReservation)
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError)
    }

    return NextResponse.json(cancelledReservation)
  } catch (error) {
    console.error('Error deleting reservation:', error)
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

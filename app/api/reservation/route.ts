/**
 * @design_doc   Reservation API endpoints for CRUD operations
 * @related_to   ReservationRepository, Reservation type, Prisma Reservation model
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
              option: true
            }
          }
        }
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
        lte: new Date(endDate)
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
            option: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
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

    const newReservation = await db.reservation.create({
      data: {
        customerId: data.customerId,
        castId: data.castId,
        courseId: data.courseId,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        status: data.status || 'pending',
        options: data.options ? {
          create: data.options.map((optionId: string) => ({
            optionId
          }))
        } : undefined
      },
      include: {
        customer: true,
        cast: true,
        course: true,
        options: {
          include: {
            option: true
          }
        }
      }
    })

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

    // Update reservation within a transaction
    const updatedReservation = await db.$transaction(async (tx) => {
      // Delete existing options
      await tx.reservationOption.deleteMany({
        where: { reservationId: id }
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
          options: options ? {
            create: options.map((optionId: string) => ({
              optionId
            }))
          } : undefined
        },
        include: {
          customer: true,
          cast: true,
          course: true,
          options: {
            include: {
              option: true
            }
          }
        }
      })
    })

    return NextResponse.json(updatedReservation)
  } catch (error) {
    console.error('Error updating reservation:', error)
    if (error.code === 'P2025') {
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

    await db.reservation.delete({
      where: { id }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting reservation:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
/**
 * @design_doc   Cast Schedule API endpoints for CRUD operations
 * @related_to   CastRepository, CastSchedule type, Prisma CastSchedule model
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const castId = searchParams.get('castId')
    const date = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (id) {
      const schedule = await db.castSchedule.findUnique({
        where: { id },
        include: {
          cast: true
        }
      })
      
      if (!schedule) {
        return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
      }
      
      return NextResponse.json(schedule)
    }

    // Build filters for querying schedules
    const where: any = {}
    
    if (castId) where.castId = castId
    if (date) {
      where.date = new Date(date)
    } else if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const schedules = await db.castSchedule.findMany({
      where,
      include: {
        cast: true
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    })
    
    return NextResponse.json(schedules)
  } catch (error) {
    console.error('Error fetching cast schedule data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const newSchedule = await db.castSchedule.create({
      data: {
        castId: data.castId,
        date: new Date(data.date),
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        isAvailable: data.isAvailable ?? true,
      },
      include: {
        cast: true
      }
    })

    return NextResponse.json(newSchedule, { status: 201 })
  } catch (error) {
    console.error('Error creating cast schedule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const { id, ...updates } = data

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const updatedSchedule = await db.castSchedule.update({
      where: { id },
      data: {
        date: updates.date ? new Date(updates.date) : undefined,
        startTime: updates.startTime ? new Date(updates.startTime) : undefined,
        endTime: updates.endTime ? new Date(updates.endTime) : undefined,
        isAvailable: updates.isAvailable,
      },
      include: {
        cast: true
      }
    })

    return NextResponse.json(updatedSchedule)
  } catch (error) {
    console.error('Error updating cast schedule:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
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

    await db.castSchedule.delete({
      where: { id }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting cast schedule:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
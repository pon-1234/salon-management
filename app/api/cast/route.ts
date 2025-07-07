/**
 * @design_doc   Cast API endpoints for CRUD operations
 * @related_to   CastRepository, Cast type, Prisma Cast model
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (id) {
      const cast = await db.cast.findUnique({
        where: { id },
        include: {
          schedules: true,
          reservations: {
            include: {
              customer: true,
              course: true,
              options: {
                include: {
                  option: true
                }
              }
            }
          }
        }
      })
      
      if (!cast) {
        return NextResponse.json({ error: 'Cast not found' }, { status: 404 })
      }
      
      return NextResponse.json(cast)
    }

    const casts = await db.cast.findMany({
      include: {
        schedules: true,
        reservations: {
          include: {
            customer: true,
            course: true
          }
        }
      }
    })
    
    return NextResponse.json(casts)
  } catch (error) {
    console.error('Error fetching cast data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const newCast = await db.cast.create({
      data: {
        name: body.name || '',
        age: body.age || 20,
        height: body.height || 160,
        bust: body.bust || 'B',
        waist: body.waist || 60,
        hip: body.hip || 85,
        type: body.type || 'カワイイ系',
        image: body.image || '',
        images: body.images || [],
        description: body.description || '',
        netReservation: body.netReservation ?? true,
        specialDesignationFee: body.specialDesignationFee || null,
        regularDesignationFee: body.regularDesignationFee || null,
        workStatus: body.workStatus || '出勤',
        panelDesignationRank: body.panelDesignationRank || 1,
        regularDesignationRank: body.regularDesignationRank || 1,
      },
      include: {
        schedules: true,
        reservations: {
          include: {
            customer: true,
            course: true
          }
        }
      }
    })

    return NextResponse.json(newCast, { status: 201 })
  } catch (error) {
    console.error('Error creating cast:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const updatedCast = await db.cast.update({
      where: { id },
      data: {
        name: updates.name,
        age: updates.age,
        height: updates.height,
        bust: updates.bust,
        waist: updates.waist,
        hip: updates.hip,
        type: updates.type,
        image: updates.image,
        images: updates.images,
        description: updates.description,
        netReservation: updates.netReservation,
        specialDesignationFee: updates.specialDesignationFee,
        regularDesignationFee: updates.regularDesignationFee,
        workStatus: updates.workStatus,
        panelDesignationRank: updates.panelDesignationRank,
        regularDesignationRank: updates.regularDesignationRank,
      },
      include: {
        schedules: true,
        reservations: {
          include: {
            customer: true,
            course: true
          }
        }
      }
    })

    return NextResponse.json(updatedCast)
  } catch (error) {
    console.error('Error updating cast:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Cast not found' }, { status: 404 })
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

    await db.cast.delete({
      where: { id }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting cast:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Cast not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

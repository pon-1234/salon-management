/**
 * @design_doc   Course pricing API endpoints for CRUD operations
 * @related_to   PricingRepository, Course type, Prisma CoursePrice model
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (id) {
      const course = await db.coursePrice.findUnique({
        where: { id },
        include: {
          reservations: {
            include: {
              customer: true,
              cast: true
            }
          }
        }
      })
      
      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 })
      }
      
      return NextResponse.json(course)
    }

    const courses = await db.coursePrice.findMany({
      include: {
        reservations: {
          include: {
            customer: true,
            cast: true
          }
        }
      },
      orderBy: {
        price: 'asc'
      }
    })
    
    return NextResponse.json(courses)
  } catch (error) {
    console.error('Error fetching course data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const newCourse = await db.coursePrice.create({
      data: {
        name: data.name,
        duration: data.duration,
        price: data.price,
        description: data.description || '',
      },
      include: {
        reservations: true
      }
    })

    return NextResponse.json(newCourse, { status: 201 })
  } catch (error) {
    console.error('Error creating course:', error)
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

    const updatedCourse = await db.coursePrice.update({
      where: { id },
      data: {
        name: updates.name,
        duration: updates.duration,
        price: updates.price,
        description: updates.description,
      },
      include: {
        reservations: {
          include: {
            customer: true,
            cast: true
          }
        }
      }
    })

    return NextResponse.json(updatedCourse)
  } catch (error) {
    console.error('Error updating course:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
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

    await db.coursePrice.delete({
      where: { id }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting course:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
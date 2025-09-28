/**
 * @design_doc   Course pricing API endpoints for CRUD operations
 * @related_to   PricingRepository, Course type, Prisma CoursePrice model
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import logger from '@/lib/logger'

async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  return session
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    if (session instanceof NextResponse) {
      return session
    }

    const isAdmin = session.user.role === 'admin'
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (id) {
      const course = await db.coursePrice.findUnique({
        where: { id },
        include: {
          reservations: {
            include: {
              customer: true,
              cast: true,
            },
          },
        },
      })

      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 })
      }

      if (isAdmin) {
        return NextResponse.json(course)
      }

      const { reservations, ...courseData } = course as typeof course & {
        reservations?: unknown
      }

      return NextResponse.json(courseData)
    }

    const courses = await db.coursePrice.findMany({
      include: {
        reservations: {
          include: {
            customer: true,
            cast: true,
          },
        },
      },
      orderBy: {
        price: 'asc',
      },
    })

    if (isAdmin) {
      return NextResponse.json(courses)
    }

    const sanitizedCourses = courses.map((course) => {
      const { reservations, ...courseData } = course as typeof course & {
        reservations?: unknown
      }
      return courseData
    })

    return NextResponse.json(sanitizedCourses)
  } catch (error) {
    logger.error({ err: error }, 'Error fetching course data')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    if (session instanceof NextResponse) {
      return session
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data = await request.json()

    const newCourse = await db.coursePrice.create({
      data: {
        name: data.name,
        duration: data.duration,
        price: data.price,
        description: data.description || '',
      },
      include: {
        reservations: true,
      },
    })

    return NextResponse.json(newCourse, { status: 201 })
  } catch (error) {
    logger.error({ err: error }, 'Error creating course')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSession()
    if (session instanceof NextResponse) {
      return session
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
            cast: true,
          },
        },
      },
    })

    return NextResponse.json(updatedCourse)
  } catch (error: any) {
    logger.error({ err: error }, 'Error updating course')
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession()
    if (session instanceof NextResponse) {
      return session
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await db.coursePrice.delete({
      where: { id },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    logger.error({ err: error }, 'Error deleting course')
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

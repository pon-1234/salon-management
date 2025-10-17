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
import { defaultCourses } from '@/lib/pricing/data'

function normalizeNumber(value: any, fallback: number = 0) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.trunc(parsed)
}

function buildCoursePayload(data: any, mode: 'create' | 'update') {
  const payload: Record<string, any> = {}

  if (data.name !== undefined) {
    const name = data.name?.toString().trim()
    if (!name) {
      throw new Error('NAME_REQUIRED')
    }
    payload.name = name
  } else if (mode === 'create') {
    throw new Error('NAME_REQUIRED')
  }

  if (data.description !== undefined) {
    payload.description = data.description?.toString() ?? ''
  } else if (mode === 'create') {
    payload.description = ''
  }

  if (data.duration !== undefined) {
    const duration = normalizeNumber(data.duration, NaN)
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error('INVALID_DURATION')
    }
    payload.duration = duration
  } else if (mode === 'create') {
    throw new Error('INVALID_DURATION')
  }

  if (data.price !== undefined) {
    const price = normalizeNumber(data.price, NaN)
    if (!Number.isFinite(price) || price < 0) {
      throw new Error('INVALID_PRICE')
    }
    payload.price = price
  } else if (mode === 'create') {
    throw new Error('INVALID_PRICE')
  }

  if (data.storeShare !== undefined) {
    const storeShare = normalizeNumber(data.storeShare, NaN)
    if (!Number.isFinite(storeShare) || storeShare < 0) {
      throw new Error('INVALID_STORE_SHARE')
    }
    payload.storeShare = storeShare
  }

  if (data.castShare !== undefined) {
    const castShare = normalizeNumber(data.castShare, NaN)
    if (!Number.isFinite(castShare) || castShare < 0) {
      throw new Error('INVALID_CAST_SHARE')
    }
    payload.castShare = castShare
  }

  return payload
}

async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  return session
}

function buildFallbackCourseResponse(id: string | null, isAdmin: boolean) {
  if (id) {
    const fallback = defaultCourses.find((course) => course.id === id)
    if (!fallback) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    const payload = isAdmin ? { ...fallback, reservations: [] } : fallback
    return NextResponse.json(payload)
  }

  const payload = defaultCourses.map((course) =>
    isAdmin ? { ...course, reservations: [] } : course
  )
  return NextResponse.json(payload)
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')
  let isAdmin = false

  try {
    const session = await requireSession()
    if (session instanceof NextResponse) {
      return session
    }

    isAdmin = session.user.role === 'admin'

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
      where: {
        isActive: true,
      },
      include: {
        reservations: {
          include: {
            customer: true,
            cast: true,
          },
        },
      },
      orderBy: {
        duration: 'asc',
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
    return buildFallbackCourseResponse(id, isAdmin)
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

    let payload
    try {
      payload = buildCoursePayload(data, 'create')
    } catch (error) {
      if (error instanceof Error && error.message === 'NAME_REQUIRED') {
        return NextResponse.json(
          { error: 'Validation error', details: [{ path: ['name'], message: 'Name is required' }] },
          { status: 400 }
        )
      }
      if (error instanceof Error && error.message === 'INVALID_DURATION') {
        return NextResponse.json(
          { error: 'Validation error', details: [{ path: ['duration'], message: 'Duration must be greater than 0' }] },
          { status: 400 }
        )
      }
      if (error instanceof Error && error.message === 'INVALID_PRICE') {
        return NextResponse.json(
          { error: 'Validation error', details: [{ path: ['price'], message: 'Price must be 0以上の数値です' }] },
          { status: 400 }
        )
      }
      if (error instanceof Error && error.message === 'INVALID_STORE_SHARE') {
        return NextResponse.json(
          { error: 'Validation error', details: [{ path: ['storeShare'], message: 'Store share must be 0以上の数値です' }] },
          { status: 400 }
        )
      }
      if (error instanceof Error && error.message === 'INVALID_CAST_SHARE') {
        return NextResponse.json(
          { error: 'Validation error', details: [{ path: ['castShare'], message: 'Cast share must be 0以上の数値です' }] },
          { status: 400 }
        )
      }
      throw error
    }

    const newCourse = await db.coursePrice.create({
      data: payload,
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

    let payload
    try {
      payload = buildCoursePayload(updates, 'update')
    } catch (error) {
      if (error instanceof Error && error.message === 'NAME_REQUIRED') {
        return NextResponse.json(
          { error: 'Validation error', details: [{ path: ['name'], message: 'Name is required' }] },
          { status: 400 }
        )
      }
      if (error instanceof Error && error.message === 'INVALID_DURATION') {
        return NextResponse.json(
          { error: 'Validation error', details: [{ path: ['duration'], message: 'Duration must be greater than 0' }] },
          { status: 400 }
        )
      }
      if (error instanceof Error && error.message === 'INVALID_PRICE') {
        return NextResponse.json(
          { error: 'Validation error', details: [{ path: ['price'], message: 'Price must be 0以上の数値です' }] },
          { status: 400 }
        )
      }
      if (error instanceof Error && error.message === 'INVALID_STORE_SHARE') {
        return NextResponse.json(
          { error: 'Validation error', details: [{ path: ['storeShare'], message: 'Store share must be 0以上の数値です' }] },
          { status: 400 }
        )
      }
      if (error instanceof Error && error.message === 'INVALID_CAST_SHARE') {
        return NextResponse.json(
          { error: 'Validation error', details: [{ path: ['castShare'], message: 'Cast share must be 0以上の数値です' }] },
          { status: 400 }
        )
      }
      throw error
    }

    const sanitizedPayload = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined)
    )

    const existingCourse = await db.coursePrice.findUnique({
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

    if (!existingCourse) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (Object.keys(sanitizedPayload).length === 0) {
      return NextResponse.json(existingCourse)
    }

    const updatedCourse = await db.$transaction(async (tx) => {
      await tx.coursePrice.update({
        where: { id },
        data: {
          isActive: false,
          archivedAt: new Date(),
        },
      })

      const baseCourseData = {
        name: existingCourse.name,
        description: existingCourse.description,
        duration: existingCourse.duration,
        price: existingCourse.price,
        storeShare: existingCourse.storeShare,
        castShare: existingCourse.castShare,
      }

      return tx.coursePrice.create({
        data: {
          ...baseCourseData,
          ...sanitizedPayload,
          isActive: true,
          archivedAt: null,
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

    await db.coursePrice.update({
      where: { id },
      data: {
        isActive: false,
        archivedAt: new Date(),
      },
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

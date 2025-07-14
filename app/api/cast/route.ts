/**
 * @design_doc   Cast API endpoints for CRUD operations
 * @related_to   CastRepository, Cast type, Prisma Cast model
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import logger from '@/lib/logger'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/utils'
import { handleApiError } from '@/lib/api/errors'
import { SuccessResponses } from '@/lib/api/responses'

// Validation schema for cast data
const castSchema = z.object({
  name: z.string().min(1),
  nameKana: z.string().min(1).optional(), // Optional for now since DB doesn't have this field
  age: z.number().min(18).max(100),
  height: z.number().min(100).max(250),
  bust: z.string(),
  waist: z.number().min(40).max(150),
  hip: z.number().min(40).max(150),
  type: z.string(),
  image: z.string().url(),
  images: z.array(z.string().url()).optional().default([]),
  description: z.string().optional().default(''),
  netReservation: z.boolean().optional().default(true),
  specialDesignationFee: z.number().min(0).nullable().optional(),
  regularDesignationFee: z.number().min(0).nullable().optional(),
  panelDesignationRank: z.number().min(1).optional().default(999),
  regularDesignationRank: z.number().min(1).optional().default(999),
  workStatus: z.string().optional().default('出勤'),
  availableOptions: z.array(z.string()).optional().default([]),
})

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
                  option: true,
                },
              },
            },
          },
        },
      })

      if (!cast) {
        return NextResponse.json({ error: 'Cast not found' }, { status: 404 })
      }

      // Transform database result to match frontend expectations
      const transformedCast = {
        ...cast,
        nameKana: cast.name, // Temporary: use name as nameKana
        images: typeof cast.images === 'string' ? JSON.parse(cast.images) : cast.images,
        availableOptions: [],
        appointments: [],
      }

      return NextResponse.json(transformedCast)
    }

    const casts = await db.cast.findMany({
      include: {
        schedules: true,
        reservations: {
          include: {
            customer: true,
            course: true,
          },
        },
      },
    })

    // Transform database results to match frontend expectations
    const transformedCasts = casts.map((cast) => ({
      ...cast,
      nameKana: cast.name, // Temporary: use name as nameKana
      images: typeof cast.images === 'string' ? JSON.parse(cast.images) : cast.images,
      availableOptions: [],
      appointments: [],
    }))

    return NextResponse.json(transformedCasts)
  } catch (error) {
    logger.error({ err: error }, 'Error fetching cast data')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Check admin permissions
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const body = await request.json()

    // Validate request body
    const validatedData = castSchema.parse(body)

    // Remove fields that don't exist in DB
    const { nameKana, availableOptions, ...dbData } = validatedData

    // Create cast in database
    const cast = await db.cast.create({
      data: {
        ...dbData,
        images: validatedData.images || [],
      },
    })

    logger.info({ castId: cast.id }, 'Cast created successfully')

    return NextResponse.json(cast, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    logger.error({ err: error }, 'Error creating cast')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  // Check admin permissions
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Cast ID is required' }, { status: 400 })
    }

    // Validate update data
    const validatedData = castSchema.partial().parse(updateData)

    // Check if cast exists
    const existingCast = await db.cast.findUnique({
      where: { id },
    })

    if (!existingCast) {
      return NextResponse.json({ error: 'Cast not found' }, { status: 404 })
    }

    // Remove fields that don't exist in DB
    const { nameKana, availableOptions, ...dbData } = validatedData

    // Update cast in database
    const cast = await db.cast.update({
      where: { id },
      data: dbData,
    })

    logger.info({ castId: cast.id }, 'Cast updated successfully')

    return NextResponse.json(cast)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    logger.error({ err: error }, 'Error updating cast')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  // Check admin permissions
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Cast ID is required' }, { status: 400 })
    }

    // Check if cast exists
    const existingCast = await db.cast.findUnique({
      where: { id },
    })

    if (!existingCast) {
      return NextResponse.json({ error: 'Cast not found' }, { status: 404 })
    }

    // Delete cast from database
    await db.cast.delete({
      where: { id },
    })

    logger.info({ castId: id }, 'Cast deleted successfully')

    return NextResponse.json({ message: 'Cast deleted successfully' })
  } catch (error) {
    logger.error({ err: error }, 'Error deleting cast')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

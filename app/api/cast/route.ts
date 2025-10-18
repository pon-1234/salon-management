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
import { castMembers } from '@/lib/cast/data'
import { env } from '@/lib/config/env'
import { Prisma } from '@prisma/client'
import { resolveOptionId } from '@/lib/options/data'

// Validation schema for cast data
const imageUrlSchema = z
  .string()
  .min(1)
  .refine((value) => {
    try {
      new URL(value)
      return true
    } catch {
      return value.startsWith('/') || value.startsWith('data:')
    }
  }, 'Invalid image path')

const castSchema = z.object({
  name: z.string().min(1),
  nameKana: z.string().min(1).optional(), // Optional for now since DB doesn't have this field
  age: z.coerce.number().int().min(18).max(100),
  height: z.coerce.number().int().min(100).max(250),
  bust: z.string(),
  waist: z.coerce.number().int().min(40).max(150),
  hip: z.coerce.number().int().min(40).max(150),
  type: z.string(),
  image: imageUrlSchema,
  images: z.array(imageUrlSchema).optional().default([]),
  description: z.string().optional().default(''),
  publicProfile: z.any().optional(), // JSON field for public profile data
  netReservation: z.boolean().optional().default(true),
  specialDesignationFee: z.union([z.null(), z.coerce.number().int().min(0)]).optional(),
  regularDesignationFee: z.union([z.null(), z.coerce.number().int().min(0)]).optional(),
  panelDesignationRank: z.coerce.number().int().min(0).optional().default(0),
  regularDesignationRank: z.coerce.number().int().min(0).optional().default(0),
  workStatus: z.string().optional().default('出勤'),
  availableOptions: z.array(z.string()).optional().default([]),
})

function normalizeAvailableOptions(raw: unknown): string[] {
  if (!raw) {
    return []
  }

  const values = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(raw)
            return Array.isArray(parsed) ? parsed : [raw]
          } catch {
            return [raw]
          }
        })()
      : [raw]

  const normalized = values
    .map((value) => {
      if (typeof value === 'string') {
        const trimmed = value.trim()
        if (!trimmed) {
          return null
        }
        return resolveOptionId(trimmed)
      }
      if (value === null || value === undefined) {
        return null
      }
      return resolveOptionId(String(value))
    })
    .filter((value): value is string => Boolean(value && value.length > 0))

  return Array.from(new Set(normalized))
}

function transformCast(cast: any) {
  return {
    ...cast,
    nameKana: cast.nameKana ?? cast.name,
    schedules: cast.schedules ?? [],
    reservations: cast.reservations ?? [],
    images: Array.isArray(cast.images)
      ? cast.images
      : typeof cast.images === 'string'
        ? JSON.parse(cast.images)
        : [],
    availableOptions: normalizeAvailableOptions(cast.availableOptions),
    appointments: cast.appointments ?? [],
  }
}

async function fetchCastWithRelations(id: string) {
  try {
    return await db.cast.findUnique({
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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022') {
      logger.warn(
        { err: error, castId: id },
        'Cast relation fetch failed due to schema mismatch, falling back to minimal query'
      )
      return db.cast.findUnique({
        where: { id },
      })
    }
    throw error
  }
}

async function fetchCastListWithRelations() {
  try {
    return await db.cast.findMany({
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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022') {
      logger.warn(
        { err: error },
        'Cast list relation fetch failed due to schema mismatch, falling back to minimal query'
      )
      return db.cast.findMany()
    }
    throw error
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')

  try {
    if (id) {
      const cast = await fetchCastWithRelations(id)

      if (!cast) {
        return NextResponse.json({ error: 'Cast not found' }, { status: 404 })
      }

      // Transform database result to match frontend expectations
      const transformedCast = {
        ...cast,
        nameKana: cast.name, // Temporary: use name as nameKana
        images: typeof cast.images === 'string' ? JSON.parse(cast.images) : cast.images,
        publicProfile: cast.publicProfile || null,
        availableOptions: normalizeAvailableOptions(cast.availableOptions),
        appointments: [],
      }

      return NextResponse.json(transformedCast)
    }

    const casts = await fetchCastListWithRelations()

    // Transform database results to match frontend expectations
    const transformedCasts = casts.map(transformCast)

    return NextResponse.json(transformedCasts)
  } catch (error) {
    logger.error({ err: error }, 'Error fetching cast data')
    if (!env.featureFlags.useMockFallbacks) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
    if (id) {
      const fallbackCast = castMembers.find((cast) => cast.id === id)
      if (!fallbackCast) {
        return NextResponse.json({ error: 'Cast not found' }, { status: 404 })
      }
      return NextResponse.json(transformCast(fallbackCast))
    }

    return NextResponse.json(castMembers.map(transformCast))
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
    const normalizedOptions = normalizeAvailableOptions(availableOptions)
    const images = Array.isArray(validatedData.images) ? validatedData.images : []

    // Create cast in database
    const cast = await db.cast.create({
      data: {
        ...dbData,
        images,
        availableOptions: normalizedOptions,
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
    const updatePayload: Record<string, unknown> = {
      ...dbData,
    }

    if (Array.isArray(validatedData.images)) {
      updatePayload.images = validatedData.images
    }

    if (availableOptions !== undefined) {
      updatePayload.availableOptions = normalizeAvailableOptions(availableOptions)
    }

    // Update cast in database
    const cast = await db.cast.update({
      where: { id },
      data: updatePayload,
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

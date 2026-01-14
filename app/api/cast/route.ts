/**
 * @design_doc   Cast API endpoints for CRUD operations
 * @related_to   CastRepository, Cast type, Prisma Cast model
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import logger from '@/lib/logger'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { requireAdmin } from '@/lib/auth/utils'
import { castMembers } from '@/lib/cast/data'
import { env } from '@/lib/config/env'
import { Prisma } from '@prisma/client'
import { resolveOptionId } from '@/lib/options/data'
import { resolveStoreId, ensureStoreId } from '@/lib/store/server'

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
  availableOptionSettings: z
    .array(
      z.object({
        optionId: z.string().min(1),
        visibility: z.enum(['public', 'internal']).optional().default('public'),
      })
    )
    .optional(),
  lineUserId: z.union([z.string().trim().min(1), z.null()]).optional(),
  welfareExpenseRate: z
    .union([z.coerce.number().min(0).max(100), z.null()])
    .optional(),
  loginEmail: z
    .preprocess(
      (value) => {
        if (value === null || value === undefined) {
          return null
        }
        if (typeof value !== 'string') {
          return value
        }
        const trimmed = value.trim()
        return trimmed.length === 0 ? null : trimmed.toLowerCase()
      },
      z.string().email().nullable()
    )
    .optional(),
  loginPassword: z
    .preprocess(
      (value) => {
        if (typeof value !== 'string') {
          return undefined
        }
        const trimmed = value.trim()
        return trimmed.length === 0 ? undefined : trimmed
      },
      z.string().min(6).max(128).optional()
    )
    .optional(),
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

function normalizeAvailableOptionSettings(raw: unknown): Array<{ optionId: string; visibility: 'public' | 'internal' }> {
  if (!raw) {
    return []
  }

  if (!Array.isArray(raw)) {
    return []
  }

  const normalized = raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null
      }
      const optionId = resolveOptionId(String((entry as any).optionId ?? ''))
      if (!optionId) {
        return null
      }
      const visibility = (entry as any).visibility === 'internal' ? 'internal' : 'public'
      return { optionId, visibility }
    })
    .filter((entry): entry is { optionId: string; visibility: 'public' | 'internal' } => Boolean(entry))

  const seen = new Set<string>()
  return normalized.filter((entry) => {
    if (seen.has(entry.optionId)) {
      return false
    }
    seen.add(entry.optionId)
    return true
  })
}

function transformCast(cast: any) {
  const { passwordHash, ...safeCast } = cast ?? {}
  const base = safeCast ?? {}
  const availableOptionSettings = normalizeAvailableOptionSettings(
    base.castOptionSettings ?? base.availableOptionSettings
  )

  return {
    ...base,
    nameKana: base.nameKana ?? base.name,
    schedules: base.schedules ?? [],
    reservations: base.reservations ?? [],
    images: Array.isArray(base.images)
      ? base.images
      : typeof base.images === 'string'
        ? JSON.parse(base.images)
        : [],
    availableOptions:
      availableOptionSettings.length > 0
        ? availableOptionSettings.map((entry) => entry.optionId)
        : normalizeAvailableOptions(base.availableOptions),
    availableOptionSettings,
    appointments: base.appointments ?? [],
  }
}

async function fetchCastWithRelations(id: string, storeId: string) {
  try {
    return await db.cast.findFirst({
      where: { id, storeId },
      include: {
        schedules: true,
        castOptionSettings: true,
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
      return db.cast.findFirst({
        where: { id, storeId },
      })
    }
    throw error
  }
}

async function fetchCastListWithRelations(storeId: string) {
  try {
    return await db.cast.findMany({
      where: { storeId },
      include: {
        schedules: true,
        castOptionSettings: true,
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
      return db.cast.findMany({
        where: { storeId },
      })
    }
    throw error
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')
  const storeId = await ensureStoreId(await resolveStoreId(request))

  try {
    if (id) {
      const cast = await fetchCastWithRelations(id, storeId)

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
        availableOptionSettings: normalizeAvailableOptionSettings(
          (cast as any).castOptionSettings ?? (cast as any).availableOptionSettings
        ),
        appointments: [],
      }

      return NextResponse.json(transformedCast)
    }

    const casts = await fetchCastListWithRelations(storeId)

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
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const body = await request.json()

    // Validate request body
    const validatedData = castSchema.parse(body)

    const {
      nameKana, // currently unused
      availableOptions,
      availableOptionSettings,
      welfareExpenseRate,
      images: imageList,
      loginEmail,
      loginPassword,
      ...dbData
    } = validatedData

    const normalizedSettings = normalizeAvailableOptionSettings(availableOptionSettings)
    const normalizedOptions =
      normalizedSettings.length > 0
        ? normalizedSettings.map((entry) => entry.optionId)
        : normalizeAvailableOptions(availableOptions)
    const optionSettingsToCreate =
      normalizedSettings.length > 0
        ? normalizedSettings
        : normalizedOptions.map((optionId) => ({ optionId, visibility: 'public' as const }))
    const images = Array.isArray(imageList) ? imageList : []
    const normalizedWelfare =
      welfareExpenseRate === null || welfareExpenseRate === undefined ? null : Number(welfareExpenseRate)

    const normalizedEmail =
      loginEmail === null || loginEmail === undefined ? null : loginEmail.trim().toLowerCase()

    let passwordHash: string | undefined
    if (loginPassword) {
      passwordHash = await bcrypt.hash(loginPassword, 12)
    }

    // Create cast in database
    const cast = await db.cast.create({
      data: {
        ...dbData,
        loginEmail: normalizedEmail,
        passwordHash,
        storeId,
        images,
        availableOptions: normalizedOptions,
        welfareExpenseRate:
          normalizedWelfare === null ? null : new Prisma.Decimal(normalizedWelfare),
        castOptionSettings: optionSettingsToCreate.length > 0 ? { create: optionSettingsToCreate } : undefined,
      },
      include: {
        castOptionSettings: true,
      },
    })

    logger.info({ castId: cast.id }, 'Cast created successfully')

    return NextResponse.json(transformCast(cast), { status: 201 })
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
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Cast ID is required' }, { status: 400 })
    }

    // Validate update data
    const validatedData = castSchema.partial().parse(updateData)

    // Check if cast exists
    const existingCast = await db.cast.findFirst({
      where: { id, storeId },
    })

    if (!existingCast) {
      return NextResponse.json({ error: 'Cast not found' }, { status: 404 })
    }

    const {
      nameKana, // unused field
      availableOptions,
      availableOptionSettings,
      welfareExpenseRate,
      images: imageList,
      loginEmail,
      loginPassword,
      ...dbData
    } = validatedData

    const updatePayload: Record<string, unknown> = {}

    Object.entries(dbData).forEach(([key, value]) => {
      if (value !== undefined) {
        updatePayload[key] = value
      }
    })

    if (imageList !== undefined) {
      updatePayload.images = Array.isArray(imageList) ? imageList : []
    }

    const normalizedOptionSettings =
      availableOptionSettings !== undefined
        ? normalizeAvailableOptionSettings(availableOptionSettings)
        : availableOptions !== undefined
          ? normalizeAvailableOptions(availableOptions).map((optionId) => ({
              optionId,
              visibility: 'public' as const,
            }))
          : null

    if (normalizedOptionSettings !== null) {
      updatePayload.availableOptions = normalizedOptionSettings.map((entry) => entry.optionId)
    }

    if (welfareExpenseRate !== undefined) {
      updatePayload.welfareExpenseRate =
        welfareExpenseRate === null
          ? null
          : new Prisma.Decimal(Number(welfareExpenseRate))
    }

    if (loginEmail !== undefined) {
      updatePayload.loginEmail =
        loginEmail === null ? null : loginEmail.trim().toLowerCase()
    }

    if (loginPassword) {
      updatePayload.passwordHash = await bcrypt.hash(loginPassword, 12)
    }

    // Update cast in database
    const cast = await db.cast.update({
      where: { id },
      data: updatePayload,
      include: {
        castOptionSettings: true,
      },
    })

    if (normalizedOptionSettings !== null) {
      await db.castOptionSetting.deleteMany({ where: { castId: cast.id } })
      if (normalizedOptionSettings.length > 0) {
        await db.castOptionSetting.createMany({
          data: normalizedOptionSettings.map((entry) => ({
            castId: cast.id,
            optionId: entry.optionId,
            visibility: entry.visibility,
          })),
        })
      }
    }

    logger.info({ castId: cast.id }, 'Cast updated successfully')

    const refreshedCast =
      normalizedOptionSettings !== null
        ? await db.cast.findFirst({
            where: { id: cast.id },
            include: { castOptionSettings: true },
          })
        : cast

    return NextResponse.json(transformCast(refreshedCast ?? cast))
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
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Cast ID is required' }, { status: 400 })
    }

    // Check if cast exists
    const existingCast = await db.cast.findFirst({
      where: { id, storeId },
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

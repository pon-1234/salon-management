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
import { isUnknownStoreError } from '@/lib/store/errors'
import { sanitizeResponseData } from '@/lib/http/sanitize-response'
import { normalizePublicProfile } from '@/lib/cast/public-profile'

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
  nameKana: z.string().min(1).optional(),
  age: z.coerce.number().int().min(18).max(100),
  height: z.coerce.number().int().min(100).max(250),
  bust: z.string(),
  waist: z.coerce.number().int().min(40).max(150),
  hip: z.coerce.number().int().min(40).max(150),
  type: z.string(),
  image: imageUrlSchema,
  images: z.array(imageUrlSchema).optional().default([]),
  description: z.string().optional().default(''),
  mediaComment: z.string().optional(),
  mediaCommentSource: z.string().optional(),
  mediaSyncExcluded: z.boolean().optional().default(false),
  scheduleTemplates: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        isHoliday: z.boolean(),
      })
    )
    .optional(),
  publicProfile: z.any().optional(), // JSON field for public profile data
  netReservation: z.boolean().optional().default(true),
  specialDesignationFee: z.union([z.null(), z.coerce.number().int().min(0)]).optional(),
  specialDesignationFeeId: z.union([z.null(), z.string().min(1)]).optional(),
  regularDesignationFee: z.union([z.null(), z.coerce.number().int().min(0)]).optional(),
  panelDesignationRank: z.coerce.number().int().min(0).optional().default(0),
  regularDesignationRank: z.coerce.number().int().min(0).optional().default(0),
  workStatus: z.string().optional().default('出勤'),
  employmentStatus: z.enum(['provisional', 'active', 'retired']).optional().default('provisional'),
  availableOptions: z.array(z.string()).optional().default([]),
  availableOptionSettings: z
    .array(
      z.object({
        optionId: z.string().min(1),
        visibility: z.enum(['public', 'internal']).optional().default('public'),
      })
    )
    .optional(),
  welfareExpenseRate: z.union([z.coerce.number().min(0).max(100), z.null()]).optional(),
  loginEmail: z
    .preprocess((value) => {
      if (value === null || value === undefined) {
        return null
      }
      if (typeof value !== 'string') {
        return value
      }
      const trimmed = value.trim()
      return trimmed.length === 0 ? null : trimmed.toLowerCase()
    }, z.string().email().nullable())
    .optional(),
  loginPassword: z
    .preprocess((value) => {
      if (typeof value !== 'string') {
        return undefined
      }
      const trimmed = value.trim()
      return trimmed.length === 0 ? undefined : trimmed
    }, z.string().min(6).max(128).optional())
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

function normalizeAvailableOptionSettings(
  raw: unknown
): Array<{ optionId: string; visibility: 'public' | 'internal' }> {
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
    .filter((entry): entry is { optionId: string; visibility: 'public' | 'internal' } =>
      Boolean(entry)
    )

  const seen = new Set<string>()
  return normalized.filter((entry) => {
    if (seen.has(entry.optionId)) {
      return false
    }
    seen.add(entry.optionId)
    return true
  })
}

async function optionsBelongToStore(optionIds: string[], storeId: string): Promise<boolean> {
  const uniqueOptionIds = Array.from(new Set(optionIds))
  if (uniqueOptionIds.length === 0) {
    return true
  }

  const options = await db.optionPrice.findMany({
    where: {
      id: { in: uniqueOptionIds },
      storeId,
    },
    select: { id: true },
  })
  const availableOptionIds = new Set(options.map((option) => option.id))

  return uniqueOptionIds.every((optionId) => availableOptionIds.has(optionId))
}

function invalidStoreOptionResponse() {
  return NextResponse.json(
    { error: 'One or more options are unavailable for this store' },
    { status: 400 }
  )
}

function containsManagedLineUserId(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.hasOwnProperty.call(value, 'lineUserId')
  )
}

function managedLineUserIdResponse() {
  return NextResponse.json(
    { error: 'LINE user ID is managed by the secure linking flow' },
    { status: 400 }
  )
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
    publicProfile: normalizePublicProfile(base.publicProfile),
    appointments: base.appointments ?? [],
    mediaComment: base.mediaComment ?? '',
    mediaCommentSource: base.mediaCommentSource ?? 'manual',
    mediaSyncExcluded: Boolean(base.mediaSyncExcluded),
    scheduleTemplates: Array.isArray(base.scheduleTemplates) ? base.scheduleTemplates : [],
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

async function fetchCastListWithRelations(
  storeId: string,
  pagination: { take: number; skip: number }
) {
  try {
    return await db.cast.findMany({
      where: { storeId },
      take: pagination.take,
      skip: pagination.skip,
      orderBy: [{ nameKana: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        nameKana: true,
        age: true,
        height: true,
        bust: true,
        waist: true,
        hip: true,
        type: true,
        image: true,
        images: true,
        description: true,
        mediaComment: true,
        mediaCommentSource: true,
        mediaSyncExcluded: true,
        scheduleTemplates: true,
        publicProfile: true,
        netReservation: true,
        requestAttendanceEnabled: true,
        specialDesignationFee: true,
        specialDesignationFeeId: true,
        specialDesignationFeeTier: { select: { name: true, price: true } },
        regularDesignationFee: true,
        panelDesignationRank: true,
        regularDesignationRank: true,
        workStatus: true,
        employmentStatus: true,
        availableOptions: true,
        welfareExpenseRate: true,
        storeId: true,
        createdAt: true,
        updatedAt: true,
        schedules: true,
        castOptionSettings: true,
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
        take: pagination.take,
        skip: pagination.skip,
        orderBy: [{ nameKana: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }],
      })
    }
    throw error
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')

  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const authError = await requireAdmin({ permissions: 'cast:read', storeId })
    if (authError) return authError

    if (id) {
      const cast = await fetchCastWithRelations(id, storeId)

      if (!cast) {
        return NextResponse.json({ error: 'Cast not found' }, { status: 404 })
      }

      const transformedCast = transformCast(cast)

      return NextResponse.json(sanitizeResponseData(transformedCast))
    }

    const requestedLimit = Number.parseInt(searchParams.get('limit') ?? '25', 10)
    const requestedOffset = Number.parseInt(searchParams.get('offset') ?? '0', 10)
    const take = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 25
    const skip = Number.isInteger(requestedOffset) ? Math.max(requestedOffset, 0) : 0
    const casts = await fetchCastListWithRelations(storeId, { take, skip })

    // Transform database results to match frontend expectations
    const transformedCasts = casts.map(transformCast)

    return NextResponse.json(sanitizeResponseData(transformedCasts))
  } catch (error) {
    logger.error({ err: error }, 'Error fetching cast data')
    if (isUnknownStoreError(error)) {
      return NextResponse.json({ error: 'Unknown store' }, { status: 404 })
    }
    if (!env.featureFlags.useMockFallbacks) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
    if (id) {
      const fallbackCast = castMembers.find((cast) => cast.id === id)
      if (!fallbackCast) {
        return NextResponse.json({ error: 'Cast not found' }, { status: 404 })
      }
      return NextResponse.json(sanitizeResponseData(transformCast(fallbackCast)))
    }

    return NextResponse.json(sanitizeResponseData(castMembers.map(transformCast)))
  }
}

export async function POST(request: NextRequest) {
  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const authError = await requireAdmin({ permissions: 'cast:create', storeId })
    if (authError) return authError

    const body = await request.json()

    if (containsManagedLineUserId(body)) {
      return managedLineUserIdResponse()
    }

    // Validate request body
    const validatedData = castSchema.parse(body)

    const {
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

    if (
      !(await optionsBelongToStore(
        optionSettingsToCreate.map((entry) => entry.optionId),
        storeId
      ))
    ) {
      return invalidStoreOptionResponse()
    }

    const images = Array.isArray(imageList) ? imageList : []
    const normalizedWelfare =
      welfareExpenseRate === null || welfareExpenseRate === undefined
        ? null
        : Number(welfareExpenseRate)

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
        castOptionSettings:
          optionSettingsToCreate.length > 0 ? { create: optionSettingsToCreate } : undefined,
      },
      include: {
        castOptionSettings: true,
      },
    })

    logger.info({ castId: cast.id }, 'Cast created successfully')

    return NextResponse.json(sanitizeResponseData(transformCast(cast)), { status: 201 })
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
  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const authError = await requireAdmin({ permissions: 'cast:update', storeId })
    if (authError) return authError

    const body = await request.json()

    if (containsManagedLineUserId(body)) {
      return managedLineUserIdResponse()
    }

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
      if (
        !(await optionsBelongToStore(
          normalizedOptionSettings.map((entry) => entry.optionId),
          storeId
        ))
      ) {
        return invalidStoreOptionResponse()
      }

      updatePayload.availableOptions = normalizedOptionSettings.map((entry) => entry.optionId)
    }

    if (welfareExpenseRate !== undefined) {
      updatePayload.welfareExpenseRate =
        welfareExpenseRate === null ? null : new Prisma.Decimal(Number(welfareExpenseRate))
    }

    if (loginEmail !== undefined) {
      updatePayload.loginEmail = loginEmail === null ? null : loginEmail.trim().toLowerCase()
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

    return NextResponse.json(sanitizeResponseData(transformCast(refreshedCast ?? cast)))
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
  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const authError = await requireAdmin({ permissions: 'cast:delete', storeId })
    if (authError) return authError

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

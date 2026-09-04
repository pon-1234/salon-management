/**
 * @design_doc   Option pricing API endpoints for CRUD operations
 * @related_to   PricingRepository, Option type, Prisma OptionPrice model
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { hasPermission } from '@/lib/auth/permissions'
import { canAdminAccessStore } from '@/lib/auth/store-access'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import logger from '@/lib/logger'
import { defaultOptions } from '@/lib/pricing/data'
import { resolveStoreId, ensureStoreId } from '@/lib/store/server'
import { isUnknownStoreError } from '@/lib/store/errors'
import { sanitizeResponseData } from '@/lib/http/sanitize-response'
import { env } from '@/lib/config/env'
import { toPublicOption } from '@/lib/pricing/public'
import { isVisibleReservationOption } from '@/lib/options/visibility'

const PRICING_PRIVATE_CAST_FIELDS = ['loginEmail', 'lineUserId', 'welfareExpenseRate']
const OPTION_VISIBILITIES = ['public', 'internal'] as const
type OptionVisibility = (typeof OPTION_VISIBILITIES)[number]

function isOptionVisibility(value: unknown): value is OptionVisibility {
  return value === 'public' || value === 'internal'
}

interface OptionUpdatePayload {
  name?: string
  description?: string | null
  price?: number
  duration?: number | null
  category?: string
  displayOrder?: number
  isActive?: boolean
  visibility?: OptionVisibility
  note?: string | null
  storeShare?: number | null
  castShare?: number | null
}

interface OptionCreatePayload extends OptionUpdatePayload {
  name: string
  description: string | null
  price: number
  category: string
  displayOrder: number
  isActive: boolean
  visibility: OptionVisibility
}

class OptionValidationError extends Error {
  constructor(
    readonly path: string[],
    message: string
  ) {
    super(message)
    this.name = 'OptionValidationError'
  }
}

function sanitizePricingResponse<T>(value: T): T {
  return sanitizeResponseData(value, PRICING_PRIVATE_CAST_FIELDS)
}

function normalizeNumber(value: unknown, fallback: number | null = null): number | null {
  if (value === null || value === undefined || value === '') return fallback
  const num = Number(value)
  if (!Number.isFinite(num)) {
    return fallback
  }
  return Math.trunc(num)
}

function isInputRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asInputRecord(value: unknown): Record<string, unknown> {
  return isInputRecord(value) ? value : {}
}

function parseNonNegativeInteger(value: unknown, path: string): number | null {
  if (value === null) return null
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim().length > 0
        ? Number(value)
        : Number.NaN

  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new OptionValidationError([path], `${path} must be a non-negative integer`)
  }
  return parsed
}

function validateRevenueSplit(
  price: number,
  storeShare: number | null,
  castShare: number | null
): void {
  if (storeShare !== null && storeShare > price) {
    throw new OptionValidationError(['storeShare'], 'Store share must not exceed the option price')
  }
  if (castShare !== null && castShare > price) {
    throw new OptionValidationError(['castShare'], 'Cast share must not exceed the option price')
  }
  if (storeShare !== null && castShare !== null && storeShare + castShare !== price) {
    throw new OptionValidationError(
      ['storeShare', 'castShare'],
      'Store and cast shares must total the option price'
    )
  }
}

function buildOptionPayload(data: unknown, mode: 'create'): OptionCreatePayload
function buildOptionPayload(data: unknown, mode: 'update'): OptionUpdatePayload
function buildOptionPayload(
  data: unknown,
  mode: 'create' | 'update'
): OptionCreatePayload | OptionUpdatePayload {
  const input = asInputRecord(data)
  const payload: OptionUpdatePayload = {}

  if (input.name !== undefined) {
    const name = typeof input.name === 'string' ? input.name.trim() : ''
    if (!name) {
      throw new OptionValidationError(['name'], 'Name is required')
    }
    payload.name = name
  } else if (mode === 'create') {
    throw new OptionValidationError(['name'], 'Name is required')
  }

  if (input.description !== undefined) {
    payload.description = input.description ? String(input.description) : null
  } else if (mode === 'create') {
    payload.description = null
  }

  if (input.price !== undefined) {
    payload.price = parseNonNegativeInteger(input.price, 'price') ?? 0
  } else if (mode === 'create') {
    payload.price = 0
  }

  if (input.duration !== undefined) {
    payload.duration = normalizeNumber(input.duration)
  }

  if (input.category !== undefined) {
    const category = input.category ? String(input.category) : 'special'
    payload.category = category
  } else if (mode === 'create') {
    payload.category = 'special'
  }

  if (input.displayOrder !== undefined) {
    payload.displayOrder = normalizeNumber(input.displayOrder, 0) ?? 0
  } else if (mode === 'create') {
    payload.displayOrder = 0
  }

  if (input.isActive !== undefined) {
    payload.isActive = Boolean(input.isActive)
  } else if (mode === 'create') {
    payload.isActive = true
  }

  if (input.visibility !== undefined) {
    if (!isOptionVisibility(input.visibility)) {
      throw new OptionValidationError(['visibility'], 'Visibility is invalid')
    }
    payload.visibility = input.visibility
  } else if (mode === 'create') {
    payload.visibility = 'public'
  }

  if (input.note !== undefined) {
    payload.note = input.note ? String(input.note) : null
  }

  if (input.storeShare !== undefined) {
    payload.storeShare = parseNonNegativeInteger(input.storeShare, 'storeShare')
  }

  if (input.castShare !== undefined) {
    payload.castShare = parseNonNegativeInteger(input.castShare, 'castShare')
  }

  if (mode === 'create') {
    if (payload.name === undefined) {
      throw new OptionValidationError(['name'], 'Name is required')
    }
    const createPayload: OptionCreatePayload = {
      ...payload,
      name: payload.name,
      description: payload.description ?? null,
      price: payload.price ?? 0,
      category: payload.category ?? 'special',
      displayOrder: payload.displayOrder ?? 0,
      isActive: payload.isActive ?? true,
      visibility: payload.visibility ?? 'public',
    }
    validateRevenueSplit(
      createPayload.price,
      createPayload.storeShare ?? null,
      createPayload.castShare ?? null
    )
    return createPayload
  }
  return payload
}

function validationResponse(error: OptionValidationError) {
  return NextResponse.json(
    {
      error: 'Validation error',
      details: [{ path: error.path, message: error.message }],
    },
    { status: 400 }
  )
}

function hasErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    Reflect.get(error, 'code') === code
  )
}

async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  return session
}

function canManagePricing(session: Session, storeId: string, permission: string): boolean {
  return (
    session.user.role === 'admin' &&
    hasPermission(session.user.permissions, permission) &&
    canAdminAccessStore(session.user, storeId)
  )
}

function forbiddenResponse() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

function buildFallbackOptionResponse(id: string | null, isAdmin: boolean) {
  if (id) {
    const option = defaultOptions.find((item) => item.id === id)
    if (!option) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 })
    }
    const payload = isAdmin ? { ...option, reservations: [] } : toPublicOption(option)
    return NextResponse.json(payload)
  }

  const payload = defaultOptions.map((option) =>
    isAdmin ? { ...option, reservations: [] } : toPublicOption(option)
  )
  return NextResponse.json(payload)
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')
  let isAdmin = false

  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const session = await getServerSession(authOptions)
    if (session?.user?.role === 'admin') {
      if (!canManagePricing(session, storeId, 'pricing:read')) {
        return forbiddenResponse()
      }
      isAdmin = true
    }

    if (id) {
      const option = await db.optionPrice.findFirst({
        where: {
          id,
          storeId,
          ...(isAdmin
            ? { archivedAt: null }
            : { visibility: 'public', isActive: true, archivedAt: null }),
        },
        include: {
          reservations: {
            include: {
              reservation: {
                include: {
                  customer: true,
                  cast: true,
                },
              },
            },
          },
        },
      })

      if (!option || !isVisibleReservationOption(option)) {
        return NextResponse.json({ error: 'Option not found' }, { status: 404 })
      }

      if (isAdmin) {
        return NextResponse.json(sanitizePricingResponse(option))
      }

      if (option.visibility !== 'public') {
        return NextResponse.json({ error: 'Option not found' }, { status: 404 })
      }

      return NextResponse.json(toPublicOption(option))
    }

    const options = await db.optionPrice.findMany({
      where: {
        storeId,
        ...(isAdmin
          ? { archivedAt: null }
          : { visibility: 'public', isActive: true, archivedAt: null }),
      },
      include: {
        reservations: {
          include: {
            reservation: {
              include: {
                customer: true,
                cast: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          displayOrder: 'asc',
        },
        {
          price: 'asc',
        },
      ],
    })

    const selectableOptions = options.filter(isVisibleReservationOption)

    if (isAdmin) {
      return NextResponse.json(sanitizePricingResponse(selectableOptions))
    }

    return NextResponse.json(selectableOptions.map(toPublicOption))
  } catch (error) {
    logger.error({ err: error }, 'Error fetching option data')
    if (isUnknownStoreError(error)) {
      return NextResponse.json({ error: 'Unknown store' }, { status: 404 })
    }
    if (!env.featureFlags.useMockFallbacks) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
    return buildFallbackOptionResponse(id, isAdmin)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    if (session instanceof NextResponse) {
      return session
    }

    const storeId = await ensureStoreId(await resolveStoreId(request))
    if (!canManagePricing(session, storeId, 'pricing:create')) {
      return forbiddenResponse()
    }

    const data = await request.json()

    let payload
    try {
      payload = buildOptionPayload(data, 'create')
    } catch (error) {
      if (error instanceof OptionValidationError) return validationResponse(error)
      throw error
    }

    const newOption = await db.optionPrice.create({
      data: {
        ...payload,
        storeId,
      } satisfies Prisma.OptionPriceUncheckedCreateInput,
      include: {
        reservations: true,
      },
    })

    return NextResponse.json(sanitizePricingResponse(newOption), { status: 201 })
  } catch (error) {
    logger.error({ err: error }, 'Error creating option')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSession()
    if (session instanceof NextResponse) {
      return session
    }

    const storeId = await ensureStoreId(await resolveStoreId(request))
    if (!canManagePricing(session, storeId, 'pricing:update')) {
      return forbiddenResponse()
    }

    const data = asInputRecord(await request.json())
    const { id, ...updates } = data

    if (typeof id !== 'string' || !id.trim()) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }
    const optionId = id.trim()

    let payload
    try {
      payload = buildOptionPayload(updates, 'update')
    } catch (error) {
      if (error instanceof OptionValidationError) return validationResponse(error)
      throw error
    }

    const existingOption = await db.optionPrice.findFirst({
      where: { id: optionId, storeId },
      include: {
        reservations: {
          include: {
            reservation: {
              include: {
                customer: true,
                cast: true,
              },
            },
          },
        },
      },
    })

    if (!existingOption) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 })
    }

    const changesRevenueSplit = ['price', 'storeShare', 'castShare'].some((field) =>
      Object.prototype.hasOwnProperty.call(payload, field)
    )
    if (changesRevenueSplit) {
      try {
        validateRevenueSplit(
          payload.price ?? existingOption.price,
          Object.prototype.hasOwnProperty.call(payload, 'storeShare')
            ? (payload.storeShare ?? null)
            : (existingOption.storeShare ?? null),
          Object.prototype.hasOwnProperty.call(payload, 'castShare')
            ? (payload.castShare ?? null)
            : (existingOption.castShare ?? null)
        )
      } catch (error) {
        if (error instanceof OptionValidationError) return validationResponse(error)
        throw error
      }
    }

    const updatedOption = await db.optionPrice.update({
      where: { id: optionId },
      data: {
        ...payload,
        ...(payload.isActive === undefined
          ? {}
          : { archivedAt: payload.isActive ? null : new Date() }),
      } satisfies Prisma.OptionPriceUncheckedUpdateInput,
      include: {
        reservations: {
          include: {
            reservation: {
              include: {
                customer: true,
                cast: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(sanitizePricingResponse(updatedOption))
  } catch (error) {
    logger.error({ err: error }, 'Error updating option')
    if (hasErrorCode(error, 'P2025')) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 })
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

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const storeId = await ensureStoreId(await resolveStoreId(request))
    if (!canManagePricing(session, storeId, 'pricing:delete')) {
      return forbiddenResponse()
    }

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const existingOption = await db.optionPrice.findFirst({
      where: { id, storeId },
    })

    if (!existingOption) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 })
    }

    await db.optionPrice.update({
      where: { id },
      data: {
        isActive: false,
        archivedAt: new Date(),
      },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    logger.error({ err: error }, 'Error deleting option')
    if (hasErrorCode(error, 'P2025')) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

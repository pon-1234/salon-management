/**
 * @design_doc   Designation fee CRUD API
 * @related_to   Designation settings, reservation UI
 * @known_issues Development fallback data is still supported for reads
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import logger from '@/lib/logger'
import { DEFAULT_DESIGNATION_FEES, normalizeDesignationShares } from '@/lib/designation/fees'
import { inferDesignationKindFromName, isDesignationFeeKind } from '@/lib/designation/kind'
import { resolveStoreId, ensureStoreId } from '@/lib/store/server'
import { isUnknownStoreError } from '@/lib/store/errors'
import { requireAdmin } from '@/lib/auth/utils'
import { env } from '@/lib/config/env'
import { toPublicDesignationFee } from '@/lib/pricing/public'

function normalizeNumber(value: unknown, fallback: number | null = null): number | null {
  if (value === null || value === undefined || value === '') return fallback
  const num = Number(value)
  if (!Number.isFinite(num)) {
    return fallback
  }
  return Math.trunc(num)
}

function buildDesignationPayload(data: any, mode: 'create' | 'update' = 'create') {
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
    payload.description = data.description ? data.description.toString() : null
  } else if (mode === 'create') {
    payload.description = null
  }

  if (data.price !== undefined || mode === 'create') {
    const price = Math.max(0, normalizeNumber(data.price, 0) ?? 0)
    payload.price = price
    const normalized = normalizeDesignationShares(
      price,
      normalizeNumber(data.storeShare ?? payload.storeShare ?? 0, 0) ?? 0,
      normalizeNumber(data.castShare ?? payload.castShare ?? 0, 0) ?? 0
    )
    payload.storeShare = normalized.storeShare
    payload.castShare = normalized.castShare
  }

  if (data.storeShare !== undefined || data.castShare !== undefined) {
    const normalized = normalizeDesignationShares(
      payload.price ?? normalizeNumber(data.price, 0) ?? 0,
      normalizeNumber(data.storeShare ?? payload.storeShare ?? 0, 0) ?? 0,
      normalizeNumber(data.castShare ?? payload.castShare ?? 0, 0) ?? 0
    )
    payload.storeShare = normalized.storeShare
    payload.castShare = normalized.castShare
  }

  if (data.sortOrder !== undefined) {
    payload.sortOrder = Math.max(0, normalizeNumber(data.sortOrder, 0) ?? 0)
  } else if (mode === 'create') {
    payload.sortOrder = 0
  }

  if (data.isActive !== undefined) {
    payload.isActive = Boolean(data.isActive)
  } else if (mode === 'create') {
    payload.isActive = true
  }

  if (data.kind !== undefined) {
    if (!isDesignationFeeKind(data.kind)) {
      throw new Error('KIND_INVALID')
    }
    payload.kind = data.kind
  } else if (mode === 'create') {
    payload.kind = inferDesignationKindFromName(
      typeof payload.name === 'string' ? payload.name : data.name
    )
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

function buildFallbackResponse(id: string | null, includeInactive: boolean, isAdmin: boolean) {
  const items = includeInactive
    ? DEFAULT_DESIGNATION_FEES
    : DEFAULT_DESIGNATION_FEES.filter((fee) => fee.isActive)

  if (id) {
    const fee = items.find((item) => item.id === id)
    if (!fee) {
      return NextResponse.json({ error: 'Designation fee not found' }, { status: 404 })
    }
    return NextResponse.json(isAdmin ? fee : toPublicDesignationFee(fee))
  }

  const sorted = items.sort((a, b) => a.sortOrder - b.sortOrder)
  return NextResponse.json(isAdmin ? sorted : sorted.map(toPublicDesignationFee))
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')
  const requestedIncludeInactive = searchParams.get('includeInactive') === 'true'

  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const session = await requireSession()
    if (session instanceof NextResponse) {
      return session
    }
    const isAdmin = session.user.role === 'admin'
    if (isAdmin) {
      const authError = await requireAdmin({ permissions: 'pricing:read', storeId })
      if (authError) return authError
    }
    const includeInactive = isAdmin && requestedIncludeInactive

    if (id) {
      const fee = await db.designationFee.findFirst({
        where: { id, storeId, ...(isAdmin ? {} : { isActive: true }) },
      })

      if (!fee || (!includeInactive && !fee.isActive)) {
        return NextResponse.json({ error: 'Designation fee not found' }, { status: 404 })
      }
      return NextResponse.json(isAdmin ? fee : toPublicDesignationFee(fee))
    }

    const fees = await db.designationFee.findMany({
      where: {
        storeId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }, { name: 'asc' }],
    })

    if (!fees.length && env.featureFlags.useMockFallbacks) {
      return buildFallbackResponse(null, includeInactive, isAdmin)
    }

    return NextResponse.json(isAdmin ? fees : fees.map(toPublicDesignationFee))
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch designation fees')
    if (isUnknownStoreError(error)) {
      return NextResponse.json({ error: 'Unknown store' }, { status: 404 })
    }
    if (!env.featureFlags.useMockFallbacks) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
    return buildFallbackResponse(id, false, false)
  }
}

export async function POST(request: NextRequest) {
  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const authError = await requireAdmin({ permissions: 'pricing:create', storeId })
    if (authError) return authError

    const body = await request.json()
    const payload = buildDesignationPayload(body, 'create')

    const result = await db.designationFee.create({
      data: {
        ...(payload as Prisma.DesignationFeeUncheckedCreateInput),
        storeId,
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    logger.error({ err: error }, 'Failed to create designation fee')
    const message =
      error instanceof Error && error.message === 'NAME_REQUIRED'
        ? '名称は必須です'
        : error instanceof Error && error.message === 'KIND_INVALID'
          ? '指名種別が不正です'
          : '指名料の作成に失敗しました'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const authError = await requireAdmin({ permissions: 'pricing:update', storeId })
    if (authError) return authError

    const body = await request.json()
    const { id, ...rest } = body ?? {}
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const existingFee = await db.designationFee.findFirst({
      where: { id, storeId },
    })

    if (!existingFee) {
      return NextResponse.json({ error: 'Designation fee not found' }, { status: 404 })
    }

    const payload = buildDesignationPayload(rest, 'update')

    const result = await db.designationFee.update({
      where: { id },
      data: payload,
    })

    return NextResponse.json(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to update designation fee')
    return NextResponse.json({ error: '指名料の更新に失敗しました' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const authError = await requireAdmin({ permissions: 'pricing:delete', storeId })
    if (authError) return authError

    const existingFee = await db.designationFee.findFirst({
      where: { id, storeId },
    })

    if (!existingFee) {
      return NextResponse.json({ error: 'Designation fee not found' }, { status: 404 })
    }

    await db.designationFee.delete({
      where: { id },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete designation fee')
    if (isUnknownStoreError(error)) {
      return NextResponse.json({ error: 'Unknown store' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

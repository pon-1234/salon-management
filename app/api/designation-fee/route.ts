/**
 * @design_doc   Designation fee CRUD API
 * @related_to   Designation settings, reservation UI
 * @known_issues Relies on authenticated session for mutations
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import logger from '@/lib/logger'
import {
  DEFAULT_DESIGNATION_FEES,
  normalizeDesignationShares,
} from '@/lib/designation/fees'
import { resolveStoreId, ensureStoreId } from '@/lib/store/server'

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

  return payload
}

async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  return session
}

function buildFallbackResponse(id: string | null, includeInactive: boolean) {
  const items = includeInactive
    ? DEFAULT_DESIGNATION_FEES
    : DEFAULT_DESIGNATION_FEES.filter((fee) => fee.isActive)

  if (id) {
    const fee = items.find((item) => item.id === id)
    if (!fee) {
      return NextResponse.json({ error: 'Designation fee not found' }, { status: 404 })
    }
    return NextResponse.json(fee)
  }

  return NextResponse.json(items.sort((a, b) => a.sortOrder - b.sortOrder))
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')
  const storeId = await ensureStoreId(await resolveStoreId(request))
  const includeInactive = searchParams.get('includeInactive') === 'true'
  const storeId = await ensureStoreId(await resolveStoreId(request))

  try {
    const session = await requireSession()
    if (session instanceof NextResponse) {
      return session
    }

    if (id) {
      const fee = await db.designationFee.findFirst({
        where: { id, storeId },
      })

      if (!fee || (!includeInactive && !fee.isActive)) {
        return NextResponse.json({ error: 'Designation fee not found' }, { status: 404 })
      }
      return NextResponse.json(fee)
    }

    const fees = await db.designationFee.findMany({
      where: {
        storeId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }, { name: 'asc' }],
    })

    if (!fees.length) {
      return buildFallbackResponse(null, includeInactive)
    }

    return NextResponse.json(fees)
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch designation fees')
    return buildFallbackResponse(id, includeInactive)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    if (session instanceof NextResponse) {
      return session
    }

    const body = await request.json()
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const payload = buildDesignationPayload(body, 'create')

    const result = await db.designationFee.create({
      data: {
        ...payload,
        storeId,
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    logger.error({ err: error }, 'Failed to create designation fee')
    const message =
      error instanceof Error && error.message === 'NAME_REQUIRED'
        ? '名称は必須です'
        : '指名料の作成に失敗しました'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSession()
    if (session instanceof NextResponse) {
      return session
    }

    const body = await request.json()
    const storeId = await ensureStoreId(await resolveStoreId(request))
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
    const session = await requireSession()
    if (session instanceof NextResponse) {
      return session
    }

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
    return NextResponse.json({ error: '指名料の削除に失敗しました' }, { status: 400 })
  }
}

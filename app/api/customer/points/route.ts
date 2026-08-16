/**
 * @design_doc   Customer point-history access boundary
 * @related_to   CustomerPointHistory and customer:read permission
 * @known_issues None
 */
'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import logger from '@/lib/logger'
import { hasPermission } from '@/lib/auth/permissions'
import { canAdminAccessStore } from '@/lib/auth/store-access'
import { ensureStoreId, resolveStoreId } from '@/lib/store/server'

const HISTORY_TYPES = new Set(['earned', 'used', 'expired', 'adjusted'])

function parseNumber(value: string | null, fallback: number, min = 1, max = 100) {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const customerId = searchParams.get('customerId')
  const limit = parseNumber(searchParams.get('limit'), 20, 1, 100)
  const offset = parseNumber(searchParams.get('offset'), 0, 0, 1000)
  const typeParam = searchParams.get('type')

  if (!customerId) {
    return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
  }

  const isAdmin = session.user.role === 'admin'
  const isSelf = session.user.id === customerId

  if (isAdmin && !hasPermission(session.user.permissions ?? [], 'customer:read')) {
    return NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
  }

  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (isAdmin) {
    let storeId: string
    try {
      storeId = await ensureStoreId(await resolveStoreId(request))
    } catch {
      return NextResponse.json({ error: '店舗を確認してください' }, { status: 400 })
    }
    if (!canAdminAccessStore(session.user, storeId)) {
      return NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
    }

    const assignment = await db.customerStoreAssignment.findUnique({
      where: { customerId_storeId: { customerId, storeId } },
      select: { customerId: true },
    })
    if (!assignment) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
  }

  const filters: Record<string, unknown> = { customerId }
  if (typeParam) {
    if (!HISTORY_TYPES.has(typeParam)) {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
    filters.type = typeParam
  }

  try {
    const [history, total] = await Promise.all([
      db.customerPointHistory.findMany({
        where: filters,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.customerPointHistory.count({ where: filters }),
    ])

    return NextResponse.json({
      data: history,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch point history')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

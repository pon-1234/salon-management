/**
 * @design_doc   Customer point-balance access boundary
 * @related_to   Customer point ledger and customer:read permission
 * @known_issues Expiring balance requires FIFO point-lot allocation before cutover
 */
'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { addDays } from 'date-fns'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { getExpiringPoints } from '@/lib/point/utils'
import logger from '@/lib/logger'
import { hasPermission } from '@/lib/auth/permissions'
import { canAdminAccessStore } from '@/lib/auth/store-access'
import { ensureStoreId, resolveStoreId } from '@/lib/store/server'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const customerId = request.nextUrl.searchParams.get('customerId')
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

  let adminStoreId: string | undefined
  if (isAdmin) {
    try {
      adminStoreId = await ensureStoreId(await resolveStoreId(request))
    } catch {
      return NextResponse.json({ error: '店舗を確認してください' }, { status: 400 })
    }
    if (!canAdminAccessStore(session.user, adminStoreId)) {
      return NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
    }
  }

  try {
    const customer = await db.customer.findUnique({
      where: {
        id: customerId,
        ...(adminStoreId ? { storeAssignments: { some: { storeId: adminStoreId } } } : {}),
      },
      select: { points: true },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const expiringPoint = await getExpiringPoints(customerId, addDays(new Date(), 30))

    return NextResponse.json({
      balance: customer.points,
      expiringPoints: expiringPoint
        ? {
            amount: expiringPoint.amount,
            expiryDate: expiringPoint.expiresAt,
          }
        : null,
    })
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch customer point balance')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

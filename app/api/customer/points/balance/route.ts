'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { addDays } from 'date-fns'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { getExpiringPoints } from '@/lib/point/utils'
import logger from '@/lib/logger'

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
  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const customer = await db.customer.findUnique({
      where: { id: customerId },
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

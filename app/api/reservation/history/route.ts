/**
 * @design_doc   Reservation history authorization and store isolation boundary
 * @related_to   Reservation, ReservationHistory, requireAdmin, store resolver
 * @known_issues Actor names remain visible because the admin audit table displays who made a change
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import logger from '@/lib/logger'
import { requireAdmin } from '@/lib/auth/utils'
import { ensureStoreId, resolveStoreId } from '@/lib/store/server'

export async function GET(request: NextRequest) {
  try {
    const reservationId = request.nextUrl.searchParams.get('reservationId')

    if (!reservationId) {
      return NextResponse.json({ error: 'reservationId is required' }, { status: 400 })
    }

    const storeId = await ensureStoreId(await resolveStoreId(request))
    const authError = await requireAdmin({ permissions: 'reservation:read', storeId })
    if (authError) {
      return authError
    }

    const history = await db.reservationHistory.findMany({
      where: { reservationId, reservation: { storeId } },
      select: {
        id: true,
        reservationId: true,
        fieldName: true,
        fieldDisplayName: true,
        oldValue: true,
        newValue: true,
        reason: true,
        actorName: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(
      history.map((entry) => ({
        id: entry.id,
        reservationId: entry.reservationId,
        fieldName: entry.fieldName,
        fieldDisplayName: entry.fieldDisplayName,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        reason: entry.reason,
        actorName: entry.actorName,
        createdAt: entry.createdAt,
      }))
    )
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch reservation history')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

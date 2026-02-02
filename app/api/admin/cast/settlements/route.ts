import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { requireAdmin } from '@/lib/auth/utils'
import { getCastSettlements } from '@/lib/cast-portal/server'
import { upsertSettlementPayment } from '@/lib/settlement/server'
import { resolveStoreId, ensureStoreId } from '@/lib/store/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const castId = request.nextUrl.searchParams.get('castId')
  if (!castId) {
    return NextResponse.json({ error: 'castId が必要です' }, { status: 400 })
  }

  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const cast = await db.cast.findFirst({
      where: { id: castId, storeId },
      select: { id: true },
    })

    if (!cast) {
      return NextResponse.json({ error: 'キャストが見つかりません' }, { status: 404 })
    }

    const data = await getCastSettlements(castId, storeId)
    return NextResponse.json(data)
  } catch (err) {
    logger.error({ err, castId }, 'Failed to load admin cast settlements')
    return NextResponse.json({ error: '精算情報の取得に失敗しました。' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const body = await request.json()
    const { castId } = body ?? {}
    if (!castId) {
      return NextResponse.json({ error: 'castId が必要です' }, { status: 400 })
    }

    const storeId = await ensureStoreId(await resolveStoreId(request))
    const cast = await db.cast.findFirst({ where: { id: castId, storeId }, select: { id: true } })
    if (!cast) {
      return NextResponse.json({ error: 'キャストが見つかりません' }, { status: 404 })
    }

    const reservationIds = Array.isArray(body?.reservationIds)
      ? body.reservationIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
      : []

    if (reservationIds.length > 0) {
      const reservations = await db.reservation.findMany({
        where: {
          id: { in: reservationIds },
          castId,
          storeId,
        },
        select: { id: true },
      })
      const validIds = new Set(reservations.map((reservation) => reservation.id))
      const missingIds = reservationIds.filter((id: string) => !validIds.has(id))
      if (missingIds.length > 0) {
        return NextResponse.json(
          { error: '対象予約に不正なIDが含まれています', missingReservationIds: missingIds },
          { status: 400 }
        )
      }
    }

    const result = await upsertSettlementPayment({
      ...body,
      storeId,
      reservationIds,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    logger.error({ err }, 'Failed to save settlement payment')
    return NextResponse.json({ error: '入金記録の保存に失敗しました。' }, { status: 500 })
  }
}

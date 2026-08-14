/**
 * @design_doc   Admin cast settlement management with store-scoped reservation authorization
 * @related_to   getCastSettlements, upsertSettlementPayment, requireAdmin
 * @known_issues Settlement permissions share the reservation namespace until a dedicated namespace exists
 */
import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { requireAdmin } from '@/lib/auth/utils'
import { getCastSettlements } from '@/lib/cast-portal/server'
import { SettlementValidationError, upsertSettlementPayment } from '@/lib/settlement/server'
import { resolveStoreId, ensureStoreId } from '@/lib/store/server'
import { db } from '@/lib/db'

function settlementValidationMessage(message: string): string {
  const messages: Record<string, string> = {
    'At least one settlement reservation is required': '対象予約を1件以上選択してください。',
    'Settlement amount must be a positive integer': '支払金額が不正です。',
    'Settlement paidAt is invalid': '支払日時が不正です。',
    'Settlement payment not found': '対象の入金記録が見つかりません。',
    'Settlement reservation not found': '対象予約が見つかりません。',
    'Only completed, unallocated reservations can be settled':
      '完了済み・未精算の予約のみ選択できます。',
    'Settlement amount must equal selected reservation staff revenue':
      '支払金額が対象予約のキャスト取り分合計と一致しません。',
  }
  return messages[message] ?? '精算内容が不正です。'
}

export async function GET(request: NextRequest) {
  const castId = request.nextUrl.searchParams.get('castId')
  if (!castId) {
    return NextResponse.json({ error: 'castId が必要です' }, { status: 400 })
  }

  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const authError = await requireAdmin({ permissions: 'reservation:read', storeId })
    if (authError) return authError

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
  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const authError = await requireAdmin({ permissions: 'reservation:update', storeId })
    if (authError) return authError

    const body = await request.json()
    const { castId } = body ?? {}
    if (!castId) {
      return NextResponse.json({ error: 'castId が必要です' }, { status: 400 })
    }

    const cast = await db.cast.findFirst({ where: { id: castId, storeId }, select: { id: true } })
    if (!cast) {
      return NextResponse.json({ error: 'キャストが見つかりません' }, { status: 404 })
    }

    const reservationIds = Array.isArray(body?.reservationIds)
      ? body.reservationIds.filter(
          (id: unknown): id is string => typeof id === 'string' && id.trim().length > 0
        )
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
    if (err instanceof SettlementValidationError) {
      return NextResponse.json({ error: settlementValidationMessage(err.message) }, { status: 400 })
    }
    logger.error({ err }, 'Failed to save settlement payment')
    return NextResponse.json({ error: '入金記録の保存に失敗しました。' }, { status: 500 })
  }
}

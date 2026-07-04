/**
 * @design_doc   Next 15 dynamic route params contract
 * @related_to   lib/cast-portal/server: loads cast-scoped reservation detail
 * @known_issues Detail shape is coupled to the cast portal reservation card
 */
import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { requireCast } from '@/lib/auth/utils'
import { getCastReservationDetail, resolveCastStoreId } from '@/lib/cast-portal/server'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: reservationId } = await params
  const { error, session } = await requireCast()
  if (error || !session) {
    return error ?? NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  try {
    const storeId = await resolveCastStoreId(session.user.id, session.user.storeId)
    const detail = await getCastReservationDetail(session.user.id, storeId, reservationId)

    if (!detail) {
      return NextResponse.json({ error: '予約が見つかりません。' }, { status: 404 })
    }

    return NextResponse.json(detail)
  } catch (err) {
    logger.error(
      { err, reservationId, castId: session.user.id },
      'Failed to load cast reservation detail'
    )
    return NextResponse.json({ error: '予約詳細の取得に失敗しました。' }, { status: 500 })
  }
}

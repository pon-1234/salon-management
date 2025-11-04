import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { requireCast } from '@/lib/auth/utils'
import { getCastReservationDetail, resolveCastStoreId } from '@/lib/cast-portal/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireCast()
  if (error || !session) {
    return error ?? NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  try {
    const storeId = await resolveCastStoreId(session.user.id, session.user.storeId)
    const detail = await getCastReservationDetail(session.user.id, storeId, params.id)

    if (!detail) {
      return NextResponse.json({ error: '予約が見つかりません。' }, { status: 404 })
    }

    return NextResponse.json(detail)
  } catch (err) {
    logger.error({ err, reservationId: params.id, castId: session.user.id }, 'Failed to load cast reservation detail')
    return NextResponse.json({ error: '予約詳細の取得に失敗しました。' }, { status: 500 })
  }
}

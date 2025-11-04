import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { requireCast } from '@/lib/auth/utils'
import { getCastReservations, resolveCastStoreId } from '@/lib/cast-portal/server'
import type { CastReservationScope } from '@/lib/cast-portal/types'

const SCOPE_VALUES: CastReservationScope[] = ['upcoming', 'past', 'today']

export async function GET(request: NextRequest) {
  const { error, session } = await requireCast()
  if (error || !session) {
    return error ?? NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const scopeParam = searchParams.get('scope')
  const limitParam = searchParams.get('limit')

  const scope = SCOPE_VALUES.includes(scopeParam as CastReservationScope)
    ? (scopeParam as CastReservationScope)
    : 'upcoming'
  const limit = limitParam ? Math.min(Math.max(Number(limitParam), 1), 100) : 20

  try {
    const storeId = await resolveCastStoreId(session.user.id, session.user.storeId)
    const data = await getCastReservations(session.user.id, storeId, { scope, limit })
    return NextResponse.json(data)
  } catch (err) {
    logger.error(
      { err, scope, castId: session.user.id },
      'Failed to load reservations for cast portal'
    )
    return NextResponse.json({ error: '予約情報の取得に失敗しました。' }, { status: 500 })
  }
}

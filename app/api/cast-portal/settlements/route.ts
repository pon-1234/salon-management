import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { requireCast } from '@/lib/auth/utils'
import { getCastSettlements, resolveCastStoreId } from '@/lib/cast-portal/server'

export async function GET(_request: NextRequest) {
  const { error, session } = await requireCast()
  if (error || !session) {
    return error ?? NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  try {
    const storeId = await resolveCastStoreId(session.user.id, session.user.storeId)
    const data = await getCastSettlements(session.user.id, storeId)
    return NextResponse.json(data)
  } catch (err) {
    logger.error({ err, castId: session.user.id }, 'Failed to load cast settlements')
    return NextResponse.json({ error: '精算情報の取得に失敗しました。' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { requireAdmin } from '@/lib/auth/utils'
import { getCastSettlements } from '@/lib/cast-portal/server'
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

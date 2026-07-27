/**
 * @design_doc   Admin settlement payment history with store-scoped reservation authorization
 * @related_to   listSettlementPayments, requireAdmin, store resolver
 * @known_issues Settlement permissions share the reservation namespace until a dedicated namespace exists
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { listSettlementPayments } from '@/lib/settlement/server'
import { ensureStoreId, resolveStoreId } from '@/lib/store/server'

export async function GET(request: NextRequest) {
  const castId = request.nextUrl.searchParams.get('castId')
  const requestedStoreId = request.nextUrl.searchParams.get('storeId')
  if (!castId || !requestedStoreId) {
    return NextResponse.json({ error: 'castId と storeId が必要です' }, { status: 400 })
  }

  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const authError = await requireAdmin({ permissions: 'reservation:read', storeId })
    if (authError) return authError

    const cast = await db.cast.findFirst({ where: { id: castId, storeId }, select: { id: true } })
    if (!cast) {
      return NextResponse.json({ error: 'キャストが見つかりません' }, { status: 404 })
    }
    const data = await listSettlementPayments(castId, storeId)
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: '入金記録の取得に失敗しました。' }, { status: 500 })
  }
}

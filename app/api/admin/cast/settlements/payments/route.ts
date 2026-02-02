import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { listSettlementPayments } from '@/lib/settlement/server'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const castId = request.nextUrl.searchParams.get('castId')
  const storeId = request.nextUrl.searchParams.get('storeId')
  if (!castId || !storeId) {
    return NextResponse.json({ error: 'castId と storeId が必要です' }, { status: 400 })
  }

  try {
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

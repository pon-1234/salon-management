/**
 * @design_doc   Store-wide settlement ledger for payment and settlement processing screens
 * @related_to   getStoreSettlementLedger, requireAdmin
 * @known_issues Legacy settlement history is not imported
 */
import { NextRequest, NextResponse } from 'next/server'
import { formatInTimeZone } from 'date-fns-tz'
import logger from '@/lib/logger'
import { requireAdmin } from '@/lib/auth/utils'
import { ensureStoreId, resolveStoreId } from '@/lib/store/server'
import { getStoreSettlementLedger } from '@/lib/settlement/store-ledger'

const JST_TIME_ZONE = 'Asia/Tokyo'

export async function GET(request: NextRequest) {
  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const authError = await requireAdmin({ permissions: 'reservation:read', storeId })
    if (authError) return authError

    const now = new Date()
    const year = Number(
      request.nextUrl.searchParams.get('year') ?? formatInTimeZone(now, JST_TIME_ZONE, 'yyyy')
    )
    const month = Number(
      request.nextUrl.searchParams.get('month') ?? formatInTimeZone(now, JST_TIME_ZONE, 'M')
    )
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: '年月が不正です' }, { status: 400 })
    }

    const data = await getStoreSettlementLedger(storeId, year, month)
    return NextResponse.json(data)
  } catch (err) {
    logger.error({ err }, 'Failed to load store settlement ledger')
    return NextResponse.json({ error: '精算情報の取得に失敗しました。' }, { status: 500 })
  }
}

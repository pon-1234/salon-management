/**
 * @design_doc   Store-authorized cast-scoped completed-reservation analytics API
 * @related_to   getCastPerformanceReport and requireAnalyticsAccess
 * @known_issues Only month-granularity reports are supported
 */
import { NextRequest, NextResponse } from 'next/server'

import { getCastPerformanceReport } from '@/lib/analytics/server/cast-performance'
import { requireAnalyticsAccess } from '@/lib/analytics/server/access'
import logger from '@/lib/logger'

export async function GET(request: NextRequest) {
  const { storeId, error } = await requireAnalyticsAccess(request)
  if (error) return error

  const castId = request.nextUrl.searchParams.get('castId')?.trim()
  if (!castId) {
    return NextResponse.json({ error: 'castId が必要です。' }, { status: 400 })
  }

  const yearParam = request.nextUrl.searchParams.get('year')
  const year = Number(yearParam)
  if (!yearParam || !Number.isInteger(year) || year < 1 || year > 9999) {
    return NextResponse.json({ error: 'year が不正です。' }, { status: 400 })
  }

  const monthParam = request.nextUrl.searchParams.get('month')
  const month = Number(monthParam)
  if (!monthParam || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'month が不正です。' }, { status: 400 })
  }

  try {
    const report = await getCastPerformanceReport(year, month, castId, storeId)
    if (!report) {
      return NextResponse.json({ error: 'キャストが見つかりません。' }, { status: 404 })
    }
    return NextResponse.json(report)
  } catch (caught) {
    logger.error(
      { err: caught, castId, storeId, year, month },
      'Failed to aggregate cast performance'
    )
    return NextResponse.json({ error: '就業成績の集計に失敗しました。' }, { status: 500 })
  }
}

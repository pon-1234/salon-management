/**
 * @design_doc   Multi-store analytics authorization boundary
 * @related_to   requireAnalyticsAccess guards the requested store before report generation
 * @known_issues URLs without storeId remain bound to the legacy fallback store
 */
import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { requireAnalyticsAccess } from '@/lib/analytics/server/access'
import { generateDailyReport } from '@/lib/report/usecases'

export async function GET(request: NextRequest) {
  const { storeId, error } = await requireAnalyticsAccess(request)
  if (error) return error

  try {
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    if (!dateParam) {
      return NextResponse.json({ message: 'date is required' }, { status: 400 })
    }

    const report = await generateDailyReport(dateParam, storeId)
    return NextResponse.json(report, { status: 200 })
  } catch (error) {
    logger.error('[analytics.daily-report] failed to build report', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

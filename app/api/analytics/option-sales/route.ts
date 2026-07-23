/**
 * @design_doc   Multi-store analytics authorization boundary
 * @related_to   requireAnalyticsAccess guards the requested store before report generation
 * @known_issues URLs without storeId remain bound to the legacy fallback store
 */
import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { getOptionSalesReport } from '@/lib/analytics/server'
import { requireAnalyticsAccess } from '@/lib/analytics/server/access'

export async function GET(request: NextRequest) {
  const { storeId, error } = await requireAnalyticsAccess(request)
  if (error) return error

  try {
    const searchParams = request.nextUrl.searchParams
    const yearParam = searchParams.get('year')
    if (!yearParam) {
      return NextResponse.json({ message: 'year is required' }, { status: 400 })
    }

    const year = Number(yearParam)
    if (!Number.isInteger(year)) {
      return NextResponse.json({ message: 'Invalid year parameter' }, { status: 400 })
    }

    const report = await getOptionSalesReport(year, storeId)
    return NextResponse.json(report, { status: 200 })
  } catch (error) {
    logger.error('[analytics.option-sales] failed to build report', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

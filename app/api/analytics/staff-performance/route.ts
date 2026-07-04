/**
 * @design_doc   refactor-instructions.md Phase 6 D-11 analytics real-data connection
 * @related_to   getStaffPerformanceReport: database-backed staff performance aggregation
 * @known_issues Baseline analytics route coverage is representative, not exhaustive
 */
import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { requireAdmin } from '@/lib/auth/utils'
import { getStaffPerformanceReport } from '@/lib/analytics/server'
import { FALLBACK_STORE_ID } from '@/lib/analytics/server/common'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const searchParams = request.nextUrl.searchParams
    const yearParam = searchParams.get('year')
    const monthParam = searchParams.get('month')
    const storeId = searchParams.get('storeId') ?? FALLBACK_STORE_ID

    if (!yearParam || !monthParam) {
      return NextResponse.json({ message: 'year and month are required' }, { status: 400 })
    }

    const year = Number(yearParam)
    const month = Number(monthParam)
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ message: 'Invalid year or month parameter' }, { status: 400 })
    }

    const report = await getStaffPerformanceReport(year, month, storeId)
    return NextResponse.json(report, { status: 200 })
  } catch (error) {
    logger.error('[analytics.staff-performance] failed to build report', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

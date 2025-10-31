import { NextRequest, NextResponse } from 'next/server'
import { getMonthlyStaffSummary } from '@/lib/analytics/server'
import { FALLBACK_STORE_ID } from '@/lib/analytics/server/common'

export async function GET(request: NextRequest) {
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

    const report = await getMonthlyStaffSummary(year, month, storeId)
    return NextResponse.json(report, { status: 200 })
  } catch (error) {
    console.error('[analytics.monthly-staff] failed to build report', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

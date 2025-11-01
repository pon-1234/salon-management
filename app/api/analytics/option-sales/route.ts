import { NextRequest, NextResponse } from 'next/server'
import { getOptionSalesReport } from '@/lib/analytics/server'
import { FALLBACK_STORE_ID } from '@/lib/analytics/server/common'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const yearParam = searchParams.get('year')
    const storeId = searchParams.get('storeId') ?? FALLBACK_STORE_ID

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
    console.error('[analytics.option-sales] failed to build report', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

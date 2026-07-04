import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { requireAdmin } from '@/lib/auth/utils'
import { generateDailyReport } from '@/lib/report/usecases'

const FALLBACK_STORE_ID = 'ikebukuro'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    const storeId = searchParams.get('storeId') ?? FALLBACK_STORE_ID

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

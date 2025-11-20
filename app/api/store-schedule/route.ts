import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { ensureStoreId, resolveStoreId } from '@/lib/store/server'
import { getStoreScheduleDays } from '@/lib/store/public-schedule'

const MAX_DAYS = 14

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    const daysParam = searchParams.get('days')
    const requestedDays = daysParam ? Number(daysParam) : undefined
    const normalizedDays =
      typeof requestedDays === 'number' && Number.isFinite(requestedDays) && requestedDays > 0
        ? Math.min(Math.floor(requestedDays), MAX_DAYS)
        : undefined

    const storeId = await ensureStoreId(await resolveStoreId(request))
    const schedule = await getStoreScheduleDays(storeId, {
      startDate: dateParam ?? undefined,
      days: normalizedDays,
    })

    return NextResponse.json({ data: schedule })
  } catch (error) {
    logger.error({ err: error }, 'Failed to load store schedule')
    return NextResponse.json({ error: 'Failed to load schedule' }, { status: 500 })
  }
}

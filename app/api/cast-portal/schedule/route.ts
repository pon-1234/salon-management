import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns'
import logger from '@/lib/logger'
import { requireCast } from '@/lib/auth/utils'
import {
  getCastScheduleWindow,
  resolveCastStoreId,
  updateCastScheduleWindow,
  CastScheduleValidationError,
} from '@/lib/cast-portal/server'

const DEFAULT_WINDOW_DAYS = 7
const MAX_WINDOW_DAYS = 31

const scheduleUpdateSchema = z.object({
  startDate: z.string().optional(),
  days: z.number().int().min(1).max(MAX_WINDOW_DAYS).optional(),
  updates: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        status: z.enum(['working', 'off']),
        startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      })
    )
    .min(1),
})

function parseStartDate(params: URLSearchParams, fallback: Date): Date {
  const value = params.get('startDate')
  if (!value) {
    return fallback
  }

  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return fallback
  }
  return startOfDay(parsed)
}

function clampDays(raw: string | null, defaultValue: number): number {
  if (!raw) {
    return defaultValue
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return defaultValue
  }
  return Math.min(parsed, MAX_WINDOW_DAYS)
}

export async function GET(request: NextRequest) {
  const { error, session } = await requireCast()
  if (error || !session) {
    return error ?? NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const today = startOfDay(new Date())
    const startDate = parseStartDate(searchParams, today)
    const days = clampDays(searchParams.get('days'), DEFAULT_WINDOW_DAYS)
    const endDate = addDays(startDate, Math.max(days - 1, 0))

    const storeId = await resolveCastStoreId(session.user.id, session.user.storeId)
    const data = await getCastScheduleWindow(session.user.id, storeId, startDate, endDate)
    return NextResponse.json(data)
  } catch (err) {
    logger.error({ err, castId: session.user.id }, 'Failed to load cast schedule window')
    return NextResponse.json({ error: '出勤予定の取得に失敗しました。' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireCast()
  if (error || !session) {
    return error ?? NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = scheduleUpdateSchema.parse(body)

    const updateDates = parsed.updates.map((update) => new Date(`${update.date}T00:00:00`))
    const minDate = startOfDay(updateDates.reduce((acc, current) => (current < acc ? current : acc)))
    const maxDate = startOfDay(updateDates.reduce((acc, current) => (current > acc ? current : acc)))

    let baseStart = parsed.startDate ? new Date(`${parsed.startDate}T00:00:00`) : minDate
    if (Number.isNaN(baseStart.getTime())) {
      baseStart = minDate
    }
    baseStart = startOfDay(baseStart)

    const computedDays = differenceInCalendarDays(maxDate, baseStart) + 1
    const desiredDays = parsed.days ?? computedDays
    const normalizedDays = Math.min(Math.max(desiredDays, 1), MAX_WINDOW_DAYS)
    const endDate = addDays(baseStart, Math.max(normalizedDays - 1, 0))

    const storeId = await resolveCastStoreId(session.user.id, session.user.storeId)

    const window = await updateCastScheduleWindow(session.user.id, storeId, parsed.updates, {
      startDate: baseStart,
      endDate,
    })

    return NextResponse.json(window)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '入力内容が正しくありません。' }, { status: 400 })
    }

    if (err instanceof CastScheduleValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }

    logger.error({ err, castId: session?.user.id }, 'Failed to update cast schedule window')
    return NextResponse.json({ error: '出勤予定の更新に失敗しました。' }, { status: 500 })
  }
}

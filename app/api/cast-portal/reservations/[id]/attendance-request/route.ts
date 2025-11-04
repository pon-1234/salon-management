import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import logger from '@/lib/logger'
import { db } from '@/lib/db'
import { requireCast } from '@/lib/auth/utils'
import {
  resolveCastStoreId,
  serializeAttendanceRequests,
} from '@/lib/cast-portal/server'

const attendanceRequestSchema = z.object({
  type: z.enum(['check-in', 'check-out', 'adjustment']),
  requestedTime: z.string().datetime(),
  reason: z.string().trim().max(500).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireCast()
  if (error || !session) {
    return error ?? NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const parseResult = attendanceRequestSchema.safeParse(await request.json())
  if (!parseResult.success) {
    return NextResponse.json({ error: '不正な入力です。' }, { status: 400 })
  }

  const { type, requestedTime, reason } = parseResult.data
  const requestedAt = new Date(requestedTime)

  if (Number.isNaN(requestedAt.getTime())) {
    return NextResponse.json({ error: '時刻の形式が正しくありません。' }, { status: 400 })
  }

  try {
    const storeId = await resolveCastStoreId(session.user.id, session.user.storeId)

    const reservation = await db.reservation.findFirst({
      where: {
        id: params.id,
        castId: session.user.id,
        storeId,
      },
      select: { id: true },
    })

    if (!reservation) {
      return NextResponse.json({ error: '対象の予約が見つかりません。' }, { status: 404 })
    }

    await db.reservationAttendanceRequest.create({
      data: {
        reservationId: reservation.id,
        castId: session.user.id,
        type,
        requestedTime: requestedAt,
        reason: reason?.length ? reason : null,
      },
    })

    const latestRequests = await db.reservationAttendanceRequest.findMany({
      where: {
        castId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    })

    return NextResponse.json({ requests: serializeAttendanceRequests(latestRequests) })
  } catch (err) {
    logger.error({ err, reservationId: params.id, castId: session.user.id }, 'Failed to create attendance request')
    return NextResponse.json({ error: '勤怠修正の申請に失敗しました。' }, { status: 500 })
  }
}

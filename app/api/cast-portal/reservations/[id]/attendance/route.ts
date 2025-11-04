import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import logger from '@/lib/logger'
import { db } from '@/lib/db'
import { requireCast } from '@/lib/auth/utils'
import { resolveCastStoreId, serializeCastReservation } from '@/lib/cast-portal/server'

const attendanceSchema = z.object({
  action: z.enum(['check-in', 'check-out']),
  timestamp: z.string().datetime().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireCast()
  if (error || !session) {
    return error ?? NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const parseResult = attendanceSchema.safeParse(await request.json())
  if (!parseResult.success) {
    return NextResponse.json({ error: '不正な入力です。' }, { status: 400 })
  }

  const { action, timestamp } = parseResult.data
  const effectiveTimestamp = timestamp ? new Date(timestamp) : new Date()

  if (Number.isNaN(effectiveTimestamp.getTime())) {
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
      include: {
        customer: {
          select: { name: true },
        },
        course: {
          select: { name: true, duration: true },
        },
        options: {
          include: { option: true },
        },
        area: {
          select: { name: true },
        },
      },
    })

    if (!reservation) {
      return NextResponse.json({ error: '対象の予約が見つかりません。' }, { status: 404 })
    }

    if (action === 'check-in') {
      if (reservation.castCheckedInAt) {
        return NextResponse.json({ error: 'すでにチェックイン済みです。' }, { status: 400 })
      }

      await db.reservation.update({
        where: { id: reservation.id },
        data: { castCheckedInAt: effectiveTimestamp },
      })
    } else {
      if (!reservation.castCheckedInAt) {
        return NextResponse.json({ error: 'チェックイン前のため、チェックアウトできません。' }, { status: 400 })
      }

      if (reservation.castCheckedOutAt) {
        return NextResponse.json({ error: 'すでにチェックアウト済みです。' }, { status: 400 })
      }

      if (effectiveTimestamp.getTime() < reservation.castCheckedInAt.getTime()) {
        return NextResponse.json({ error: 'チェックアウト時刻が不正です。' }, { status: 400 })
      }

      await db.reservation.update({
        where: { id: reservation.id },
        data: { castCheckedOutAt: effectiveTimestamp },
      })
    }

    const refreshed = await db.reservation.findFirst({
      where: {
        id: reservation.id,
        castId: session.user.id,
        storeId,
      },
      include: {
        customer: {
          select: { name: true },
        },
        course: {
          select: { name: true, duration: true },
        },
        options: {
          include: { option: true },
        },
        area: {
          select: { name: true },
        },
      },
    })

    if (!refreshed) {
      throw new Error('Reservation disappeared after update')
    }

    return NextResponse.json(serializeCastReservation(refreshed, new Date()))
  } catch (err) {
    logger.error({ err, reservationId: params.id, castId: session.user.id }, 'Failed to update attendance')
    return NextResponse.json({ error: '勤怠情報の更新に失敗しました。' }, { status: 500 })
  }
}

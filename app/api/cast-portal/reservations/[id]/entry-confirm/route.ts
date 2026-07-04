/**
 * @design_doc   Next 15 dynamic route params contract
 * @related_to   reservation entry-info flow: cast confirms received room details
 * @known_issues Entry confirmation is limited to cast-owned reservations
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireCast } from '@/lib/auth/utils'
import logger from '@/lib/logger'

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: reservationId } = await params
  const { error, session } = await requireCast()
  if (error || !session) {
    return error ?? NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  try {
    const reservation = await db.reservation.findFirst({
      where: {
        id: reservationId,
        castId: session.user.id,
      },
    })

    if (!reservation) {
      return NextResponse.json({ error: '予約が見つかりません。' }, { status: 404 })
    }

    const now = new Date()
    const updated = await db.reservation.update({
      where: { id: reservation.id },
      data: {
        entryConfirmedAt: now,
      },
      select: {
        entryConfirmedAt: true,
      },
    })

    return NextResponse.json({
      entryConfirmedAt: updated.entryConfirmedAt?.toISOString() ?? null,
    })
  } catch (err) {
    logger.error({ err, reservationId, castId: session.user.id }, 'Failed to confirm entry info')
    return NextResponse.json({ error: '確認処理に失敗しました。' }, { status: 500 })
  }
}

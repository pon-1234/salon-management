import { NextResponse } from 'next/server'
import { requireCast } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import logger from '@/lib/logger'

export async function POST(request: Request) {
  const { error, session } = await requireCast()
  if (error || !session) {
    return error ?? NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const enabled = Boolean(body?.enabled)

    const updated = await db.cast.update({
      where: { id: session.user.id },
      data: { requestAttendanceEnabled: enabled },
      select: { id: true, requestAttendanceEnabled: true },
    })

    return NextResponse.json({
      success: true,
      requestAttendanceEnabled: updated.requestAttendanceEnabled,
    })
  } catch (err) {
    logger.error({ err, castId: session.user.id }, 'Failed to update request attendance flag')
    return NextResponse.json({ error: '更新に失敗しました。' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCast } from '@/lib/auth/utils'
import { resolveCastStoreId } from '@/lib/cast-portal/server'
import { db } from '@/lib/db'

const statusSchema = z.object({
  workStatus: z.enum(['出勤', '未出勤', '休日']),
})

export async function POST(request: NextRequest) {
  const { error, session } = await requireCast()
  if (error || !session) {
    return error ?? NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { workStatus } = statusSchema.parse(body)

    const storeId = await resolveCastStoreId(session.user.id, session.user.storeId)

    const updated = await db.cast.update({
      where: {
        id: session.user.id,
        storeId,
      },
      data: {
        workStatus,
      },
      select: {
        workStatus: true,
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '入力値が不正です。' }, { status: 400 })
    }

    console.error('Failed to update cast work status:', err)
    return NextResponse.json({ error: 'ステータスの更新に失敗しました。' }, { status: 500 })
  }
}

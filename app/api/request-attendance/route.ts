import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { emailClient } from '@/lib/email/client'
import logger from '@/lib/logger'
import { normalizePhoneNumber } from '@/lib/customer/utils'

const payloadSchema = z.object({
  storeId: z.string().min(1),
  storeName: z.string().min(1),
  castId: z.string().min(1),
  castName: z.string().min(1),
  name: z.string().min(1),
  age: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  memberStatus: z.enum(['registered', 'new']),
  preferredDate: z.string().min(1),
  preferredTime: z.string().min(1),
  meetingPlace: z.string().min(1),
  course: z.string().min(1),
  secondCandidate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = payloadSchema.safeParse(body)

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? '入力内容に誤りがあります'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const data = parsed.data
    const cast = await db.cast.findFirst({
      where: { id: data.castId, storeId: data.storeId },
      select: { id: true, requestAttendanceEnabled: true },
    })

    if (!cast || !cast.requestAttendanceEnabled) {
      return NextResponse.json({ error: '現在リクエスト出勤を受け付けていません。' }, { status: 400 })
    }

    const store = await db.store.findUnique({ where: { id: data.storeId } })
    if (!store?.email) {
      return NextResponse.json({ error: '店舗のメールアドレスが未設定です。' }, { status: 500 })
    }

    const phone = normalizePhoneNumber(data.phone)
    const memberLabel = data.memberStatus === 'registered' ? '会員登録済み' : '新規'

    const bodyLines = [
      `リクエスト出勤のお問い合わせ`,
      `店舗: ${store.displayName ?? store.name} (${data.storeId})`,
      `第1候補女性: ${data.castName} (${data.castId})`,
      `第2候補女性: ${data.secondCandidate || 'なし'}`,
      '',
      `お名前: ${data.name}`,
      `年齢: ${data.age}`,
      `メール: ${data.email}`,
      `電話番号: ${phone}`,
      `会員登録情報: ${memberLabel}`,
      '',
      `希望日: ${data.preferredDate}`,
      `希望時間: ${data.preferredTime}`,
      `待ち合わせ場所: ${data.meetingPlace}`,
      `コース: ${data.course}`,
      `その他ご要望: ${data.notes || 'なし'}`,
    ]

    const subject = `【リクエスト出勤】${data.castName} / ${data.preferredDate} ${data.preferredTime}`
    const emailResult = await emailClient.send({
      to: store.email,
      subject,
      body: bodyLines.join('\n'),
    })

    if (!emailResult.success) {
      return NextResponse.json({ error: 'メール送信に失敗しました。' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ err: error }, 'Failed to submit request attendance')
    return NextResponse.json({ error: '送信に失敗しました。' }, { status: 500 })
  }
}

/**
 * @design_doc   Public request-attendance submission endpoint
 * @related_to   components/cast/cast-detail-content.tsx, public request IP rate limiter
 * @known_issues The process-local limiter assumes the documented single-process VPS deployment
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { emailClient } from '@/lib/email/client'
import { escapeHtmlText } from '@/lib/email/html'
import logger from '@/lib/logger'
import { normalizePhoneNumber } from '@/lib/customer/utils'
import { consumeRequestAttendanceRateLimit } from '@/lib/security/public-request-rate-limit'

const identifierSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/)
const notificationEmailSchema = z.string().trim().max(254).email()
const singleLine = (maxLength: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maxLength)
    .refine((value) => !/[\r\n]/.test(value), '改行は入力できません')

const payloadSchema = z
  .object({
    storeId: identifierSchema,
    castId: identifierSchema,
    name: singleLine(80),
    age: z
      .string()
      .trim()
      .regex(/^(?:1[89]|[2-9]\d|1[01]\d|120)$/),
    email: z.string().trim().max(254).email(),
    phone: z
      .string()
      .trim()
      .min(1)
      .max(30)
      .regex(/^\+?[0-9()\- ]+$/)
      .refine((value) => {
        const length = normalizePhoneNumber(value).length
        return length >= 10 && length <= 15
      }),
    memberStatus: z.enum(['registered', 'new']),
    preferredDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => {
        const parsed = new Date(`${value}T00:00:00.000Z`)
        return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
      }),
    preferredTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
    meetingPlace: singleLine(200),
    course: singleLine(200),
    secondCandidate: singleLine(80).nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .strict()

function safeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = consumeRequestAttendanceRateLimit(request.headers)
    if (!rateLimit.allowed) {
      const status = rateLimit.reason === 'rate-limited' ? 429 : 503
      return NextResponse.json(
        {
          error:
            status === 429
              ? '送信回数が上限に達しました。時間をおいて再度お試しください。'
              : '現在送信を受け付けられません。',
        },
        {
          status,
          headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
        }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: '入力内容に誤りがあります' }, { status: 400 })
    }

    const parsed = payloadSchema.safeParse(body)

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? '入力内容に誤りがあります'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const data = parsed.data
    const cast = await db.cast.findFirst({
      where: {
        id: data.castId,
        storeId: data.storeId,
        requestAttendanceEnabled: true,
        store: { isActive: true },
      },
      select: {
        id: true,
        name: true,
        store: {
          select: {
            id: true,
            name: true,
            displayName: true,
            email: true,
          },
        },
      },
    })

    if (!cast) {
      return NextResponse.json(
        { error: '現在リクエスト出勤を受け付けていません。' },
        { status: 400 }
      )
    }

    const store = cast.store
    const destination = notificationEmailSchema.safeParse(store.email)
    if (!destination.success) {
      return NextResponse.json({ error: '店舗のメールアドレスが未設定です。' }, { status: 500 })
    }

    const phone = normalizePhoneNumber(data.phone)
    const memberLabel = data.memberStatus === 'registered' ? '会員登録済み' : '新規'

    const bodyLines = [
      `リクエスト出勤のお問い合わせ`,
      `店舗: ${store.displayName ?? store.name} (${store.id})`,
      `第1候補女性: ${cast.name} (${cast.id})`,
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

    const subject = `【リクエスト出勤】${safeHeaderValue(cast.name)} / ${data.preferredDate} ${data.preferredTime}`
    const emailResult = await emailClient.send({
      to: destination.data,
      subject,
      body: escapeHtmlText(bodyLines.join('\n')),
    })

    if (!emailResult.success) {
      return NextResponse.json({ error: 'メール送信に失敗しました。' }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(
      {
        event: 'request_attendance_submission_failed',
        errorType: error instanceof Error ? error.name : 'UnknownError',
      },
      'Failed to submit request attendance'
    )
    return NextResponse.json({ error: '送信に失敗しました。' }, { status: 500 })
  }
}

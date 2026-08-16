/**
 * @design_doc   Authenticated-only SMS verification delivery with fail-closed persistence
 * @related_to   lib/auth/phone-verification.ts, lib/sms/client.ts, confirm/route.ts
 * @known_issues The process-local limiter must become persistent before horizontal scaling
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { normalizeWritableCustomerPhoneIdentity } from '@/lib/customer/utils'
import { smsClient } from '@/lib/sms/client'
import logger from '@/lib/logger'
import {
  checkSendRateLimit,
  recordSendAttempt,
  generateVerificationCode,
  hashPhoneVerificationCode,
} from '@/lib/auth/phone-verification'
import { env } from '@/lib/config/env'

const EXPIRY_MINUTES = 10

export async function POST(_request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'customer' || !session.user.id) {
      return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 })
    }

    const customerId = session.user.id
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: { id: true, phone: true },
    })
    if (!customer) {
      return NextResponse.json({ error: '顧客情報が見つかりません。' }, { status: 404 })
    }

    const phone = normalizeWritableCustomerPhoneIdentity(customer.phone)
    if (!phone) {
      return NextResponse.json({ error: '登録電話番号を確認できません。' }, { status: 400 })
    }

    const rateLimit = checkSendRateLimit(phone)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `しばらく待ってから再度お試しください。(${rateLimit.retryAfter}s)` },
        { status: 429 }
      )
    }
    recordSendAttempt(phone)

    const code = generateVerificationCode()
    const codeHash = hashPhoneVerificationCode(customerId, code, env.nextAuth.secret)
    const expiry = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000)

    const smsMessage = `認証コード: ${code}\n${EXPIRY_MINUTES}分以内に入力してください。`
    const result = await smsClient.send({ to: phone, message: smsMessage })

    if (!result.success) {
      return NextResponse.json({ error: 'SMSの送信に失敗しました。' }, { status: 502 })
    }

    await db.customer.update({
      where: { id: customerId },
      data: {
        phoneVerificationCode: codeHash,
        phoneVerificationExpiry: expiry,
        phoneVerificationAttempts: 0,
      },
    })

    return NextResponse.json({ success: true, expiresAt: expiry.toISOString() })
  } catch (error) {
    logger.error(
      { errorType: error instanceof Error ? error.name : 'UnknownError' },
      'Failed to send phone verification code'
    )
    return NextResponse.json({ error: 'SMS送信に失敗しました。' }, { status: 500 })
  }
}

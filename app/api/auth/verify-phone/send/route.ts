import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { normalizePhoneNumber } from '@/lib/customer/utils'
import { smsClient } from '@/lib/sms/client'
import logger from '@/lib/logger'
import { checkSendRateLimit, recordSendAttempt, generateVerificationCode } from '@/lib/auth/phone-verification'

const EXPIRY_MINUTES = 10

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json().catch(() => ({}))
    const rawPhone = typeof body.phone === 'string' ? body.phone : ''

    let customerId: string | null = null
    let phone = ''

    if (session?.user?.role === 'customer') {
      customerId = session.user.id
      const customer = await db.customer.findUnique({ where: { id: customerId } })
      if (!customer) {
        return NextResponse.json({ error: '顧客情報が見つかりません。' }, { status: 404 })
      }
      phone = customer.phone
    } else {
      phone = normalizePhoneNumber(rawPhone)
      if (!phone) {
        return NextResponse.json({ error: '電話番号を入力してください。' }, { status: 400 })
      }
      const customer = await db.customer.findFirst({ where: { phone } })
      if (!customer) {
        return NextResponse.json({ error: 'この電話番号は登録されていません。' }, { status: 404 })
      }
      customerId = customer.id
    }

    const rateLimit = checkSendRateLimit(phone)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `しばらく待ってから再度お試しください。(${rateLimit.retryAfter}s)` },
        { status: 429 }
      )
    }

    const code = generateVerificationCode()
    const expiry = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000)

    await db.customer.update({
      where: { id: customerId! },
      data: {
        phoneVerificationCode: code,
        phoneVerificationExpiry: expiry,
        phoneVerificationAttempts: 0,
      },
    })

    recordSendAttempt(phone)

    const smsMessage = `認証コード: ${code}\n${EXPIRY_MINUTES}分以内に入力してください。`
    const result = await smsClient.send({ to: phone, message: smsMessage })

    if (!result.success) {
      return NextResponse.json({ error: 'SMSの送信に失敗しました。' }, { status: 500 })
    }

    return NextResponse.json({ success: true, expiresAt: expiry.toISOString() })
  } catch (error) {
    logger.error({ err: error }, 'Failed to send phone verification code')
    return NextResponse.json({ error: 'SMS送信に失敗しました。' }, { status: 500 })
  }
}

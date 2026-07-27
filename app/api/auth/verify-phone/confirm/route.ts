/**
 * @design_doc   Authenticated atomic consumption of customer phone verification codes
 * @related_to   send/route.ts and lib/auth/phone-verification.ts
 * @known_issues Anonymous legacy account claiming is disabled pending an approved identity policy
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import logger from '@/lib/logger'
import { hashPhoneVerificationCode } from '@/lib/auth/phone-verification'
import { env } from '@/lib/config/env'

const MAX_VERIFY_ATTEMPTS = 5

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'customer' || !session.user.id) {
      return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const code = typeof body.code === 'string' ? body.code.trim() : ''

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: '6桁の認証コードを入力してください。' }, { status: 400 })
    }

    const customer = await db.customer.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        phoneVerificationCode: true,
        phoneVerificationExpiry: true,
        phoneVerificationAttempts: true,
      },
    })

    if (!customer) {
      return NextResponse.json({ error: '顧客情報が見つかりません。' }, { status: 404 })
    }

    if (!customer.phoneVerificationCode || !customer.phoneVerificationExpiry) {
      return NextResponse.json({ error: '認証コードが発行されていません。' }, { status: 400 })
    }

    if (customer.phoneVerificationExpiry.getTime() < Date.now()) {
      await db.customer.updateMany({
        where: {
          id: customer.id,
          phoneVerificationCode: customer.phoneVerificationCode,
          phoneVerificationExpiry: { lte: new Date() },
        },
        data: {
          phoneVerificationCode: null,
          phoneVerificationExpiry: null,
          phoneVerificationAttempts: 0,
        },
      })
      return NextResponse.json({ error: '認証コードの有効期限が切れています。' }, { status: 400 })
    }

    if (customer.phoneVerificationAttempts >= MAX_VERIFY_ATTEMPTS) {
      return NextResponse.json(
        { error: '試行回数の上限に達しました。認証コードを再送してください。' },
        { status: 429 }
      )
    }

    const now = new Date()
    const codeHash = hashPhoneVerificationCode(customer.id, code, env.nextAuth.secret)
    if (customer.phoneVerificationCode !== codeHash) {
      await db.customer.updateMany({
        where: {
          id: customer.id,
          phoneVerificationCode: customer.phoneVerificationCode,
          phoneVerificationExpiry: { gt: now },
          phoneVerificationAttempts: { lt: MAX_VERIFY_ATTEMPTS },
        },
        data: { phoneVerificationAttempts: { increment: 1 } },
      })
      return NextResponse.json({ error: '認証コードが正しくありません。' }, { status: 400 })
    }

    const consumed = await db.customer.updateMany({
      where: {
        id: customer.id,
        phoneVerificationCode: codeHash,
        phoneVerificationExpiry: { gt: now },
        phoneVerificationAttempts: { lt: MAX_VERIFY_ATTEMPTS },
      },
      data: {
        phoneVerified: true,
        phoneVerifiedAt: now,
        phoneVerificationCode: null,
        phoneVerificationExpiry: null,
        phoneVerificationAttempts: 0,
      },
    })

    if (consumed.count !== 1) {
      return NextResponse.json({ error: '認証コードが無効です。' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(
      { errorType: error instanceof Error ? error.name : 'UnknownError' },
      'Failed to confirm phone verification code'
    )
    return NextResponse.json({ error: '認証に失敗しました。' }, { status: 500 })
  }
}

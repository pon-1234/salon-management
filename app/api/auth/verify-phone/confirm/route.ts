import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import logger from '@/lib/logger'
import { normalizePhoneNumber } from '@/lib/customer/utils'

const MAX_VERIFY_ATTEMPTS = 5

function isPlaceholderEmail(email: string): boolean {
  return email.endsWith('@phone.local') || email.endsWith('@placeholder.local')
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json().catch(() => ({}))
    const rawPhone = typeof body.phone === 'string' ? body.phone : ''
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : ''

    let customer = null

    if (session?.user?.role === 'customer') {
      customer = await db.customer.findUnique({ where: { id: session.user.id } })
    } else {
      const phone = normalizePhoneNumber(rawPhone)
      if (!phone) {
        return NextResponse.json({ error: '電話番号を入力してください。' }, { status: 400 })
      }
      customer = await db.customer.findFirst({ where: { phone } })
    }

    if (!customer) {
      return NextResponse.json({ error: '顧客情報が見つかりません。' }, { status: 404 })
    }

    if (!code) {
      return NextResponse.json({ error: '認証コードを入力してください。' }, { status: 400 })
    }

    if (!customer.phoneVerificationCode || !customer.phoneVerificationExpiry) {
      return NextResponse.json({ error: '認証コードが発行されていません。' }, { status: 400 })
    }

    if (customer.phoneVerificationExpiry.getTime() < Date.now()) {
      await db.customer.update({
        where: { id: customer.id },
        data: {
          phoneVerificationCode: null,
          phoneVerificationExpiry: null,
          phoneVerificationAttempts: 0,
        },
      })
      return NextResponse.json({ error: '認証コードの有効期限が切れています。' }, { status: 400 })
    }

    if (customer.phoneVerificationCode !== code) {
      const attempts = (customer.phoneVerificationAttempts ?? 0) + 1
      await db.customer.update({
        where: { id: customer.id },
        data: {
          phoneVerificationAttempts: attempts,
          ...(attempts >= MAX_VERIFY_ATTEMPTS
            ? {
                phoneVerificationCode: null,
                phoneVerificationExpiry: null,
                phoneVerificationAttempts: 0,
              }
            : {}),
        },
      })

      return NextResponse.json({ error: '認証コードが正しくありません。' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
      phoneVerificationCode: null,
      phoneVerificationExpiry: null,
      phoneVerificationAttempts: 0,
    }

    if (!session && email && password) {
      const emailOwner = await db.customer.findUnique({ where: { email } })
      if (emailOwner && emailOwner.id !== customer.id) {
        return NextResponse.json({ error: 'このメールアドレスは既に登録されています。' }, { status: 409 })
      }

      if (customer.email && !isPlaceholderEmail(customer.email) && customer.email !== email) {
        return NextResponse.json(
          { error: '既にメールアドレスが登録されています。ログインしてください。' },
          { status: 409 }
        )
      }

      updateData.email = email
      updateData.password = await bcrypt.hash(password, 10)

      if (nickname) {
        updateData.name = nickname
        updateData.nameKana = nickname
      }
    }

    await db.customer.update({ where: { id: customer.id }, data: updateData })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ err: error }, 'Failed to confirm phone verification code')
    return NextResponse.json({ error: '認証に失敗しました。' }, { status: 500 })
  }
}

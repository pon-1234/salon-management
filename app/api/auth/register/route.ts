/**
 * @design_doc   Store-scoped customer registration with mandatory email ownership verification
 * @related_to   verify-email/send, verify-email/confirm, and customer credentials login
 * @known_issues Customer-to-store membership awaits an approved multi-store ownership model
 */
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { normalizeCustomerEmail, parseSafeStoreSlug } from '@/lib/auth/customer-auth'
import { isBcryptSafePassword } from '@/lib/auth/password-policy'
import { hashBearerToken } from '@/lib/auth/recovery-token'
import { env } from '@/lib/config/env'
import { db } from '@/lib/db'
import { emailClient } from '@/lib/email/client'
import { escapeHtmlText } from '@/lib/email/html'
import logger from '@/lib/logger'
import { consumeCustomerEmailRateLimit } from '@/lib/security/customer-email-rate-limit'

const registerPayloadSchema = z
  .object({
    nickname: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().email().max(254),
    phone: z.string().min(7).max(30),
    password: z
      .string()
      .min(8)
      .refine(isBcryptSafePassword, 'パスワードは改行を含めず72バイト以内で入力してください'),
    birthDate: z.union([z.string().datetime(), z.string().min(1), z.null()]).optional(),
    smsNotifications: z.boolean().optional(),
    storeId: z.string().trim().min(1).max(100),
  })
  .strict()

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000

function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

function getErrorType(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError'
}

function getPrismaErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return null
  }

  return typeof error.code === 'string' ? error.code : null
}

async function revokeUndeliveredVerificationToken(
  customerId: string,
  verificationTokenHash: string
): Promise<void> {
  try {
    await db.customer.updateMany({
      where: { id: customerId, emailVerificationToken: verificationTokenHash },
      data: { emailVerificationToken: null, emailVerificationExpiry: null },
    })
  } catch (error) {
    logger.error(
      { customerId, failure: 'token-revocation', errorType: getErrorType(error) },
      'Failed to revoke an undelivered registration verification token'
    )
  }
}

function deliveryFailureResponse() {
  return NextResponse.json(
    {
      error:
        '会員登録は完了しましたが、確認メールを送信できませんでした。確認メールを再送してください',
      code: 'VERIFICATION_DELIVERY_FAILED',
      accountCreated: true,
    },
    { status: 502 }
  )
}

function rateLimitResponse(reason: string, retryAfterSeconds: number) {
  const rateLimited = reason === 'rate-limited'
  return NextResponse.json(
    {
      error: rateLimited ? 'Too Many Requests' : 'Service Unavailable',
      message: '現在処理できません。しばらくしてからお試しください',
    },
    {
      status: rateLimited ? 429 : 503,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    }
  )
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json()
    const parsed = registerPayloadSchema.safeParse(body)

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? '入力内容に誤りがあります'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const data = parsed.data
    const email = normalizeCustomerEmail(data.email)
    const normalizedPhone = sanitizePhone(data.phone)

    try {
      const rateLimitDecision = consumeCustomerEmailRateLimit('register', request.headers, email)
      if (!rateLimitDecision.allowed) {
        return rateLimitResponse(rateLimitDecision.reason, rateLimitDecision.retryAfterSeconds)
      }
    } catch {
      return rateLimitResponse('limiter-failure', 60)
    }

    if (normalizedPhone.length < 10 || normalizedPhone.length > 11) {
      return NextResponse.json(
        { error: '電話番号は数字のみで10〜11桁で入力してください' },
        { status: 400 }
      )
    }

    const store = await db.store.findFirst({
      where: { id: data.storeId, isActive: true },
      select: { slug: true },
    })
    const storeSlug = parseSafeStoreSlug(store?.slug)
    if (!storeSlug) {
      return NextResponse.json({ error: '有効な店舗を選択してください' }, { status: 400 })
    }

    const existingEmail = await db.customer.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    })
    if (existingEmail) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています', code: 'EMAIL_EXISTS' },
        { status: 409 }
      )
    }

    const existingPhone = await db.customer.findFirst({ where: { phone: normalizedPhone } })
    if (existingPhone) {
      return NextResponse.json(
        { error: 'この電話番号は既に登録されています', code: 'PHONE_EXISTS' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(data.password, 12)
    let birthDate = new Date('1970-01-01T00:00:00Z')
    if (typeof data.birthDate === 'string' && data.birthDate.length > 0) {
      const parsedBirthDate = new Date(data.birthDate)
      if (!Number.isNaN(parsedBirthDate.getTime())) {
        birthDate = parsedBirthDate
      }
    }

    const verificationToken = randomBytes(32).toString('hex')
    const verificationTokenHash = hashBearerToken(verificationToken)
    const emailVerificationExpiry = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS)
    const customer = await db.customer.create({
      data: {
        name: data.nickname,
        nameKana: data.nickname,
        email,
        phone: normalizedPhone,
        password: hashedPassword,
        birthDate,
        memberType: 'regular',
        points: 0,
        smsEnabled: Boolean(data.smsNotifications),
        emailVerified: false,
        emailVerificationToken: verificationTokenHash,
        emailVerificationExpiry,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    })

    const verificationUrl = new URL('/verify-email', env.nextAuth.url)
    verificationUrl.searchParams.set('token', verificationToken)
    verificationUrl.searchParams.set('store', storeSlug)
    const escapedVerificationUrl = escapeHtmlText(verificationUrl.toString())

    try {
      const delivery = await emailClient.send({
        to: email,
        subject: 'メールアドレスの確認',
        body: `
          <h2>メールアドレスの確認</h2>
          <p>${escapeHtmlText(customer.name)}様</p>
          <p>ご登録ありがとうございます。</p>
          <p>以下のリンクをクリックして、メールアドレスを確認してください：</p>
          <p><a href="${escapedVerificationUrl}">${escapedVerificationUrl}</a></p>
          <p>このリンクは24時間後に無効になります。</p>
          <p>このメールに心当たりがない場合は、無視してください。</p>
        `,
      })

      if (!delivery.success) {
        logger.error(
          { customerId: customer.id, failure: 'provider-rejected' },
          'Registration verification email delivery failed'
        )
        await revokeUndeliveredVerificationToken(customer.id, verificationTokenHash)
        return deliveryFailureResponse()
      }
    } catch (error) {
      logger.error(
        {
          customerId: customer.id,
          failure: 'provider-exception',
          errorType: getErrorType(error),
        },
        'Registration verification email delivery failed'
      )
      await revokeUndeliveredVerificationToken(customer.id, verificationTokenHash)
      return deliveryFailureResponse()
    }

    return NextResponse.json({ customer }, { status: 201 })
  } catch (error) {
    const errorCode = getPrismaErrorCode(error)
    logger.error(
      { failure: 'internal-error', errorType: getErrorType(error), errorCode },
      'Failed to register customer'
    )

    if (errorCode === 'P2002') {
      return NextResponse.json({ error: '既に登録済みの情報が含まれています' }, { status: 409 })
    }

    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

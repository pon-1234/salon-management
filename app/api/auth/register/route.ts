/**
 * @design_doc   Store-scoped customer registration with mandatory email ownership verification
 * @related_to   verify-email/send, verify-email/confirm, and customer credentials login
 * @known_issues None
 */
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { normalizeCustomerEmail, parseSafeStoreSlug } from '@/lib/auth/customer-auth'
import { isBcryptSafePassword } from '@/lib/auth/password-policy'
import { hashBearerToken } from '@/lib/auth/recovery-token'
import { env } from '@/lib/config/env'
import {
  getCustomerPhoneIdentityVariants,
  normalizeWritableCustomerPhoneIdentity,
} from '@/lib/customer/utils'
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
    birthDate: z
      .string()
      .trim()
      .refine((value) => {
        const timestamp = Date.parse(value)
        return Number.isFinite(timestamp) && timestamp <= Date.now()
      })
      .nullable()
      .optional(),
    smsNotifications: z.boolean().optional(),
    storeId: z.string().trim().min(1).max(100),
  })
  .strict()

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000

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
    const normalizedPhone = normalizeWritableCustomerPhoneIdentity(data.phone)

    try {
      const rateLimitDecision = consumeCustomerEmailRateLimit('register', request.headers, email)
      if (!rateLimitDecision.allowed) {
        return rateLimitResponse(rateLimitDecision.reason, rateLimitDecision.retryAfterSeconds)
      }
    } catch {
      return rateLimitResponse('limiter-failure', 60)
    }

    if (!normalizedPhone) {
      return NextResponse.json({ error: '日本の電話番号を確認してください' }, { status: 400 })
    }

    const store = await db.store.findFirst({
      where: { id: data.storeId, isActive: true },
      select: { id: true, slug: true },
    })
    const storeSlug = parseSafeStoreSlug(store?.slug)
    if (!store || !storeSlug) {
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

    const existingPhone = await db.customer.findFirst({
      where: { phone: { in: getCustomerPhoneIdentityVariants(normalizedPhone) } },
      select: { id: true },
    })
    if (existingPhone) {
      return NextResponse.json(
        { error: 'この電話番号は既に登録されています', code: 'PHONE_EXISTS' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(data.password, 12)
    const birthDate = typeof data.birthDate === 'string' ? new Date(data.birthDate) : null

    const verificationToken = randomBytes(32).toString('hex')
    const verificationTokenHash = hashBearerToken(verificationToken)
    const emailVerificationExpiry = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS)
    const customer = await db.customer.create({
      data: {
        name: data.nickname,
        nameKana: null,
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
        storeAssignments: {
          create: { storeId: store.id },
        },
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

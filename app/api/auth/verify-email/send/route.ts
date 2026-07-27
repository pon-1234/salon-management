/**
 * @design_doc   Store-scoped enumeration-safe verification delivery with hashed revocable tokens
 * @related_to   confirm/route.ts, customer-email-rate-limit.ts, and email/client.ts
 * @known_issues Rate-limit state is process-local for the documented single-process VPS runtime
 */
import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ErrorResponses, SuccessResponses } from '@/lib/api/responses'
import { normalizeCustomerEmail, parseSafeStoreSlug } from '@/lib/auth/customer-auth'
import { hashBearerToken } from '@/lib/auth/recovery-token'
import { env } from '@/lib/config/env'
import { db } from '@/lib/db'
import { emailClient } from '@/lib/email/client'
import { escapeHtmlText } from '@/lib/email/html'
import logger from '@/lib/logger'
import { consumeCustomerEmailRateLimit } from '@/lib/security/customer-email-rate-limit'

const sendVerificationSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('有効なメールアドレスを入力してください').max(254),
    storeId: z.string().trim().min(1).max(100),
  })
  .strict()

const GENERIC_RESPONSE =
  '入力されたメールアドレスに一致する未確認アカウントがある場合、確認リンクを送信します'

function successResponse() {
  return SuccessResponses.ok({ message: GENERIC_RESPONSE })
}

function rateLimitResponse(
  decision: Exclude<ReturnType<typeof consumeCustomerEmailRateLimit>, { allowed: true }>
) {
  const rateLimited = decision.reason === 'rate-limited'
  return NextResponse.json(
    {
      error: rateLimited ? 'Too Many Requests' : 'Service Unavailable',
      message: '現在処理できません。しばらくしてからお試しください',
    },
    {
      status: rateLimited ? 429 : 503,
      headers: { 'Retry-After': String(decision.retryAfterSeconds) },
    }
  )
}

async function revokeUndeliveredToken(
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
      {
        customerId,
        errorType: error instanceof Error ? error.name : 'UnknownError',
      },
      'Failed to revoke an undelivered email verification token'
    )
  }
}

export async function POST(request: NextRequest) {
  let email: string
  let storeId: string

  try {
    const body: unknown = await request.json()
    const parsed = sendVerificationSchema.parse(body)
    email = normalizeCustomerEmail(parsed.email)
    storeId = parsed.storeId
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ErrorResponses.badRequest('入力内容に誤りがあります', error.errors)
    }
    return ErrorResponses.internalServerError('メール送信中にエラーが発生しました')
  }

  let rateLimitDecision: ReturnType<typeof consumeCustomerEmailRateLimit>
  try {
    rateLimitDecision = consumeCustomerEmailRateLimit('verify-email', request.headers, email)
  } catch {
    return rateLimitResponse({
      allowed: false,
      reason: 'limiter-failure',
      retryAfterSeconds: 60,
    })
  }
  if (!rateLimitDecision.allowed) {
    return rateLimitResponse(rateLimitDecision)
  }

  const store = await db.store.findFirst({
    where: { id: storeId, isActive: true },
    select: { slug: true },
  })
  const storeSlug = parseSafeStoreSlug(store?.slug)
  if (!storeSlug) {
    return ErrorResponses.badRequest('有効な店舗を選択してください')
  }

  try {
    const customer = await db.customer.findUnique({
      where: { email },
    })

    if (!customer || customer.emailVerified) {
      return successResponse()
    }

    const verificationToken = randomBytes(32).toString('hex')
    const verificationTokenHash = hashBearerToken(verificationToken)
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await db.customer.update({
      where: { id: customer.id },
      data: {
        emailVerificationToken: verificationTokenHash,
        emailVerificationExpiry: verificationExpiry,
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
          'Email verification delivery failed'
        )
        await revokeUndeliveredToken(customer.id, verificationTokenHash)
      }
    } catch (error) {
      logger.error(
        {
          customerId: customer.id,
          failure: 'provider-exception',
          errorType: error instanceof Error ? error.name : 'UnknownError',
        },
        'Email verification delivery failed'
      )
      await revokeUndeliveredToken(customer.id, verificationTokenHash)
    }

    return successResponse()
  } catch (error) {
    logger.error(
      {
        failure: 'internal-error',
        errorType: error instanceof Error ? error.name : 'UnknownError',
      },
      'Email verification request failed'
    )
    return successResponse()
  }
}

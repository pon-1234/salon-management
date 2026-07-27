/**
 * @design_doc   Store-scoped enumeration-safe recovery with hashed tokens and dual-key rate limits
 * @related_to   reset-password/route.ts, customer-email-rate-limit.ts, and email/client.ts
 * @known_issues Rate-limit state is process-local for the documented single-process VPS runtime
 */
import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { normalizeCustomerEmail, parseSafeStoreSlug } from '@/lib/auth/customer-auth'
import { hashRecoveryToken } from '@/lib/auth/recovery-token'
import { env } from '@/lib/config/env'
import { db } from '@/lib/db'
import { emailClient } from '@/lib/email/client'
import { escapeHtmlText } from '@/lib/email/html'
import logger from '@/lib/logger'
import { consumeCustomerEmailRateLimit } from '@/lib/security/customer-email-rate-limit'
import { ErrorResponses, SuccessResponses } from '@/lib/api/responses'

const forgotPasswordSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('有効なメールアドレスを入力してください').max(254),
    storeId: z.string().trim().min(1).max(100),
  })
  .strict()

const GENERIC_RESPONSE =
  '入力されたメールアドレスに一致するアカウントがある場合、パスワードリセットの手順を送信します'

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

async function revokeUndeliveredToken(customerId: string, resetTokenHash: string): Promise<void> {
  try {
    await db.customer.updateMany({
      where: { id: customerId, resetToken: resetTokenHash },
      data: { resetToken: null, resetTokenExpiry: null },
    })
  } catch (error) {
    logger.error(
      {
        customerId,
        errorType: error instanceof Error ? error.name : 'UnknownError',
      },
      'Failed to revoke an undelivered password reset token'
    )
  }
}

export async function POST(request: NextRequest) {
  let email: string
  let storeId: string

  try {
    const body: unknown = await request.json()
    const parsed = forgotPasswordSchema.parse(body)
    email = normalizeCustomerEmail(parsed.email)
    storeId = parsed.storeId
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ErrorResponses.badRequest('入力内容に誤りがあります', error.errors)
    }
    return ErrorResponses.internalServerError('パスワードリセットの処理中にエラーが発生しました')
  }

  let rateLimitDecision: ReturnType<typeof consumeCustomerEmailRateLimit>
  try {
    rateLimitDecision = consumeCustomerEmailRateLimit('forgot-password', request.headers, email)
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

    if (!customer) {
      return successResponse()
    }

    const resetToken = randomBytes(32).toString('hex')
    const resetTokenHash = hashRecoveryToken(resetToken)
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000)

    await db.customer.update({
      where: { id: customer.id },
      data: {
        resetToken: resetTokenHash,
        resetTokenExpiry,
      },
    })

    const resetUrl = new URL('/reset-password', env.nextAuth.url)
    resetUrl.searchParams.set('token', resetToken)
    resetUrl.searchParams.set('store', storeSlug)
    const escapedResetUrl = escapeHtmlText(resetUrl.toString())
    try {
      const delivery = await emailClient.send({
        to: customer.email,
        subject: 'パスワードリセットのご案内',
        body: `
          <h2>パスワードリセット</h2>
          <p>${escapeHtmlText(customer.name)}様</p>
          <p>パスワードリセットのリクエストを受け付けました。</p>
          <p>以下のリンクをクリックして、新しいパスワードを設定してください：</p>
          <p><a href="${escapedResetUrl}">${escapedResetUrl}</a></p>
          <p>このリンクは1時間後に無効になります。</p>
          <p>このメールに心当たりがない場合は、無視してください。</p>
        `,
      })

      if (!delivery.success) {
        logger.error(
          { customerId: customer.id, failure: 'provider-rejected' },
          'Password reset email delivery failed'
        )
        await revokeUndeliveredToken(customer.id, resetTokenHash)
      }
    } catch (error) {
      logger.error(
        {
          customerId: customer.id,
          failure: 'provider-exception',
          errorType: error instanceof Error ? error.name : 'UnknownError',
        },
        'Password reset email delivery failed'
      )
      await revokeUndeliveredToken(customer.id, resetTokenHash)
    }

    return successResponse()
  } catch (error) {
    logger.error(
      {
        failure: 'internal-error',
        errorType: error instanceof Error ? error.name : 'UnknownError',
      },
      'Password reset request failed'
    )
    return successResponse()
  }
}

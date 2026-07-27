/**
 * @design_doc   Atomic single-use consumption of hashed email-verification tokens
 * @related_to   send/route.ts, lib/auth/recovery-token.ts
 * @known_issues Existing plaintext verification tokens are intentionally invalid after rollout
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { ErrorResponses, SuccessResponses } from '@/lib/api/responses'
import { hashBearerToken } from '@/lib/auth/recovery-token'

const confirmEmailSchema = z.object({
  token: z.string().min(1, 'トークンが必要です'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = confirmEmailSchema.parse(body)
    const verificationTokenHash = hashBearerToken(token)

    const customer = await db.customer.findFirst({
      where: {
        emailVerificationToken: verificationTokenHash,
        emailVerificationExpiry: {
          gt: new Date(),
        },
        emailVerified: false,
      },
      select: { id: true },
    })

    if (!customer) {
      return ErrorResponses.badRequest('無効または期限切れのトークンです')
    }

    const update = await db.customer.updateMany({
      where: {
        id: customer.id,
        emailVerificationToken: verificationTokenHash,
        emailVerificationExpiry: { gt: new Date() },
        emailVerified: false,
      },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    })

    if (update.count !== 1) {
      return ErrorResponses.badRequest('無効または期限切れのトークンです')
    }

    return SuccessResponses.ok({
      message: 'メールアドレスが正常に確認されました',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ErrorResponses.badRequest('入力内容に誤りがあります', error.errors)
    }
    return ErrorResponses.internalServerError('メール確認の処理中にエラーが発生しました')
  }
}

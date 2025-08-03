import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { ErrorResponses, SuccessResponses } from '@/lib/api/responses'

const confirmEmailSchema = z.object({
  token: z.string().min(1, 'トークンが必要です'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = confirmEmailSchema.parse(body)

    // Find customer by verification token
    const customer = await db.customer.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpiry: {
          gt: new Date(),
        },
      },
    })

    if (!customer) {
      return ErrorResponses.badRequest('無効または期限切れのトークンです')
    }

    if (customer.emailVerified) {
      return SuccessResponses.ok({
        message: 'メールアドレスは既に確認済みです',
      })
    }

    // Update customer to mark email as verified
    await db.customer.update({
      where: { id: customer.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    })

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

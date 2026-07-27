/**
 * @design_doc   Atomic single-use consumption of hashed password-recovery tokens
 * @related_to   forgot-password/route.ts, lib/auth/recovery-token.ts
 * @known_issues Existing plaintext reset tokens are intentionally invalid after the hashed-token rollout
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { ErrorResponses, SuccessResponses } from '@/lib/api/responses'
import { hashRecoveryToken } from '@/lib/auth/recovery-token'
import { isBcryptSafePassword } from '@/lib/auth/password-policy'

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'トークンが必要です'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .refine(isBcryptSafePassword, 'パスワードは改行を含めず72バイト以内で入力してください'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = resetPasswordSchema.parse(body)
    const resetTokenHash = hashRecoveryToken(token)
    const now = new Date()

    const customer = await db.customer.findFirst({
      where: {
        resetToken: resetTokenHash,
        resetTokenExpiry: {
          gt: now,
        },
      },
      select: { id: true },
    })

    if (!customer) {
      return ErrorResponses.badRequest('無効または期限切れのトークンです')
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const update = await db.customer.updateMany({
      where: {
        id: customer.id,
        resetToken: resetTokenHash,
        resetTokenExpiry: { gt: new Date() },
      },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    })

    if (update.count !== 1) {
      return ErrorResponses.badRequest('無効または期限切れのトークンです')
    }

    return SuccessResponses.ok({
      message: 'パスワードが正常にリセットされました',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ErrorResponses.badRequest('入力内容に誤りがあります', error.errors)
    }
    return ErrorResponses.internalServerError('パスワードリセットの処理中にエラーが発生しました')
  }
}

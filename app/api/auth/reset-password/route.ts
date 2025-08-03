import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { ErrorResponses, SuccessResponses } from '@/lib/api/responses'

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'トークンが必要です'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = resetPasswordSchema.parse(body)

    // Find customer by reset token
    const customer = await db.customer.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    })

    if (!customer) {
      return ErrorResponses.badRequest('無効または期限切れのトークンです')
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update customer password and clear reset token
    await db.customer.update({
      where: { id: customer.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    })

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

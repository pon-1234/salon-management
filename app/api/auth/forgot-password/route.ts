import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { emailClient } from '@/lib/email/client'
import { ErrorResponses, SuccessResponses } from '@/lib/api/responses'
import { randomBytes } from 'crypto'
import { env } from '@/lib/config/env'

const forgotPasswordSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)

    // Find customer by email
    const customer = await db.customer.findUnique({
      where: { email },
    })

    // Always return success to prevent email enumeration
    if (!customer) {
      return SuccessResponses.ok({
        message: 'パスワードリセットの手順をメールで送信しました',
      })
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

    // Store reset token in database
    await db.customer.update({
      where: { id: customer.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    })

    // Send reset email
    const resetUrl = `${env.nextAuth.url}/reset-password?token=${resetToken}`
    await emailClient.send({
      to: email,
      subject: 'パスワードリセットのご案内',
      body: `
        <h2>パスワードリセット</h2>
        <p>${customer.name}様</p>
        <p>パスワードリセットのリクエストを受け付けました。</p>
        <p>以下のリンクをクリックして、新しいパスワードを設定してください：</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>このリンクは1時間後に無効になります。</p>
        <p>このメールに心当たりがない場合は、無視してください。</p>
      `,
    })

    return SuccessResponses.ok({
      message: 'パスワードリセットの手順をメールで送信しました',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ErrorResponses.badRequest('入力内容に誤りがあります', error.errors)
    }
    return ErrorResponses.internalServerError('パスワードリセットの処理中にエラーが発生しました')
  }
}

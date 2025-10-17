import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { emailClient } from '@/lib/email/client'
import { ErrorResponses, SuccessResponses } from '@/lib/api/responses'
import { randomBytes } from 'crypto'
import { env } from '@/lib/config/env'

const sendVerificationSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = sendVerificationSchema.parse(body)

    // Find customer by email
    const customer = await db.customer.findUnique({
      where: { email },
    })

    if (!customer) {
      return ErrorResponses.notFound('ユーザーが見つかりません')
    }

    if (customer.emailVerified) {
      return SuccessResponses.ok({
        message: 'メールアドレスは既に確認済みです',
      })
    }

    // Generate verification token
    const verificationToken = randomBytes(32).toString('hex')
    const verificationExpiry = new Date(Date.now() + 86400000) // 24 hours from now

    // Store verification token in database
    await db.customer.update({
      where: { id: customer.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      },
    })

    // Send verification email
    const verificationUrl = `${env.nextAuth.url}/verify-email?token=${verificationToken}`
    await emailClient.send({
      to: email,
      subject: 'メールアドレスの確認',
      body: `
        <h2>メールアドレスの確認</h2>
        <p>${customer.name}様</p>
        <p>ご登録ありがとうございます。</p>
        <p>以下のリンクをクリックして、メールアドレスを確認してください：</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>このリンクは24時間後に無効になります。</p>
        <p>このメールに心当たりがない場合は、無視してください。</p>
      `,
    })

    return SuccessResponses.ok({
      message: 'メール確認のリンクを送信しました',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ErrorResponses.badRequest('入力内容に誤りがあります', error.errors)
    }
    return ErrorResponses.internalServerError('メール送信中にエラーが発生しました')
  }
}

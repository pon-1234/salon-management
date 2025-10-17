/**
 * @design_doc   Customer registration API route
 * @related_to   NextAuth.js configuration, customer authentication
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { emailClient } from '@/lib/email/client'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { env } from '@/lib/config/env'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nickname, email, phone, password, birthDate, smsNotifications, storeId } = body

    // Validate required fields
    if (!nickname || !email || !phone || !password || !storeId) {
      return NextResponse.json({ error: '必須項目が入力されていません' }, { status: 400 })
    }

    // Check if user already exists
    const existingCustomer = await db.customer.findUnique({
      where: { email },
    })
    if (existingCustomer) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に使用されています' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await hash(password, 12)

    // Generate email verification token
    const verificationToken = randomBytes(32).toString('hex')
    const verificationExpiry = new Date(Date.now() + 86400000) // 24 hours from now

    // Create customer with email verification fields
    const customer = await db.customer.create({
      data: {
        name: nickname,
        nameKana: nickname, // Using nickname as nameKana for now
        email,
        phone,
        password: hashedPassword,
        birthDate: birthDate ? new Date(birthDate) : new Date(),
        memberType: 'regular',
        points: 1000, // Initial signup bonus
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      },
    })

    // Send verification email
    try {
      const verificationUrl = `${env.nextAuth.url}/verify-email?token=${verificationToken}`
      await emailClient.send({
        to: email,
        subject: 'メールアドレスの確認',
        body: `
          <h2>メールアドレスの確認</h2>
          <p>${nickname}様</p>
          <p>ご登録ありがとうございます。</p>
          <p>以下のリンクをクリックして、メールアドレスを確認してください：</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>このリンクは24時間後に無効になります。</p>
          <p>このメールに心当たりがない場合は、無視してください。</p>
        `,
      })
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      // Continue with registration even if email fails
    }

    // Remove sensitive fields from response
    const {
      password: _,
      emailVerificationToken: __,
      resetToken: ___,
      ...customerWithoutSensitive
    } = customer

    return NextResponse.json(
      {
        message: '会員登録が完了しました。メールアドレスに確認メールを送信しました。',
        customer: customerWithoutSensitive,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: '登録中にエラーが発生しました' }, { status: 500 })
  }
}

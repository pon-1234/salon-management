import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import logger from '@/lib/logger'
import { requireAdmin } from '@/lib/auth/utils'
import { normalizePhoneNumber } from '@/lib/customer/utils'

const payloadSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
})

function buildPlaceholderEmail(phone: string) {
  return `${phone}@phone.local`
}

function generateTemporaryPassword() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const body = await request.json()
    const parsed = payloadSchema.safeParse(body)
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? '入力内容に誤りがあります'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const data = parsed.data
    const normalizedPhone = normalizePhoneNumber(data.phone)

    if (!normalizedPhone) {
      return NextResponse.json({ error: '電話番号を入力してください' }, { status: 400 })
    }

    const existingPhone = await db.customer.findFirst({ where: { phone: normalizedPhone } })
    if (existingPhone) {
      return NextResponse.json({ error: 'この電話番号は既に登録されています' }, { status: 409 })
    }

    const email = data.email?.trim().toLowerCase() || buildPlaceholderEmail(normalizedPhone)
    const existingEmail = await db.customer.findUnique({ where: { email } })
    if (existingEmail) {
      return NextResponse.json({ error: 'このメールアドレスは既に登録されています' }, { status: 409 })
    }

    const password = generateTemporaryPassword()
    const hashedPassword = await bcrypt.hash(password, 10)

    const customer = await db.customer.create({
      data: {
        name: data.name,
        nameKana: data.name,
        phone: normalizedPhone,
        email,
        password: hashedPassword,
        birthDate: new Date('1970-01-01T00:00:00Z'),
        memberType: 'regular',
        points: 0,
        smsEnabled: false,
        emailNotificationEnabled: false,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
    })

    return NextResponse.json({ customer }, { status: 201 })
  } catch (error) {
    logger.error({ err: error }, 'Failed to create admin customer')
    if ((error as any)?.code === 'P2002') {
      return NextResponse.json({ error: '既に登録済みの情報が含まれています' }, { status: 409 })
    }
    return NextResponse.json({ error: '顧客の作成に失敗しました' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import logger from '@/lib/logger'

const registerPayloadSchema = z.object({
  nickname: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(7),
  password: z.string().min(8),
  birthDate: z.union([z.string().datetime(), z.string().min(1), z.null()]).optional(),
  smsNotifications: z.boolean().optional(),
  storeId: z.string().optional(),
})

function sanitizePhone(phone: string) {
  return phone.replace(/\D/g, '')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = registerPayloadSchema.safeParse(body)

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? '入力内容に誤りがあります'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const data = parsed.data
    const normalizedPhone = sanitizePhone(data.phone)

    if (normalizedPhone.length < 10) {
      return NextResponse.json(
        { error: '電話番号は数字のみで10桁以上で入力してください' },
        { status: 400 }
      )
    }

    const existingEmail = await db.customer.findUnique({ where: { email: data.email } })
    if (existingEmail) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています', code: 'EMAIL_EXISTS' },
        { status: 409 }
      )
    }

    const existingPhone = await db.customer.findFirst({ where: { phone: normalizedPhone } })
    if (existingPhone) {
      return NextResponse.json(
        { error: 'この電話番号は既に登録されています', code: 'PHONE_EXISTS' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(data.password, 10)
    let birthDate = new Date('1970-01-01T00:00:00Z')
    if (data.birthDate && !['', null].includes(data.birthDate as any)) {
      const parsedBirthDate = new Date(data.birthDate as string)
      if (!Number.isNaN(parsedBirthDate.getTime())) {
        birthDate = parsedBirthDate
      }
    }

    const customer = await db.customer.create({
      data: {
        name: data.nickname,
        nameKana: data.nickname,
        email: data.email,
        phone: normalizedPhone,
        password: hashedPassword,
        birthDate,
        memberType: 'regular',
        points: 0,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ customer }, { status: 201 })
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to register customer')

    if (error?.code === 'P2002') {
      return NextResponse.json({ error: '既に登録済みの情報が含まれています' }, { status: 409 })
    }

    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

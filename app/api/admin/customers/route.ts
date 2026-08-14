/**
 * @design_doc   Administrative customer creation boundary
 * @related_to   requireAdmin, Prisma Customer, admin customer creation form
 * @known_issues Customer-to-store ownership and required profile fields await migration policy
 */
import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import logger from '@/lib/logger'
import { requireAdmin } from '@/lib/auth/utils'
import { isValidPhoneInput, normalizePhoneNumber, normalizePhoneQuery } from '@/lib/customer/utils'
import { ensureStoreId, resolveStoreId } from '@/lib/store/server'

const phoneSchema = z
  .string()
  .trim()
  .refine(isValidPhoneInput)
  .transform(normalizePhoneQuery)
  .refine((phone) => phone.length >= 10 && phone.length <= 11)

const payloadSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    phone: phoneSchema,
    email: z
      .string()
      .trim()
      .max(254)
      .email()
      .transform((email) => email.toLowerCase())
      .optional(),
  })
  .strict()

function buildPlaceholderEmail(phone: string) {
  return `${phone}@phone.local`
}

function generateTemporaryPassword() {
  return randomBytes(32).toString('base64url')
}

function databaseErrorCode(error: unknown): string | undefined {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
    ? error.code
    : undefined
}

export async function POST(request: NextRequest) {
  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const authError = await requireAdmin({ permissions: 'customer:create', storeId })
    if (authError) return authError

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

    const email = data.email || buildPlaceholderEmail(normalizedPhone)
    const existingEmail = await db.customer.findUnique({ where: { email } })
    if (existingEmail) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 409 }
      )
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
  } catch (error: unknown) {
    const code = databaseErrorCode(error)
    logger.error(
      {
        ...(code ? { code } : {}),
        errorType: error instanceof Error ? error.name : 'UnknownError',
      },
      'Failed to create admin customer'
    )
    if (code === 'P2002') {
      return NextResponse.json({ error: '既に登録済みの情報が含まれています' }, { status: 409 })
    }
    return NextResponse.json({ error: '顧客の作成に失敗しました' }, { status: 500 })
  }
}

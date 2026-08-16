/**
 * @design_doc   Administrative customer creation boundary
 * @related_to   requireAdmin, Prisma Customer, admin customer creation form
 * @known_issues None
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import logger from '@/lib/logger'
import { requireAdmin } from '@/lib/auth/utils'
import {
  getCustomerPhoneIdentityVariants,
  isValidPhoneInput,
  normalizeWritableCustomerPhoneIdentity,
} from '@/lib/customer/utils'
import { ensureStoreId, resolveStoreId } from '@/lib/store/server'

const phoneSchema = z
  .string()
  .trim()
  .refine(isValidPhoneInput)
  .transform((phone, context) => {
    const canonical = normalizeWritableCustomerPhoneIdentity(phone)
    if (!canonical) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: '電話番号を確認してください' })
      return z.NEVER
    }
    return canonical
  })

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
    const authError = await requireAdmin({ permissions: 'customer:create' })
    if (authError) return authError

    const storeId = await ensureStoreId(await resolveStoreId(request))
    const storeAuthError = await requireAdmin({ permissions: 'customer:create', storeId })
    if (storeAuthError) return storeAuthError

    const body = await request.json()
    const parsed = payloadSchema.safeParse(body)
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? '入力内容に誤りがあります'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const data = parsed.data
    const normalizedPhone = data.phone
    const phoneIdentities = getCustomerPhoneIdentityVariants(normalizedPhone)

    const existingPhone = await db.customer.findFirst({
      where: { phone: { in: phoneIdentities } },
    })
    if (existingPhone) {
      return NextResponse.json({ error: 'この電話番号は既に登録されています' }, { status: 409 })
    }

    if (data.email) {
      const existingEmail = await db.customer.findUnique({ where: { email: data.email } })
      if (existingEmail) {
        return NextResponse.json(
          { error: 'このメールアドレスは既に登録されています' },
          { status: 409 }
        )
      }
    }

    const customer = await db.customer.create({
      data: {
        name: data.name,
        nameKana: null,
        phone: normalizedPhone,
        email: data.email ?? null,
        password: null,
        birthDate: null,
        memberType: 'regular',
        points: 0,
        smsEnabled: false,
        emailNotificationEnabled: false,
        storeAssignments: {
          create: { storeId },
        },
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

/**
 * @design_doc   Customer API endpoints for CRUD operations
 * @related_to   CustomerRepository, Customer type, Prisma Customer model
 * @known_issues Customers remain global until the cross-store ownership policy is approved
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import logger from '@/lib/logger'
import { customers as mockCustomers } from '@/lib/customer/data'
import { isValidPhoneInput, normalizePhoneQuery } from '@/lib/customer/utils'
import { env } from '@/lib/config/env'
import { hasPermission } from '@/lib/auth/permissions'
import { isBcryptSafePassword } from '@/lib/auth/password-policy'
import { sanitizeResponseData } from '@/lib/http/sanitize-response'
import { sanitizeCustomerSelfResponse } from '@/lib/http/customer-dto'

const SALT_ROUNDS = 10
const INVALID_REQUEST = { error: 'Invalid request' }

const customerIdSchema = z.string().trim().min(1).max(191)
const nameSchema = z.string().trim().min(1).max(100)
const emailSchema = z
  .string()
  .trim()
  .max(254)
  .email()
  .transform((email) => email.toLowerCase())
const phoneSchema = z
  .string()
  .trim()
  .refine(isValidPhoneInput)
  .transform(normalizePhoneQuery)
  .refine((phone) => phone.length >= 10 && phone.length <= 11)
const passwordSchema = z.string().min(8).refine(isBcryptSafePassword)
const birthDateSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => {
    const timestamp = Date.parse(value)
    return Number.isFinite(timestamp) && timestamp <= Date.now()
  })
  .transform((value) => new Date(value))

const createCustomerSchema = z
  .object({
    name: nameSchema,
    nameKana: nameSchema,
    phone: phoneSchema,
    email: emailSchema,
    password: passwordSchema,
    birthDate: birthDateSchema,
    memberType: z.enum(['regular', 'vip']).default('regular'),
    smsEnabled: z.boolean().default(false),
    emailNotificationEnabled: z.boolean().default(true),
  })
  .strict()

const adminUpdateCustomerSchema = z
  .object({
    id: customerIdSchema,
    name: nameSchema.optional(),
    nameKana: nameSchema.optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
    birthDate: birthDateSchema.optional(),
    memberType: z.enum(['regular', 'vip']).optional(),
    smsEnabled: z.boolean().optional(),
    emailNotificationEnabled: z.boolean().optional(),
  })
  .strict()
  .refine(({ id: _id, ...updates }) => Object.values(updates).some((value) => value !== undefined))

const selfUpdateCustomerSchema = z
  .object({
    id: customerIdSchema,
    smsEnabled: z.boolean().optional(),
    emailNotificationEnabled: z.boolean().optional(),
  })
  .strict()
  .refine(({ id: _id, ...updates }) => Object.values(updates).some((value) => value !== undefined))

const customerUpdateTargetSchema = z.object({ id: customerIdSchema }).passthrough()

function databaseErrorContext(error: unknown): { code?: string; errorType: string } {
  const code =
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
      ? error.code
      : undefined
  return {
    ...(code ? { code } : {}),
    errorType: error instanceof Error ? error.name : 'UnknownError',
  }
}

function hasOwnPassword(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.prototype.hasOwnProperty.call(value, 'password')
  )
}

function sanitizeCustomer(customer: any) {
  return sanitizeResponseData(customer)
}

function sanitizeCustomerForRole(customer: any, role: string | undefined) {
  return role === 'customer' ? sanitizeCustomerSelfResponse(customer) : sanitizeCustomer(customer)
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')
  const phoneQuery = searchParams.get('phone')
  const limitParam = searchParams.get('limit')
  const offsetParam = searchParams.get('offset')
  const take = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 50) : 10
  const skip = offsetParam ? Math.max(parseInt(offsetParam, 10) || 0, 0) : 0

  const session = await getServerSession(authOptions)
  const isAdmin = session?.user?.role === 'admin'
  const sessionCustomerId = session?.user?.id

  if (isAdmin && !hasPermission(session?.user.permissions ?? [], 'customer:read')) {
    return NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
  }

  try {
    if (id) {
      if (!session) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }

      // Allow admin or the customer themselves
      if (!isAdmin && id !== sessionCustomerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const customer = await db.customer.findUnique({
        where: { id },
        include: {
          ngCasts: {
            include: {
              cast: true,
            },
          },
          reservations: {
            include: {
              cast: true,
              course: true,
              options: {
                include: {
                  option: true,
                },
              },
            },
          },
          reviews: {
            include: {
              cast: true,
            },
          },
        },
      })

      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      }

      return NextResponse.json(sanitizeCustomerForRole(customer, session.user.role))
    }

    if (phoneQuery) {
      if (!session) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const normalizedPhone = phoneQuery.replace(/\D/g, '')
      if (!normalizedPhone) {
        return NextResponse.json([])
      }

      const customers = await db.customer.findMany({
        where: {
          phone: {
            contains: normalizedPhone,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take,
        skip,
        select: {
          id: true,
          name: true,
          nameKana: true,
          phone: true,
          email: true,
          birthDate: true,
          memberType: true,
          points: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      return NextResponse.json(customers.map(sanitizeCustomer))
    }

    // Get all customers - admin only
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const customers = await db.customer.findMany({
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      skip,
      select: {
        id: true,
        name: true,
        nameKana: true,
        phone: true,
        email: true,
        birthDate: true,
        memberType: true,
        points: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      items: customers.slice(0, take).map(sanitizeCustomer),
      limit: take,
      hasMore: customers.length > take,
    })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching customer data')
    if (!env.featureFlags.useMockFallbacks) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (id) {
      if (!session) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      if (!isAdmin && id !== sessionCustomerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const fallback = mockCustomers.find((customer) => customer.id === id)
      if (!fallback) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      }

      return NextResponse.json(sanitizeCustomerForRole(fallback, session.user.role))
    }

    if (phoneQuery) {
      if (!session) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const normalizedPhone = normalizePhoneQuery(phoneQuery)
      if (!normalizedPhone) {
        return NextResponse.json([])
      }
      const matches = mockCustomers.filter((customer) =>
        normalizePhoneQuery(customer.phone).includes(normalizedPhone)
      )
      return NextResponse.json(matches.slice(0, take).map(sanitizeCustomer))
    }

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(mockCustomers.map(sanitizeCustomer))
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!hasPermission(session.user.permissions ?? [], 'customer:create')) {
      return NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(INVALID_REQUEST, { status: 400 })
    }

    if (!hasOwnPassword(body)) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    const parsed = createCustomerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(INVALID_REQUEST, { status: 400 })
    }

    const { password, ...customerData } = parsed.data
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

    const newCustomer = await db.customer.create({
      data: {
        ...customerData,
        password: hashedPassword,
        points: 0,
      },
      include: {
        ngCasts: {
          include: {
            cast: true,
          },
        },
        reservations: {
          include: {
            cast: true,
            course: true,
          },
        },
        reviews: {
          include: {
            cast: true,
          },
        },
      },
    })

    return NextResponse.json(sanitizeCustomer(newCustomer), { status: 201 })
  } catch (error: unknown) {
    const context = databaseErrorContext(error)
    logger.error(context, 'Error creating customer')
    if (context.code === 'P2002') {
      return NextResponse.json({ error: 'Email or phone already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'admin'
    const sessionCustomerId = session?.user?.id

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (isAdmin && !hasPermission(session.user.permissions ?? [], 'customer:update')) {
      return NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(INVALID_REQUEST, { status: 400 })
    }

    let id: string
    let normalizedUpdates: Record<string, unknown>

    if (isAdmin) {
      const parsed = adminUpdateCustomerSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(INVALID_REQUEST, { status: 400 })
      }

      const { id: parsedId, password, ...updates } = parsed.data
      id = parsedId
      normalizedUpdates = password
        ? { ...updates, password: await bcrypt.hash(password, SALT_ROUNDS) }
        : updates

      if (Object.prototype.hasOwnProperty.call(updates, 'email')) {
        Object.assign(normalizedUpdates, {
          emailVerified: false,
          emailVerificationToken: null,
          emailVerificationExpiry: null,
        })
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'phone')) {
        Object.assign(normalizedUpdates, {
          phoneVerified: false,
          phoneVerifiedAt: null,
          phoneVerificationCode: null,
          phoneVerificationExpiry: null,
          phoneVerificationAttempts: 0,
        })
      }
    } else {
      const target = customerUpdateTargetSchema.safeParse(body)
      if (!target.success) {
        return NextResponse.json(INVALID_REQUEST, { status: 400 })
      }
      if (target.data.id !== sessionCustomerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const parsed = selfUpdateCustomerSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(INVALID_REQUEST, { status: 400 })
      }

      const { id: parsedId, ...updates } = parsed.data
      id = parsedId
      normalizedUpdates = updates
    }

    const updatedCustomer = await db.customer.update({
      where: { id },
      data: normalizedUpdates,
      include: {
        ngCasts: {
          include: {
            cast: true,
          },
        },
        reservations: {
          include: {
            cast: true,
            course: true,
          },
        },
        reviews: {
          include: {
            cast: true,
          },
        },
      },
    })

    return NextResponse.json(sanitizeCustomerForRole(updatedCustomer, session.user.role))
  } catch (error: unknown) {
    const context = databaseErrorContext(error)
    logger.error(context, 'Error updating customer')
    if (context.code === 'P2025') {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    if (context.code === 'P2002') {
      return NextResponse.json({ error: 'Email or phone already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

/**
 * @design_doc   Customer API endpoints for CRUD operations
 * @related_to   CustomerRepository, Customer type, Prisma Customer model
 * @known_issues Generic full-profile creation remains separate from store-specific intake
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import logger from '@/lib/logger'
import { customers as mockCustomers } from '@/lib/customer/data'
import {
  getCustomerPhoneIdentityVariants,
  getCustomerPhoneSearchFragments,
  isSameCustomerPhone,
  isValidPhoneInput,
  normalizeWritableCustomerPhoneIdentity,
} from '@/lib/customer/utils'
import { env } from '@/lib/config/env'
import { hasPermission } from '@/lib/auth/permissions'
import { canAdminAccessStore } from '@/lib/auth/store-access'
import { isBcryptSafePassword } from '@/lib/auth/password-policy'
import { sanitizeResponseData } from '@/lib/http/sanitize-response'
import {
  sanitizeCustomerAdminDetailResponse,
  sanitizeCustomerSelfResponse,
} from '@/lib/http/customer-dto'
import { ensureStoreId, resolveStoreId } from '@/lib/store/server'

const SALT_ROUNDS = 10
const INVALID_REQUEST = { error: 'Invalid request' }

const CUSTOMER_DETAIL_PUBLIC_CAST_SELECT = {
  id: true,
  name: true,
  age: true,
  height: true,
  bust: true,
  waist: true,
  hip: true,
  type: true,
  image: true,
  images: true,
  description: true,
  publicProfile: true,
  netReservation: true,
  requestAttendanceEnabled: true,
  specialDesignationFee: true,
  regularDesignationFee: true,
  panelDesignationRank: true,
  regularDesignationRank: true,
  workStatus: true,
  availableOptions: true,
  storeId: true,
} as const

const CUSTOMER_DETAIL_RESERVATION_BASE_SELECT = {
  id: true,
  customerId: true,
  castId: true,
  courseId: true,
  startTime: true,
  endTime: true,
  status: true,
  price: true,
  storeId: true,
  designationType: true,
  designationFee: true,
  transportationFee: true,
  additionalFee: true,
  discountAmount: true,
  paymentMethod: true,
  areaId: true,
  stationId: true,
  hotelName: true,
  roomNumber: true,
  locationMemo: true,
  notes: true,
  pointsUsed: true,
  cancellationSource: true,
  modifiableUntil: true,
  createdAt: true,
  updatedAt: true,
} as const

const CUSTOMER_DETAIL_RESERVATION_OPERATION_SELECT = {
  settlementStatus: true,
  welfareExpense: true,
  paymentReference: true,
  marketingChannel: true,
  storeRevenue: true,
  staffRevenue: true,
  hotelId: true,
  hotelExpense: true,
  entryMemo: true,
  entryReceivedAt: true,
  entryReceivedBy: true,
  entryNotifiedAt: true,
  entryConfirmedAt: true,
  entryReminderSentAt: true,
  storeMemo: true,
  castCheckedInAt: true,
  castCheckedOutAt: true,
  cancellationReason: true,
} as const

function buildCustomerDetailSelect(
  includeReservations: boolean,
  includeReservationOperations: boolean,
  storeId?: string
) {
  return {
    id: true,
    name: true,
    nameKana: true,
    phone: true,
    email: true,
    birthDate: true,
    memberType: true,
    accountStatus: true,
    membershipStage: true,
    lastLoginAt: true,
    lastVisitAt: true,
    points: true,
    smsEnabled: true,
    emailNotificationEnabled: true,
    emailVerified: true,
    phoneVerified: true,
    phoneVerifiedAt: true,
    createdAt: true,
    updatedAt: true,
    ngCasts: {
      ...(storeId ? { where: { cast: { storeId } } } : {}),
      select: {
        castId: true,
        assignedAt: true,
        notes: true,
        assignedBy: true,
        cast: { select: CUSTOMER_DETAIL_PUBLIC_CAST_SELECT },
      },
    },
    ...(includeReservations
      ? {
          reservations: {
            ...(storeId ? { where: { storeId } } : {}),
            select: {
              ...CUSTOMER_DETAIL_RESERVATION_BASE_SELECT,
              ...(includeReservationOperations ? CUSTOMER_DETAIL_RESERVATION_OPERATION_SELECT : {}),
              cast: { select: CUSTOMER_DETAIL_PUBLIC_CAST_SELECT },
              course: {
                select: {
                  id: true,
                  name: true,
                  duration: true,
                  price: true,
                  description: true,
                },
              },
              options: {
                select: {
                  id: true,
                  optionId: true,
                  optionName: true,
                  optionPrice: true,
                  option: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      price: true,
                      duration: true,
                      category: true,
                      note: true,
                    },
                  },
                },
              },
            },
          },
        }
      : {}),
    reviews: {
      ...(storeId ? { where: { cast: { storeId } } } : {}),
      select: {
        id: true,
        castId: true,
        reservationId: true,
        rating: true,
        comment: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        cast: { select: CUSTOMER_DETAIL_PUBLIC_CAST_SELECT },
      },
    },
  } as const
}

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
  .transform((phone, context) => {
    const canonical = normalizeWritableCustomerPhoneIdentity(phone)
    if (!canonical) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid phone number' })
      return z.NEVER
    }
    return canonical
  })
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

function sanitizeCustomerDetailForRole(
  customer: any,
  role: string | undefined,
  includeAdminReservations: boolean
) {
  return role === 'customer'
    ? sanitizeCustomerSelfResponse(customer)
    : sanitizeCustomerAdminDetailResponse(customer, {
        includeReservationOperations: includeAdminReservations,
      })
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')
  const phoneQuery = searchParams.get('phone')
  const customerQuery = searchParams.get('query')?.trim() ?? ''
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

  let adminStoreId: string | undefined
  if (isAdmin && session) {
    try {
      adminStoreId = await ensureStoreId(await resolveStoreId(request))
    } catch (error) {
      logger.warn(
        { errorType: error instanceof Error ? error.name : 'UnknownError' },
        'Invalid customer store scope'
      )
      return NextResponse.json({ error: '店舗を確認してください' }, { status: 400 })
    }

    if (!canAdminAccessStore(session.user, adminStoreId)) {
      return NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
    }
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

      const includeAdminReservations =
        isAdmin && hasPermission(session.user.permissions ?? [], 'reservation:read')
      const includeSelfReservations = session.user.role === 'customer' && id === sessionCustomerId

      if (isAdmin && adminStoreId) {
        const assignment = await db.customerStoreAssignment.findUnique({
          where: { customerId_storeId: { customerId: id, storeId: adminStoreId } },
          select: { customerId: true },
        })
        if (!assignment) {
          return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
        }
      }

      const customer = await db.customer.findUnique({
        where: { id },
        select: buildCustomerDetailSelect(
          includeAdminReservations || includeSelfReservations,
          includeAdminReservations,
          adminStoreId
        ),
      })

      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      }

      return NextResponse.json(
        sanitizeCustomerDetailForRole(customer, session.user.role, includeAdminReservations)
      )
    }

    if (phoneQuery) {
      if (!session) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (!adminStoreId) {
        return NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
      }

      const exactPhoneIdentities = getCustomerPhoneIdentityVariants(phoneQuery)
      if (exactPhoneIdentities.length === 0) {
        return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
      }

      const customers = await db.customer.findMany({
        where: {
          phone: { in: exactPhoneIdentities },
          storeAssignments: { some: { storeId: adminStoreId } },
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
          accountStatus: true,
          membershipStage: true,
          lastLoginAt: true,
          lastVisitAt: true,
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
    if (!adminStoreId) {
      return NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
    }

    if (customerQuery.length > 100) {
      return NextResponse.json(INVALID_REQUEST, { status: 400 })
    }

    const phoneSearchFragments = getCustomerPhoneSearchFragments(customerQuery)
    const phoneSearchQueries =
      phoneSearchFragments.length > 0 ? phoneSearchFragments : [customerQuery]
    const customers = await db.customer.findMany({
      where: {
        storeAssignments: { some: { storeId: adminStoreId } },
        ...(customerQuery
          ? {
              OR: [
                { id: { contains: customerQuery, mode: 'insensitive' as const } },
                { name: { contains: customerQuery, mode: 'insensitive' as const } },
                { nameKana: { contains: customerQuery, mode: 'insensitive' as const } },
                ...phoneSearchQueries.map((phone) => ({ phone: { contains: phone } })),
                { email: { contains: customerQuery, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
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
        accountStatus: true,
        membershipStage: true,
        lastLoginAt: true,
        lastVisitAt: true,
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
    if (isAdmin || !env.featureFlags.useMockFallbacks) {
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

      return NextResponse.json(
        sanitizeCustomerDetailForRole(
          fallback,
          session.user.role,
          isAdmin && hasPermission(session.user.permissions ?? [], 'reservation:read')
        )
      )
    }

    if (phoneQuery) {
      if (!session) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const exactPhoneIdentities = getCustomerPhoneIdentityVariants(phoneQuery)
      if (exactPhoneIdentities.length === 0) {
        return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
      }
      const matches = mockCustomers.filter((customer) =>
        isSameCustomerPhone(customer.phone, phoneQuery)
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

    let storeId: string
    try {
      storeId = await ensureStoreId(await resolveStoreId(request))
    } catch (error) {
      logger.warn(
        { errorType: error instanceof Error ? error.name : 'UnknownError' },
        'Invalid customer creation store scope'
      )
      return NextResponse.json({ error: '店舗を確認してください' }, { status: 400 })
    }
    if (!canAdminAccessStore(session.user, storeId)) {
      return NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
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
    const existingPhone = await db.customer.findFirst({
      where: { phone: { in: getCustomerPhoneIdentityVariants(customerData.phone) } },
      select: { id: true },
    })
    if (existingPhone) {
      return NextResponse.json({ error: 'Email or phone already exists' }, { status: 409 })
    }
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

    const newCustomer = await db.customer.create({
      data: {
        ...customerData,
        password: hashedPassword,
        points: 0,
        storeAssignments: {
          create: { storeId },
        },
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

    let adminStoreId: string | undefined
    if (isAdmin) {
      try {
        adminStoreId = await ensureStoreId(await resolveStoreId(request))
      } catch (error) {
        logger.warn(
          { errorType: error instanceof Error ? error.name : 'UnknownError' },
          'Invalid customer update store scope'
        )
        return NextResponse.json({ error: '店舗を確認してください' }, { status: 400 })
      }

      if (!canAdminAccessStore(session.user, adminStoreId)) {
        return NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
      }
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

    if (isAdmin && adminStoreId) {
      const assignment = await db.customerStoreAssignment.findUnique({
        where: { customerId_storeId: { customerId: id, storeId: adminStoreId } },
        select: { customerId: true },
      })
      if (!assignment) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      }
    }

    if (typeof normalizedUpdates.phone === 'string') {
      const currentCustomer = await db.customer.findUnique({
        where: { id },
        select: { phone: true },
      })
      if (
        !currentCustomer ||
        !isSameCustomerPhone(currentCustomer.phone, normalizedUpdates.phone)
      ) {
        Object.assign(normalizedUpdates, {
          phoneVerified: false,
          phoneVerifiedAt: null,
          phoneVerificationCode: null,
          phoneVerificationExpiry: null,
          phoneVerificationAttempts: 0,
        })
      }

      const existingPhone = await db.customer.findFirst({
        where: {
          id: { not: id },
          phone: { in: getCustomerPhoneIdentityVariants(normalizedUpdates.phone) },
        },
        select: { id: true },
      })
      if (existingPhone) {
        return NextResponse.json({ error: 'Email or phone already exists' }, { status: 409 })
      }
    }

    const includeAdminReservations =
      isAdmin && hasPermission(session.user.permissions ?? [], 'reservation:read')
    const includeSelfReservations = session.user.role === 'customer' && id === sessionCustomerId
    const updatedCustomer = await db.customer.update({
      where: {
        id,
        ...(adminStoreId ? { storeAssignments: { some: { storeId: adminStoreId } } } : {}),
      },
      data: normalizedUpdates,
      select: buildCustomerDetailSelect(
        includeAdminReservations || includeSelfReservations,
        includeAdminReservations,
        adminStoreId
      ),
    })

    return NextResponse.json(
      sanitizeCustomerDetailForRole(updatedCustomer, session.user.role, includeAdminReservations)
    )
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

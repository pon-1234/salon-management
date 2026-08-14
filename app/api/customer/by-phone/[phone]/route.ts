/**
 * @design_doc   Next 15 dynamic route params contract
 * @related_to   customer lookup routes: admin phone-based customer search
 * @known_issues None
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import logger from '@/lib/logger'
import { hasPermission } from '@/lib/auth/permissions'
import { canAdminAccessStore } from '@/lib/auth/store-access'
import { getCustomerPhoneIdentityVariants } from '@/lib/customer/utils'
import { sanitizeCustomerAdminDetailResponse } from '@/lib/http/customer-dto'
import { ensureStoreId, resolveStoreId } from '@/lib/store/server'

const CUSTOMER_LOOKUP_PUBLIC_CAST_SELECT = {
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

const CUSTOMER_LOOKUP_RESERVATION_BASE_SELECT = {
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

const CUSTOMER_LOOKUP_RESERVATION_OPERATION_SELECT = {
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

/**
 * Builds the explicit store-scoped Prisma projection for an administrative phone lookup.
 * The reservation relation is selected only for reservation readers.
 */
function buildCustomerLookupSelect(storeId: string, includeReservationOperations: boolean) {
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
      where: { cast: { storeId } },
      select: {
        castId: true,
        assignedAt: true,
        notes: true,
        assignedBy: true,
        cast: { select: CUSTOMER_LOOKUP_PUBLIC_CAST_SELECT },
      },
    },
    ...(includeReservationOperations
      ? {
          reservations: {
            where: { storeId },
            select: {
              ...CUSTOMER_LOOKUP_RESERVATION_BASE_SELECT,
              ...CUSTOMER_LOOKUP_RESERVATION_OPERATION_SELECT,
              cast: { select: CUSTOMER_LOOKUP_PUBLIC_CAST_SELECT },
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
      where: { cast: { storeId } },
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
        cast: { select: CUSTOMER_LOOKUP_PUBLIC_CAST_SELECT },
      },
    },
  } as const
}

interface RouteParams {
  params: Promise<{
    phone: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { phone } = await params
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const phoneParam = phone ? decodeURIComponent(phone) : ''
    const phoneIdentities = getCustomerPhoneIdentityVariants(phoneParam)
    if (phoneIdentities.length === 0) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    const isAdmin = session.user?.role === 'admin'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!hasPermission(session.user.permissions ?? [], 'customer:read')) {
      return NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
    }

    const storeId = await ensureStoreId(await resolveStoreId(request))
    if (!canAdminAccessStore(session.user, storeId)) {
      return NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
    }

    const includeReservationOperations = hasPermission(
      session.user.permissions ?? [],
      'reservation:read'
    )

    const customer = await db.customer.findFirst({
      where: {
        phone: { in: phoneIdentities },
        storeAssignments: { some: { storeId } },
      },
      select: buildCustomerLookupSelect(storeId, includeReservationOperations),
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json(
      sanitizeCustomerAdminDetailResponse(customer, { includeReservationOperations })
    )
  } catch (error) {
    logger.error(
      { errorType: error instanceof Error ? error.name : 'UnknownError' },
      'Failed to fetch customer by phone'
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * @design_doc   Reservation API endpoints for CRUD operations
 * @related_to   ReservationRepository, Reservation type, Prisma Reservation model
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { NotificationService } from '@/lib/notification/service'
import { castNotificationService } from '@/lib/notification/cast-service'
import logger from '@/lib/logger'
import { PrismaClient } from '@prisma/client'
import { hasPermission } from '@/lib/auth/permissions'
import { format } from 'date-fns'
import { resolveStoreId, ensureStoreId } from '@/lib/store/server'
import { DEFAULT_VALUES, PAYMENT_METHODS, type PaymentMethod } from '@/lib/constants'
import { calculateReservationRevenue } from '@/lib/reservation/revenue'
import {
  addPointTransaction,
  calculateEarnedPoints,
  calculateExpiryDate,
  resolvePointConfig,
} from '@/lib/point/utils'
import {
  buildReservationConfirmationChatContent,
  formatChatAmount,
  resolveReservationTotalAmount,
} from '@/lib/reservation/confirmation-chat'
import { sanitizeReservationCreationInput } from '@/lib/reservation/creation-policy'
import {
  normalizeCancellationReason,
  normalizeOptionalPaymentReference,
} from '@/lib/reservation/financial-reference'
import { resolveCancellationSourceUpdate } from '@/lib/reservation/cancellation-source'
import {
  ReservationLocationError,
  resolveReservationLocation,
} from '@/lib/reservation/location-integrity'
import { ReservationHotelError, resolveReservationHotel } from '@/lib/reservation/hotel-integrity'
import { canAdminAccessStore } from '@/lib/auth/store-access'
import { isReservationStartBoundary } from '@/lib/reservation/time-boundary'
import { reservationStartBoundaryErrorResponse } from '@/lib/reservation/time-boundary-response'
import {
  InvalidOptionSelectionError,
  invalidOptionSelectionResponse,
} from '@/lib/reservation/option-selection-error'
import {
  attachedOptionIds,
  mergeAttachedOptionRecords,
  resolveSelectedOptionIds,
  uniqueResolvedOptionIds,
  type ReservationOptionRecord,
} from '@/lib/reservation/resolve-selected-options'
import { applyStoreCreditCardFee } from '@/lib/reservation/credit-card-fee'
import {
  formatCurrency,
  formatDesignation,
  formatSchedule,
  formatStatus,
  formatText,
  isValidHotelExpense,
  normalizePaymentMethodInput,
  parseReservationDate,
  sanitizeReservationResponse,
  sanitizeReservationResponseForRole,
  valuesDiffer,
} from '@/lib/reservation/route-utils'

// Types
interface AvailabilityCheck {
  available: boolean
  conflicts: Array<{
    id: string
    startTime: string
    endTime: string
  }>
}
type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

const NON_NEGATIVE_FINANCIAL_UPDATE_FIELDS = [
  'price',
  'designationFee',
  'transportationFee',
  'additionalFee',
  'discountAmount',
  'storeRevenue',
  'staffRevenue',
  'welfareExpense',
] as const
// The customer UI directs every post-booking change to the store; cancellation uses DELETE.
// Keep this deny-by-default allowlist explicit so future customer-editable fields require review.
const CUSTOMER_RESERVATION_UPDATE_FIELDS = new Set<string>()

async function sendReservationConfirmedChatMessage(
  reservation: any,
  storeSettings: any
): Promise<void> {
  if (!reservation?.customerId) {
    return
  }

  const amountLabel = formatChatAmount(resolveReservationTotalAmount(reservation))
  const content = buildReservationConfirmationChatContent(amountLabel, storeSettings?.phone ?? '')

  const confirmedAt = new Date()
  const reservationInfo = reservation?.startTime
    ? {
        date: format(reservation.startTime, 'yyyy/MM/dd'),
        time: reservation.endTime
          ? `${format(reservation.startTime, 'HH:mm')}〜${format(reservation.endTime, 'HH:mm')}`
          : format(reservation.startTime, 'HH:mm'),
        confirmedDate: confirmedAt.toISOString(),
      }
    : undefined

  await db.message.create({
    data: {
      customerId: reservation.customerId,
      sender: 'staff',
      content,
      timestamp: confirmedAt,
      readStatus: '未読',
      isReservationInfo: true,
      reservationInfo,
    },
  })
}

// Helper function to check cast availability
async function checkCastAvailability(
  storeId: string,
  castId: string,
  startTime: Date,
  endTime: Date,
  tx: PrismaTransactionClient | PrismaClient = db
): Promise<AvailabilityCheck> {
  // Find overlapping reservations
  const conflicts = await tx.reservation.findMany({
    where: {
      storeId,
      castId,
      status: {
        not: 'cancelled',
      },
      OR: [
        {
          // New reservation starts during existing reservation
          startTime: {
            lte: startTime,
          },
          endTime: {
            gt: startTime,
          },
        },
        {
          // New reservation ends during existing reservation
          startTime: {
            lt: endTime,
          },
          endTime: {
            gte: endTime,
          },
        },
        {
          // New reservation completely contains existing reservation
          startTime: {
            gte: startTime,
          },
          endTime: {
            lte: endTime,
          },
        },
      ],
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
    },
  })

  return {
    available: conflicts.length === 0,
    conflicts: conflicts.map((reservation) => ({
      id: reservation.id,
      startTime: reservation.startTime.toISOString(),
      endTime: reservation.endTime.toISOString(),
    })),
  }
}

const notificationService = new NotificationService()

const NG_REASON_MESSAGES: Record<'customer' | 'cast' | 'staff', string> = {
  customer: '顧客のNG設定のためこの組み合わせでは予約できません。',
  cast: 'キャストのNG設定のためこの組み合わせでは予約できません。',
  staff: '店舗判断のNG設定のためこの組み合わせでは予約できません。',
}

async function findNgEntry(customerId: string, castId: string) {
  return db.ngCastEntry.findUnique({
    where: {
      customerId_castId: {
        customerId,
        castId,
      },
    },
    select: {
      assignedBy: true,
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'admin'
    const sessionCustomerId = session?.user?.id

    if (isAdmin && !canAdminAccessStore(session.user, storeId)) {
      return NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (id) {
      if (!session) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }

      if (isAdmin && !hasPermission(session.user.permissions ?? [], 'reservation:read')) {
        return NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
      }

      const reservation = await db.reservation.findFirst({
        where: { id, storeId },
        include: {
          customer: true,
          cast: true,
          course: true,
          options: {
            include: {
              option: true,
            },
          },
          area: true,
          station: true,
        },
      })

      if (!reservation) {
        return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
      }

      // 管理者または自分の予約のみアクセス可能
      if (!isAdmin && reservation.customerId !== sessionCustomerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      return NextResponse.json(sanitizeReservationResponseForRole(reservation, session.user.role))
    }

    // 管理者は全予約を、顧客は自分の予約のみを取得
    const where: any = { storeId }
    if (!isAdmin) {
      if (!sessionCustomerId) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      where.customerId = sessionCustomerId
    } else if (!hasPermission(session.user.permissions ?? [], 'reservation:read')) {
      return NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
    }

    // フィルタリング
    const castId = searchParams.get('castId')
    const customerId = searchParams.get('customerId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')

    if (castId) where.castId = castId
    if (isAdmin && customerId) where.customerId = customerId
    if (status) {
      if (status === 'active') {
        where.status = { not: 'cancelled' }
      } else if (status === 'adjusting') {
        where.status = { in: ['pending', 'tentative', 'modifiable'] }
      } else {
        where.status = status
      }
    }
    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lt: new Date(endDate),
      }
    }

    // ページネーション
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    const take = limit === null ? 25 : Number.parseInt(limit, 10)
    const skip = offset === null ? 0 : Number.parseInt(offset, 10)

    // ソート
    const sortBy = searchParams.get('sortBy') || 'startTime'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    const allowedSortFields = new Set(['startTime', 'endTime', 'createdAt', 'updatedAt', 'status'])
    if (
      !allowedSortFields.has(sortBy) ||
      (sortOrder !== 'asc' && sortOrder !== 'desc') ||
      !Number.isInteger(take) ||
      take < 1 ||
      take > 100 ||
      !Number.isInteger(skip) ||
      skip < 0
    ) {
      return NextResponse.json({ error: 'Invalid list query' }, { status: 400 })
    }
    const orderBy = { [sortBy]: sortOrder }

    const reservations = await db.reservation.findMany({
      where,
      include: {
        customer: true,
        cast: true,
        course: true,
        options: {
          include: {
            option: true,
          },
        },
        area: true,
        station: true,
      },
      orderBy,
      take,
      skip,
    })

    return NextResponse.json(sanitizeReservationResponseForRole(reservations, session?.user?.role))
  } catch (error) {
    logger.error({ err: error }, 'Error fetching reservation data')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'admin'
    const sessionCustomerId = session?.user?.id

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (session.user.role !== 'admin' && session.user.role !== 'customer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (
      isAdmin &&
      (!hasPermission(session.user.permissions ?? [], 'reservation:create') ||
        !hasPermission(session.user.permissions ?? [], 'customer:read'))
    ) {
      return NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
    }
    if (isAdmin && !canAdminAccessStore(session.user, storeId)) {
      return NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
    }

    const data = await request.json()

    // 管理者は顧客IDを指定可能、顧客は自分のIDのみ
    let targetCustomerId: string
    if (isAdmin && data.customerId) {
      targetCustomerId = data.customerId
    } else if (sessionCustomerId) {
      targetCustomerId = sessionCustomerId
    } else {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { customerId, ...rawReservationData } = data
    const reservationData = sanitizeReservationCreationInput(
      rawReservationData,
      isAdmin
    ) as typeof rawReservationData

    if (
      isAdmin &&
      Object.prototype.hasOwnProperty.call(reservationData, 'hotelExpense') &&
      !isValidHotelExpense(reservationData.hotelExpense)
    ) {
      return NextResponse.json(
        { error: 'ホテル経費は0以上の整数で指定してください。' },
        { status: 400 }
      )
    }

    if (
      !reservationData.castId ||
      !reservationData.courseId ||
      !reservationData.startTime ||
      !reservationData.endTime
    ) {
      return NextResponse.json(
        { error: 'Missing required fields: castId, courseId, startTime, endTime' },
        { status: 400 }
      )
    }

    let startTime: Date
    let endTime: Date
    try {
      startTime = parseReservationDate(reservationData.startTime)
      endTime = parseReservationDate(reservationData.endTime)
    } catch {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    if (!isReservationStartBoundary(startTime)) return reservationStartBoundaryErrorResponse()

    if (endTime <= startTime) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
    }

    const nowUtc = new Date()
    if (startTime.getTime() <= nowUtc.getTime()) {
      return NextResponse.json({ error: 'Cannot create reservations in the past' }, { status: 400 })
    }

    const [castRecord, customerRecord, courseRecord, storeSettings] = await Promise.all([
      db.cast.findFirst({ where: { id: reservationData.castId, storeId } }),
      db.customer.findUnique({
        where: {
          id: targetCustomerId,
          storeAssignments: { some: { storeId } },
        },
        include: {
          ngCasts: {
            select: { castId: true, assignedBy: true },
          },
        },
      }),
      db.coursePrice.findFirst({ where: { id: reservationData.courseId, storeId } }),
      db.storeSettings.findUnique({ where: { storeId } }),
    ])

    if (!customerRecord) {
      return NextResponse.json(
        { error: '指定された顧客が存在しません。顧客情報を登録してください。' },
        { status: 400 }
      )
    }

    if (!isAdmin && !customerRecord.phoneVerified) {
      return NextResponse.json(
        { error: '予約前に電話番号の認証が必要です。', code: 'PHONE_NOT_VERIFIED' },
        { status: 403 }
      )
    }

    if (!castRecord) {
      return NextResponse.json({ error: '指定されたキャストが存在しません。' }, { status: 400 })
    }

    if (!courseRecord) {
      return NextResponse.json(
        { error: '指定されたコースが存在しません。コースを管理画面で登録してください。' },
        { status: 400 }
      )
    }

    let resolvedLocation
    try {
      resolvedLocation = await resolveReservationLocation(db, {
        storeId,
        areaSpecified: Object.prototype.hasOwnProperty.call(reservationData, 'areaId'),
        stationSpecified: Object.prototype.hasOwnProperty.call(reservationData, 'stationId'),
        requestedAreaId: reservationData.areaId,
        requestedStationId: reservationData.stationId,
        currentAreaId: null,
        currentStationId: null,
      })
    } catch (error) {
      if (error instanceof ReservationLocationError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
      }
      throw error
    }

    let resolvedHotel
    try {
      resolvedHotel = await resolveReservationHotel(db, {
        storeId,
        hotelIdSpecified: Object.prototype.hasOwnProperty.call(reservationData, 'hotelId'),
        hotelNameSpecified: Object.prototype.hasOwnProperty.call(reservationData, 'hotelName'),
        requestedHotelId: reservationData.hotelId,
        requestedHotelName: reservationData.hotelName,
        currentHotelId: null,
        currentHotelName: null,
      })
    } catch (error) {
      if (error instanceof ReservationHotelError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
      }
      throw error
    }

    if (!isAdmin) {
      if (!castRecord.netReservation) {
        return NextResponse.json(
          {
            error: 'このキャストは現在ネット予約を受け付けていません。',
            code: 'WEB_RESERVATION_DISABLED',
          },
          { status: 409 }
        )
      }

      const workingSchedule = await db.castSchedule.findFirst({
        where: {
          castId: reservationData.castId,
          isAvailable: true,
          startTime: { lte: startTime },
          endTime: { gte: endTime },
        },
        select: { id: true },
      })

      if (!workingSchedule) {
        return NextResponse.json(
          {
            error: '指定された時間はキャストの出勤時間外です。',
            code: 'CAST_NOT_SCHEDULED',
          },
          { status: 409 }
        )
      }
    }

    const ngRelation = customerRecord.ngCasts?.find(
      (entry) => entry.castId === reservationData.castId
    )
    if (ngRelation) {
      const source = (ngRelation.assignedBy ?? 'customer') as 'customer' | 'cast' | 'staff'
      return NextResponse.json(
        { error: NG_REASON_MESSAGES[source], reason: source },
        { status: 400 }
      )
    }

    const pointConfig = resolvePointConfig(storeSettings)
    const requestedPointsValue =
      typeof reservationData.pointsUsed === 'number'
        ? Math.max(0, Math.floor(reservationData.pointsUsed))
        : 0

    if (requestedPointsValue > 0) {
      if ((customerRecord.points ?? 0) < requestedPointsValue) {
        return NextResponse.json({ error: 'ポイント残高が不足しています' }, { status: 400 })
      }
      if (requestedPointsValue < pointConfig.minPointsToUse) {
        return NextResponse.json(
          { error: `ポイントは${pointConfig.minPointsToUse}pt以上から利用できます` },
          { status: 400 }
        )
      }
    }

    const { areaId: resolvedAreaId, stationId: resolvedStationId } = resolvedLocation

    const rawWelfareRate = castRecord?.welfareExpenseRate ?? storeSettings?.welfareExpenseRate ?? 10
    const normalizedWelfareRate =
      typeof rawWelfareRate === 'number' && Number.isFinite(Number(rawWelfareRate))
        ? Number(rawWelfareRate)
        : 10

    const providedPaymentMethod = reservationData.paymentMethod
    let paymentMethodToPersist: PaymentMethod = PAYMENT_METHODS.CASH
    if (providedPaymentMethod !== undefined && providedPaymentMethod !== null) {
      const normalized = normalizePaymentMethodInput(providedPaymentMethod)
      if (!normalized) {
        return NextResponse.json(
          { error: '支払い方法は現金またはクレジットカードのみ選択できます。' },
          { status: 400 }
        )
      }
      paymentMethodToPersist = normalized
    }

    let paymentReferenceToPersist: string | null = null
    if (isAdmin && paymentMethodToPersist === PAYMENT_METHODS.CARD) {
      try {
        paymentReferenceToPersist = normalizeOptionalPaymentReference(
          reservationData.paymentReference
        )
      } catch {
        return NextResponse.json(
          {
            error: 'カード決済の管理番号を入力してください。カード番号は入力しないでください。',
          },
          { status: 400 }
        )
      }
    }

    // 事前の空き状況チェック（早期リターン）
    const preflightAvailability = await checkCastAvailability(
      storeId,
      reservationData.castId,
      startTime,
      endTime
    )

    if (!preflightAvailability.available) {
      return NextResponse.json(
        { error: 'Time slot is not available', conflicts: preflightAvailability.conflicts },
        { status: 409 }
      )
    }

    // トランザクション内で空き状況の最終チェックと予約作成を行う
    try {
      const newReservation = await db.$transaction(async (tx) => {
        // トランザクション内で再度空き状況をチェック
        const availability = await checkCastAvailability(
          storeId,
          reservationData.castId,
          startTime,
          endTime,
          tx
        )

        if (!availability.available) {
          // 意図的にエラーを発生させてトランザクションをロールバック
          const conflictError = new Error('Time slot is not available')
          ;(conflictError as any).conflicts = availability.conflicts
          throw conflictError
        }

        const optionIds: string[] = Array.isArray(reservationData.options)
          ? reservationData.options
              .filter(
                (optionId: unknown): optionId is string =>
                  typeof optionId === 'string' && optionId.trim().length > 0
              )
              .map((optionId: string) => optionId.trim())
          : []

        let optionsToCreate: Array<{
          optionId: string
          optionName: string
          optionPrice: number
          storeShare: number | null
          castShare: number | null
        }> = []

        if (optionIds.length) {
          const uniqueOptionIds = uniqueResolvedOptionIds(optionIds)
          const optionRecords = await tx.optionPrice.findMany({
            where: {
              id: { in: uniqueOptionIds },
              storeId,
              ...(isAdmin ? {} : { visibility: 'public' }),
            },
            select: {
              id: true,
              name: true,
              price: true,
              storeShare: true,
              castShare: true,
              isActive: true,
              archivedAt: true,
            },
          })

          const { acceptedIds, missingIds } = resolveSelectedOptionIds({
            requestedIds: uniqueOptionIds,
            catalog: optionRecords,
          })

          if (missingIds.length) {
            throw new InvalidOptionSelectionError(missingIds)
          }

          const optionRecordMap = new Map(optionRecords.map((record) => [record.id, record]))
          optionsToCreate = acceptedIds
            .map((optionId) => optionRecordMap.get(optionId))
            .filter((option): option is (typeof optionRecords)[number] => Boolean(option))
            .map((option) => ({
              optionId: option.id,
              optionName: option.name,
              optionPrice: option.price,
              storeShare: option.storeShare ?? null,
              castShare: option.castShare ?? null,
            }))
        }

        const requestedDesignationAmount = Number.isFinite(Number(reservationData.designationFee))
          ? Number(reservationData.designationFee)
          : 0
        const castDesignationAmount =
          reservationData.designationType === 'regular'
            ? castRecord.regularDesignationFee
            : reservationData.designationType === 'special'
              ? castRecord.specialDesignationFee
              : 0
        const designationAmount = isAdmin
          ? requestedDesignationAmount
          : Math.max(Number(castDesignationAmount ?? 0), 0)

        let designationShare: { storeShare: number | null; castShare: number | null } | null = null
        if (designationAmount > 0 && reservationData.designationType) {
          designationShare = await tx.designationFee.findFirst({
            where: { storeId, name: reservationData.designationType },
            select: {
              storeShare: true,
              castShare: true,
            },
          })
        }

        const pointsToUse = requestedPointsValue
        const manualDiscountAmount =
          typeof reservationData.discountAmount === 'number' ? reservationData.discountAmount : 0

        const revenueInputBase = {
          basePrice: Number(courseRecord.price ?? 0),
          course: {
            storeShare: courseRecord.storeShare,
            castShare: courseRecord.castShare,
          },
          options: optionsToCreate.map((option) => ({
            price: option.optionPrice,
            storeShare: option.storeShare ?? undefined,
            castShare: option.castShare ?? undefined,
          })),
          designation:
            designationAmount > 0
              ? {
                  amount: designationAmount,
                  storeShare: designationShare?.storeShare ?? 0,
                  castShare: designationShare?.castShare ?? designationAmount,
                }
              : null,
          transportationFee: reservationData.transportationFee ?? 0,
          additionalFee: reservationData.additionalFee ?? 0,
          discountAmount: manualDiscountAmount,
          welfareRate: normalizedWelfareRate,
        }

        const baseRevenue = calculateReservationRevenue(revenueInputBase)

        if (pointsToUse > baseRevenue.total) {
          throw new Error('ポイント利用数が合計金額を超えています')
        }

        const revenue =
          pointsToUse > 0
            ? calculateReservationRevenue({
                ...revenueInputBase,
                discountAmount: manualDiscountAmount + pointsToUse,
              })
            : baseRevenue

        const revenueWithCardFee = applyStoreCreditCardFee(
          revenue,
          storeSettings?.creditCardFeeRate,
          paymentMethodToPersist
        )

        const createdReservation = await tx.reservation.create({
          data: {
            customerId: targetCustomerId,
            castId: reservationData.castId,
            courseId: reservationData.courseId,
            storeId,
            status: reservationData.status ?? 'pending',
            price: revenueWithCardFee.total,
            designationType: reservationData.designationType ?? null,
            designationFee: designationAmount,
            transportationFee: reservationData.transportationFee ?? 0,
            additionalFee: reservationData.additionalFee ?? 0,
            discountAmount: manualDiscountAmount,
            pointsUsed: pointsToUse,
            paymentMethod: paymentMethodToPersist,
            paymentReference: paymentReferenceToPersist,
            marketingChannel: reservationData.marketingChannel ?? null,
            areaId: resolvedAreaId,
            stationId: resolvedStationId,
            hotelId: resolvedHotel.hotelId,
            hotelName: resolvedHotel.hotelName,
            hotelExpense:
              isAdmin && isValidHotelExpense(reservationData.hotelExpense)
                ? reservationData.hotelExpense
                : 0,
            roomNumber: reservationData.roomNumber ?? null,
            locationMemo: reservationData.locationMemo ?? null,
            notes: reservationData.notes ?? null,
            welfareExpense: revenueWithCardFee.welfareExpense,
            creditCardFee: revenueWithCardFee.creditCardFee,
            storeRevenue: revenueWithCardFee.storeRevenue,
            staffRevenue: revenueWithCardFee.staffRevenue,
            startTime,
            endTime,
            options: optionsToCreate.length
              ? {
                  create: optionsToCreate,
                }
              : undefined,
          },
          include: {
            customer: true,
            cast: true,
            course: true,
            options: { include: { option: true } },
            area: true,
            station: true,
          },
        })

        if (pointsToUse > 0) {
          await addPointTransaction(
            {
              customerId: targetCustomerId,
              type: 'used',
              amount: -pointsToUse,
              description: '予約でポイントを利用',
              reservationId: createdReservation.id,
            },
            tx
          )
        }

        if (createdReservation.status === 'completed') {
          const earnedPoints = calculateEarnedPoints(createdReservation.price, pointConfig)
          if (earnedPoints > 0) {
            await addPointTransaction(
              {
                customerId: createdReservation.customerId,
                type: 'earned',
                amount: earnedPoints,
                description: '予約完了でポイント獲得',
                reservationId: createdReservation.id,
                expiresAt: calculateExpiryDate(pointConfig),
              },
              tx
            )
          }
        }

        return createdReservation
      })

      // 通知はトランザクションが成功した後に実行
      try {
        await notificationService.sendReservationConfirmation(newReservation)
      } catch (notificationError) {
        logger.error({ err: notificationError }, 'Failed to send notification')
      }

      return NextResponse.json(
        sanitizeReservationResponseForRole(newReservation, session.user.role),
        { status: 201 }
      )
    } catch (error: any) {
      if (error.message === 'Time slot is not available') {
        return NextResponse.json(
          {
            error: 'Time slot is not available',
            conflicts: Array.isArray((error as any)?.conflicts) ? (error as any).conflicts : [],
          },
          { status: 409 }
        )
      }
      if (error instanceof InvalidOptionSelectionError) {
        return invalidOptionSelectionResponse(error)
      }
      const message =
        error instanceof Error && error.message ? error.message : 'Internal server error'
      logger.error({ err: error }, 'Error creating reservation')
      return NextResponse.json({ error: message }, { status: 500 })
    }
  } catch (error) {
    // この最上位のcatchは、リクエストの解析や認証などのトランザクション外のエラーを捕捉
    const message =
      error instanceof Error && error.message ? error.message : 'Internal server error'
    logger.error({ err: error }, 'Error in POST handler')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'admin'
    const sessionCustomerId = session?.user?.id

    const data = await request.json()
    const { id, ...updates } = data

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (session.user.role !== 'admin' && session.user.role !== 'customer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (isAdmin && !hasPermission(session.user.permissions ?? [], 'reservation:update')) {
      return NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
    }

    const hasInvalidFinancialValue = NON_NEGATIVE_FINANCIAL_UPDATE_FIELDS.some((field) => {
      const value = updates[field]
      return typeof value === 'number' && (!Number.isFinite(value) || value < 0)
    })
    if (isAdmin && hasInvalidFinancialValue) {
      return NextResponse.json(
        { error: '料金は0以上の有限な数値で指定してください。' },
        { status: 400 }
      )
    }
    if (
      isAdmin &&
      Object.prototype.hasOwnProperty.call(updates, 'hotelExpense') &&
      !isValidHotelExpense(updates.hotelExpense)
    ) {
      return NextResponse.json(
        { error: 'ホテル経費は0以上の整数で指定してください。' },
        { status: 400 }
      )
    }

    const cancellationSourceResolution = resolveCancellationSourceUpdate(
      updates,
      isAdmin ? 'store' : 'customer'
    )
    if (!cancellationSourceResolution.ok) {
      return NextResponse.json(
        { error: 'キャンセル元は店舗または顧客を指定してください。' },
        { status: 400 }
      )
    }
    const cancellationSourceToPersist = cancellationSourceResolution.value

    let cancellationReasonToPersist: string | null | undefined
    if (isAdmin && updates.status === 'cancelled') {
      try {
        cancellationReasonToPersist = normalizeCancellationReason(updates.cancellationReason)
      } catch {
        return NextResponse.json({ error: 'キャンセル理由を入力してください。' }, { status: 400 })
      }
    } else if (updates.status && updates.status !== 'cancelled') {
      cancellationReasonToPersist = null
    }

    const existingReservation = await db.reservation.findUnique({
      where: { id },
      include: {
        cast: true,
        course: true,
        area: true,
        station: true,
        options: {
          include: {
            option: true,
          },
        },
      },
    })

    if (!existingReservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // 管理者または予約の所有者のみ編集可能
    if (!isAdmin && existingReservation.customerId !== sessionCustomerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (existingReservation.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot modify cancelled reservation' }, { status: 400 })
    }

    const storeId = existingReservation.storeId
    if (isAdmin && !canAdminAccessStore(session.user, storeId)) {
      return NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
    }
    const normalizedStoreId = storeId?.trim().toLowerCase()
    const storeIdParam = request.nextUrl.searchParams.get('storeId')
    if (storeIdParam && normalizedStoreId) {
      let requestedCanonicalStoreId: string
      try {
        requestedCanonicalStoreId = await ensureStoreId(storeIdParam)
      } catch {
        return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
      }
      if (requestedCanonicalStoreId !== normalizedStoreId) {
        return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
      }
    }

    // Check if reservation is modifiable
    if (existingReservation.status === 'modifiable' && !isAdmin) {
      // Only admins can modify reservations in modifiable status
      return NextResponse.json(
        { error: 'Only administrators can modify reservations' },
        { status: 403 }
      )
    }

    const requestedUpdateFields = Object.keys(updates)
    if (
      !isAdmin &&
      (requestedUpdateFields.length === 0 ||
        requestedUpdateFields.some((field) => !CUSTOMER_RESERVATION_UPDATE_FIELDS.has(field)))
    ) {
      return NextResponse.json(
        { error: '予約内容の変更は店舗へお問い合わせください' },
        { status: 403 }
      )
    }

    const previousPaymentNormalized =
      normalizePaymentMethodInput(existingReservation.paymentMethod) ?? PAYMENT_METHODS.CASH

    const requestedPaymentMethod =
      updates.paymentMethod !== undefined
        ? normalizePaymentMethodInput(updates.paymentMethod)
        : undefined

    if (updates.paymentMethod !== undefined && !requestedPaymentMethod) {
      return NextResponse.json(
        { error: '支払い方法は現金またはクレジットカードのみ選択できます。' },
        { status: 400 }
      )
    }

    const nextPaymentMethod = requestedPaymentMethod ?? previousPaymentNormalized
    let nextPaymentReference = existingReservation.paymentReference ?? null
    if (nextPaymentMethod === PAYMENT_METHODS.CASH) {
      nextPaymentReference = null
    } else if (Object.prototype.hasOwnProperty.call(updates, 'paymentReference')) {
      try {
        nextPaymentReference = normalizeOptionalPaymentReference(updates.paymentReference)
      } catch {
        return NextResponse.json(
          {
            error: 'カード決済の管理番号を入力してください。カード番号は入力しないでください。',
          },
          { status: 400 }
        )
      }
    }

    const hasRequestedStartTime = Boolean(updates.startTime)
    const hasRequestedEndTime = Boolean(updates.endTime)
    const requestedStartTime = hasRequestedStartTime ? new Date(updates.startTime) : null
    const requestedEndTime = hasRequestedEndTime ? new Date(updates.endTime) : null

    if (
      (requestedStartTime && Number.isNaN(requestedStartTime.getTime())) ||
      (requestedEndTime && Number.isNaN(requestedEndTime.getTime()))
    ) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    const nextStartTime = requestedStartTime ?? existingReservation.startTime
    const nextEndTime = requestedEndTime ?? existingReservation.endTime
    if (nextEndTime <= nextStartTime) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
    }

    const castChanged =
      typeof updates.castId === 'string' &&
      updates.castId.length > 0 &&
      updates.castId !== existingReservation.castId
    const startTimeChanged =
      requestedStartTime !== null &&
      requestedStartTime.getTime() !== existingReservation.startTime.getTime()
    const endTimeChanged =
      requestedEndTime !== null &&
      requestedEndTime.getTime() !== existingReservation.endTime.getTime()
    const changesTime = startTimeChanged || endTimeChanged

    if (startTimeChanged && !isReservationStartBoundary(nextStartTime))
      return reservationStartBoundaryErrorResponse()

    const changesAssignmentOrTime = castChanged || changesTime
    const nextCastId = castChanged ? updates.castId : existingReservation.castId

    if (changesAssignmentOrTime) {
      const ngEntry = await findNgEntry(existingReservation.customerId, nextCastId)
      if (ngEntry) {
        const source = (ngEntry.assignedBy ?? 'customer') as 'customer' | 'cast' | 'staff'
        return NextResponse.json(
          { error: NG_REASON_MESSAGES[source], reason: source },
          { status: 400 }
        )
      }
    }

    if (changesAssignmentOrTime) {
      const availability = await checkCastAvailability(
        storeId,
        nextCastId,
        nextStartTime,
        nextEndTime,
        db
      )
      const filteredConflicts = availability.conflicts.filter((c) => c.id !== id)

      if (filteredConflicts.length > 0) {
        return NextResponse.json(
          { error: 'Time slot is not available', conflicts: filteredConflicts },
          { status: 409 }
        )
      }
    }

    const storeSettings = await db.storeSettings.findUnique({ where: { storeId } })
    const pointConfig = resolvePointConfig(storeSettings)

    const actorId = session?.user?.id ?? 'system'
    const actorName = session?.user?.name ?? 'システム'
    const actorIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const actorAgent = request.headers.get('user-agent') ?? null
    const previousReservation = existingReservation
    const courseChanged =
      typeof updates.courseId === 'string' &&
      updates.courseId.length > 0 &&
      updates.courseId !== existingReservation.courseId
    const designationTypeChanged =
      Object.prototype.hasOwnProperty.call(updates, 'designationType') &&
      (updates.designationType ?? null) !== (existingReservation.designationType ?? null)
    const numericFieldChanged = (requestedValue: unknown, currentValue: unknown) =>
      typeof requestedValue === 'number' &&
      Number.isFinite(requestedValue) &&
      requestedValue !== Number(currentValue ?? 0)
    const requestedOptionIds: string[] | null = Array.isArray(updates.options)
      ? Array.from(
          new Set(
            (updates.options as unknown[])
              .filter(
                (optionId: unknown): optionId is string =>
                  typeof optionId === 'string' && optionId.trim().length > 0
              )
              .map((optionId: string) => optionId.trim())
          )
        )
      : null
    const existingOptionIds = (existingReservation.options ?? [])
      .map((entry: any) => entry.optionId ?? entry.option?.id)
      .filter((optionId: unknown): optionId is string => typeof optionId === 'string')
    const sortedRequestedOptionIds = requestedOptionIds ? [...requestedOptionIds].sort() : null
    const sortedExistingOptionIds = Array.from(new Set(existingOptionIds)).sort()
    const optionsChanged =
      sortedRequestedOptionIds !== null &&
      (sortedRequestedOptionIds.length !== sortedExistingOptionIds.length ||
        sortedRequestedOptionIds.some(
          (optionId, index) => optionId !== sortedExistingOptionIds[index]
        ))
    const shouldRecalculateRevenue =
      castChanged ||
      courseChanged ||
      optionsChanged ||
      designationTypeChanged ||
      numericFieldChanged(updates.price, existingReservation.price) ||
      numericFieldChanged(updates.designationFee, existingReservation.designationFee) ||
      numericFieldChanged(updates.transportationFee, existingReservation.transportationFee) ||
      numericFieldChanged(updates.additionalFee, existingReservation.additionalFee) ||
      numericFieldChanged(updates.discountAmount, existingReservation.discountAmount) ||
      numericFieldChanged(updates.pointsUsed, existingReservation.pointsUsed) ||
      numericFieldChanged(updates.storeRevenue, existingReservation.storeRevenue) ||
      numericFieldChanged(updates.staffRevenue, existingReservation.staffRevenue) ||
      numericFieldChanged(updates.welfareExpense, existingReservation.welfareExpense)

    const updatedReservation = await db.$transaction(async (tx) => {
      const rawOptionIds: string[] | null = optionsChanged ? requestedOptionIds : null
      let normalizedOptionIds: string[] | null = null
      let optionRecordMap: Map<string, ReservationOptionRecord> | null = null

      if (rawOptionIds) {
        const candidateOptionIds = rawOptionIds.filter(
          (optionId): optionId is string =>
            typeof optionId === 'string' && optionId.trim().length > 0
        )

        if (candidateOptionIds.length > 0) {
          const uniqueOptionIds = uniqueResolvedOptionIds(candidateOptionIds)
          const attachedIds = attachedOptionIds(previousReservation.options ?? [])
          const optionRecords = await tx.optionPrice.findMany({
            where: {
              id: {
                in: uniqueOptionIds,
              },
              storeId,
            },
            select: {
              id: true,
              name: true,
              price: true,
              storeShare: true,
              castShare: true,
              isActive: true,
              archivedAt: true,
            },
          })
          const { acceptedIds, missingIds } = resolveSelectedOptionIds({
            requestedIds: uniqueOptionIds,
            catalog: optionRecords,
            attachedIds,
          })
          if (missingIds.length) {
            throw new InvalidOptionSelectionError(missingIds)
          }
          optionRecordMap = mergeAttachedOptionRecords(
            optionRecords,
            previousReservation.options ?? []
          )
          normalizedOptionIds = acceptedIds
        } else {
          normalizedOptionIds = []
        }

        await tx.reservationOption.deleteMany({
          where: { reservationId: id },
        })
      }

      let effectiveCast = previousReservation.cast ?? null
      let effectiveCourse = previousReservation.course ?? null
      // 予約を更新
      const updateData: Record<string, unknown> = {}

      if (castChanged) updateData.castId = updates.castId
      if (courseChanged) updateData.courseId = updates.courseId
      if (updates.status) {
        updateData.status = updates.status
        updateData.modifiableUntil =
          updates.status === 'modifiable'
            ? new Date(Date.now() + DEFAULT_VALUES.MODIFICATION_TIMEOUT_MINUTES * 60 * 1000)
            : null
      }
      if (cancellationSourceToPersist !== undefined) {
        updateData.cancellationSource = cancellationSourceToPersist
      }
      if (cancellationReasonToPersist !== undefined) {
        updateData.cancellationReason = cancellationReasonToPersist
      }
      if ('designationType' in updates) updateData.designationType = updates.designationType ?? null
      if (typeof updates.designationFee === 'number')
        updateData.designationFee = updates.designationFee
      if (typeof updates.transportationFee === 'number')
        updateData.transportationFee = updates.transportationFee
      if (typeof updates.additionalFee === 'number')
        updateData.additionalFee = updates.additionalFee
      if (typeof updates.discountAmount === 'number')
        updateData.discountAmount = updates.discountAmount
      if (typeof updates.pointsUsed === 'number')
        updateData.pointsUsed = Math.max(0, Math.floor(updates.pointsUsed))
      if (updates.marketingChannel) updateData.marketingChannel = updates.marketingChannel
      const hotelIdSpecified = Object.prototype.hasOwnProperty.call(updates, 'hotelId')
      const hotelNameSpecified = Object.prototype.hasOwnProperty.call(updates, 'hotelName')
      if (hotelIdSpecified || hotelNameSpecified) {
        const resolvedHotel = await resolveReservationHotel(tx, {
          storeId,
          hotelIdSpecified,
          hotelNameSpecified,
          requestedHotelId: updates.hotelId,
          requestedHotelName: updates.hotelName,
          currentHotelId: previousReservation.hotelId ?? null,
          currentHotelName: previousReservation.hotelName ?? null,
        })
        updateData.hotelId = resolvedHotel.hotelId
        updateData.hotelName = resolvedHotel.hotelName
      }
      if ('hotelExpense' in updates && isValidHotelExpense(updates.hotelExpense)) {
        updateData.hotelExpense = updates.hotelExpense
      }
      if ('roomNumber' in updates) updateData.roomNumber = updates.roomNumber ?? null
      if ('locationMemo' in updates) updateData.locationMemo = updates.locationMemo ?? null
      if ('notes' in updates) updateData.notes = updates.notes ?? null
      if ('storeMemo' in updates) updateData.storeMemo = updates.storeMemo ?? null
      if (startTimeChanged) {
        updateData.startTime = nextStartTime
      }
      if (endTimeChanged) {
        updateData.endTime = nextEndTime
      }

      if (updateData.castId) {
        const castExists = await tx.cast.findFirst({
          where: { id: updateData.castId as string, storeId },
        })
        if (!castExists) {
          throw new Error('指定されたキャストが存在しません。')
        }
        effectiveCast = castExists
      }

      if (updateData.courseId) {
        const courseExists = await tx.coursePrice.findFirst({
          where: { id: updateData.courseId as string, storeId },
        })
        if (!courseExists) {
          throw new Error('指定されたコースが存在しません。')
        }
        effectiveCourse = courseExists
      }

      const areaSpecified = Object.prototype.hasOwnProperty.call(updates, 'areaId')
      const stationSpecified = Object.prototype.hasOwnProperty.call(updates, 'stationId')
      if (areaSpecified || stationSpecified) {
        const resolvedLocation = await resolveReservationLocation(tx, {
          storeId,
          areaSpecified,
          stationSpecified,
          requestedAreaId: updates.areaId,
          requestedStationId: updates.stationId,
          currentAreaId: previousReservation.areaId ?? null,
          currentStationId: previousReservation.stationId ?? null,
        })
        updateData.areaId = resolvedLocation.areaId
        updateData.stationId = resolvedLocation.stationId
      }

      if (updates.paymentMethod !== undefined) {
        updateData.paymentMethod = nextPaymentMethod
        updateData.paymentReference = nextPaymentReference
      } else if (Object.prototype.hasOwnProperty.call(updates, 'paymentReference')) {
        updateData.paymentReference = nextPaymentReference
      }

      if (shouldRecalculateRevenue) {
        const transportFee =
          typeof updates.transportationFee === 'number'
            ? updates.transportationFee
            : (previousReservation.transportationFee ?? 0)
        const additionalFee =
          typeof updates.additionalFee === 'number'
            ? updates.additionalFee
            : (previousReservation.additionalFee ?? 0)
        const discountAmount =
          typeof updates.discountAmount === 'number'
            ? updates.discountAmount
            : (previousReservation.discountAmount ?? 0)

        const existingPointsUsed =
          typeof updates.pointsUsed === 'number'
            ? Math.max(0, Math.floor(updates.pointsUsed))
            : (previousReservation.pointsUsed ?? 0)

        const currentOptionShares =
          normalizedOptionIds === null
            ? (previousReservation.options ?? []).map((option: any) => ({
                price: Number(option?.option?.price ?? option?.optionPrice ?? 0),
                storeShare: option?.storeShare ?? option?.option?.storeShare ?? null,
                castShare: option?.castShare ?? option?.option?.castShare ?? null,
              }))
            : (normalizedOptionIds ?? []).map((optionId) => {
                const record = optionRecordMap?.get(optionId)
                if (record) {
                  return {
                    price: record.price,
                    storeShare: record.storeShare,
                    castShare: record.castShare,
                  }
                }
                const fallback = previousReservation.options?.find(
                  (entry: any) =>
                    entry.optionId === optionId ||
                    entry.option?.id === optionId ||
                    entry.option?.name === optionId
                )
                return {
                  price: Number(fallback?.option?.price ?? fallback?.optionPrice ?? 0),
                  storeShare: fallback?.storeShare ?? fallback?.option?.storeShare ?? null,
                  castShare: fallback?.castShare ?? fallback?.option?.castShare ?? null,
                }
              })

        const nextDesignationType =
          'designationType' in updates
            ? (updates.designationType ?? null)
            : previousReservation.designationType
        const designationAmount =
          typeof updates.designationFee === 'number'
            ? updates.designationFee
            : (previousReservation.designationFee ?? 0)

        let designationShare: { storeShare: number | null; castShare: number | null } | null = null
        if (designationAmount > 0 && nextDesignationType) {
          designationShare = await tx.designationFee.findFirst({
            where: { storeId, name: nextDesignationType },
            select: { storeShare: true, castShare: true },
          })
        }

        const rawWelfareRate =
          effectiveCast?.welfareExpenseRate ?? storeSettings?.welfareExpenseRate ?? 10
        const normalizedWelfareRate =
          typeof rawWelfareRate === 'number' && Number.isFinite(Number(rawWelfareRate))
            ? Number(rawWelfareRate)
            : 10

        const baseCoursePrice = Number(
          effectiveCourse?.price ??
            previousReservation.course?.price ??
            previousReservation.price ??
            0
        )

        const revenueInputBase = {
          basePrice: baseCoursePrice,
          course: {
            storeShare:
              effectiveCourse?.storeShare ?? previousReservation.course?.storeShare ?? null,
            castShare: effectiveCourse?.castShare ?? previousReservation.course?.castShare ?? null,
          },
          options: currentOptionShares,
          designation:
            designationAmount > 0
              ? {
                  amount: designationAmount,
                  storeShare: designationShare?.storeShare ?? 0,
                  castShare: designationShare?.castShare ?? designationAmount,
                }
              : null,
          transportationFee: transportFee,
          additionalFee,
          discountAmount,
          welfareRate: normalizedWelfareRate,
        }

        const pricedRevenue =
          existingPointsUsed > 0
            ? calculateReservationRevenue({
                ...revenueInputBase,
                discountAmount: discountAmount + existingPointsUsed,
              })
            : calculateReservationRevenue(revenueInputBase)
        const revenue = applyStoreCreditCardFee(
          pricedRevenue,
          storeSettings?.creditCardFeeRate,
          nextPaymentMethod
        )

        updateData.price = revenue.total
        updateData.storeRevenue = revenue.storeRevenue
        updateData.staffRevenue = revenue.staffRevenue
        updateData.welfareExpense = revenue.welfareExpense
        updateData.creditCardFee = revenue.creditCardFee
      }

      const updated = await tx.reservation.update({
        where: { id },
        data: {
          ...updateData,
          options:
            normalizedOptionIds && normalizedOptionIds.length > 0
              ? {
                  create: normalizedOptionIds
                    .map((optionId) => optionRecordMap?.get(optionId))
                    .filter((record): record is ReservationOptionRecord => Boolean(record))
                    .map((record) => ({
                      optionId: record.id,
                      optionName: record.name,
                      optionPrice: record.price,
                      storeShare: record.storeShare,
                      castShare: record.castShare,
                    })),
                }
              : undefined,
        },
        include: {
          customer: true,
          cast: true,
          course: true,
          options: {
            include: {
              option: true,
            },
          },
          area: true,
          station: true,
        },
      })

      const historyEntries: Array<{
        fieldName: string
        fieldDisplayName: string
        oldValue: string | null
        newValue: string | null
        reason: string
      }> = []

      if (valuesDiffer(previousReservation.castId, updated.castId)) {
        const oldLabel = previousReservation.cast?.name || previousReservation.castId || '未設定'
        const newLabel = updated.cast?.name || updated.castId || '未設定'
        historyEntries.push({
          fieldName: 'castId',
          fieldDisplayName: '担当キャスト',
          oldValue: oldLabel,
          newValue: newLabel,
          reason: '担当キャストを変更',
        })
      }

      if (valuesDiffer(previousReservation.courseId, updated.courseId)) {
        const oldCourse =
          previousReservation.course?.name || previousReservation.courseId || '未設定'
        const newCourse = updated.course?.name || updated.courseId || '未設定'
        historyEntries.push({
          fieldName: 'courseId',
          fieldDisplayName: 'コース',
          oldValue: oldCourse,
          newValue: newCourse,
          reason: 'コースを更新',
        })
      }

      if (
        valuesDiffer(previousReservation.startTime, updated.startTime) ||
        valuesDiffer(previousReservation.endTime, updated.endTime)
      ) {
        historyEntries.push({
          fieldName: 'schedule',
          fieldDisplayName: '予約時間',
          oldValue: `${formatSchedule(previousReservation.startTime)} - ${formatSchedule(previousReservation.endTime)}`,
          newValue: `${formatSchedule(updated.startTime)} - ${formatSchedule(updated.endTime)}`,
          reason: '予約時間を変更',
        })
      }

      if (valuesDiffer(previousReservation.status, updated.status)) {
        historyEntries.push({
          fieldName: 'status',
          fieldDisplayName: 'ステータス',
          oldValue: formatStatus(previousReservation.status),
          newValue: formatStatus(updated.status),
          reason: 'ステータスを更新',
        })
      }

      if (valuesDiffer(previousReservation.price, updated.price)) {
        historyEntries.push({
          fieldName: 'price',
          fieldDisplayName: '総額',
          oldValue: formatCurrency(previousReservation.price),
          newValue: formatCurrency(updated.price),
          reason: '料金を更新',
        })
      }

      if (valuesDiffer(previousReservation.designationType, updated.designationType)) {
        historyEntries.push({
          fieldName: 'designationType',
          fieldDisplayName: '指名区分',
          oldValue: formatDesignation(previousReservation.designationType),
          newValue: formatDesignation(updated.designationType),
          reason: '指名設定を変更',
        })
      }

      if (valuesDiffer(previousReservation.designationFee, updated.designationFee)) {
        historyEntries.push({
          fieldName: 'designationFee',
          fieldDisplayName: '指名料',
          oldValue: formatCurrency(previousReservation.designationFee ?? null),
          newValue: formatCurrency(updated.designationFee ?? null),
          reason: '指名料を更新',
        })
      }

      if (valuesDiffer(previousReservation.transportationFee, updated.transportationFee)) {
        historyEntries.push({
          fieldName: 'transportationFee',
          fieldDisplayName: '交通費',
          oldValue: formatCurrency(previousReservation.transportationFee ?? null),
          newValue: formatCurrency(updated.transportationFee ?? null),
          reason: '交通費を更新',
        })
      }

      if (valuesDiffer(previousReservation.additionalFee, updated.additionalFee)) {
        historyEntries.push({
          fieldName: 'additionalFee',
          fieldDisplayName: '追加料金',
          oldValue: formatCurrency(previousReservation.additionalFee ?? null),
          newValue: formatCurrency(updated.additionalFee ?? null),
          reason: '追加料金を更新',
        })
      }

      if (valuesDiffer(previousReservation.discountAmount, updated.discountAmount)) {
        historyEntries.push({
          fieldName: 'discountAmount',
          fieldDisplayName: '割引',
          oldValue: formatCurrency(previousReservation.discountAmount ?? null),
          newValue: formatCurrency(updated.discountAmount ?? null),
          reason: '割引額を更新',
        })
      }

      if (valuesDiffer(previousReservation.paymentMethod, updated.paymentMethod)) {
        historyEntries.push({
          fieldName: 'paymentMethod',
          fieldDisplayName: '支払い方法',
          oldValue: formatText(previousReservation.paymentMethod),
          newValue: formatText(updated.paymentMethod),
          reason: '支払い方法を更新',
        })
      }

      if (valuesDiffer(previousReservation.marketingChannel, updated.marketingChannel)) {
        historyEntries.push({
          fieldName: 'marketingChannel',
          fieldDisplayName: '集客チャネル',
          oldValue: formatText(previousReservation.marketingChannel),
          newValue: formatText(updated.marketingChannel),
          reason: '集客チャネルを更新',
        })
      }

      if (valuesDiffer(previousReservation.areaId, updated.areaId)) {
        const oldArea = previousReservation.area?.name || previousReservation.areaId || '未設定'
        const newArea = updated.area?.name || updated.areaId || '未設定'
        historyEntries.push({
          fieldName: 'areaId',
          fieldDisplayName: 'エリア',
          oldValue: oldArea,
          newValue: newArea,
          reason: '対応エリアを更新',
        })
      }

      if (valuesDiffer(previousReservation.stationId, updated.stationId)) {
        const oldStation =
          previousReservation.station?.name || previousReservation.stationId || '未設定'
        const newStation = updated.station?.name || updated.stationId || '未設定'
        historyEntries.push({
          fieldName: 'stationId',
          fieldDisplayName: '最寄り駅',
          oldValue: oldStation,
          newValue: newStation,
          reason: '最寄り駅を更新',
        })
      }

      if (valuesDiffer((previousReservation as any).hotelName, (updated as any).hotelName)) {
        historyEntries.push({
          fieldName: 'hotelName',
          fieldDisplayName: 'ホテル名',
          oldValue: formatText((previousReservation as any).hotelName),
          newValue: formatText((updated as any).hotelName),
          reason: 'ホテル名を更新',
        })
      }

      if (valuesDiffer((previousReservation as any).roomNumber, (updated as any).roomNumber)) {
        historyEntries.push({
          fieldName: 'roomNumber',
          fieldDisplayName: '部屋番号',
          oldValue: formatText((previousReservation as any).roomNumber),
          newValue: formatText((updated as any).roomNumber),
          reason: '部屋番号を更新',
        })
      }

      if (valuesDiffer(previousReservation.locationMemo, updated.locationMemo)) {
        historyEntries.push({
          fieldName: 'locationMemo',
          fieldDisplayName: '訪問先メモ',
          oldValue: formatText(previousReservation.locationMemo),
          newValue: formatText(updated.locationMemo),
          reason: '訪問先メモを更新',
        })
      }

      if (valuesDiffer(previousReservation.notes, updated.notes)) {
        historyEntries.push({
          fieldName: 'notes',
          fieldDisplayName: '顧客メモ',
          oldValue: formatText(previousReservation.notes),
          newValue: formatText(updated.notes),
          reason: '顧客メモを更新',
        })
      }

      if (valuesDiffer((previousReservation as any).storeMemo, (updated as any).storeMemo)) {
        historyEntries.push({
          fieldName: 'storeMemo',
          fieldDisplayName: '店舗メモ',
          oldValue: formatText((previousReservation as any).storeMemo),
          newValue: formatText((updated as any).storeMemo),
          reason: '店舗メモを更新',
        })
      }

      if (valuesDiffer(previousReservation.storeRevenue, updated.storeRevenue)) {
        historyEntries.push({
          fieldName: 'storeRevenue',
          fieldDisplayName: '店舗売上',
          oldValue: formatCurrency(previousReservation.storeRevenue ?? null),
          newValue: formatCurrency(updated.storeRevenue ?? null),
          reason: '店舗売上を更新',
        })
      }

      if (valuesDiffer(previousReservation.staffRevenue, updated.staffRevenue)) {
        historyEntries.push({
          fieldName: 'staffRevenue',
          fieldDisplayName: 'キャスト売上',
          oldValue: formatCurrency(previousReservation.staffRevenue ?? null),
          newValue: formatCurrency(updated.staffRevenue ?? null),
          reason: 'キャスト売上を更新',
        })
      }

      if (historyEntries.length > 0) {
        await tx.reservationHistory.createMany({
          data: historyEntries.map((entry) => ({
            reservationId: id,
            fieldName: entry.fieldName,
            fieldDisplayName: entry.fieldDisplayName,
            oldValue: entry.oldValue,
            newValue: entry.newValue,
            reason: entry.reason,
            actorId,
            actorName,
            actorIp,
            actorAgent,
          })),
        })
      }

      if (previousReservation.status !== 'completed' && updated.status === 'completed') {
        const earnedPoints = calculateEarnedPoints(
          typeof updated.price === 'number'
            ? updated.price
            : Number(previousReservation.price ?? 0),
          pointConfig
        )
        if (earnedPoints > 0) {
          await addPointTransaction(
            {
              customerId: updated.customerId,
              type: 'earned',
              amount: earnedPoints,
              description: '予約完了でポイント獲得',
              reservationId: updated.id,
              expiresAt: calculateExpiryDate(pointConfig),
            },
            tx
          )
        }
      }

      return updated
    })

    const statusBecameConfirmed =
      previousReservation.status !== 'confirmed' && updatedReservation.status === 'confirmed'

    if (statusBecameConfirmed) {
      try {
        await sendReservationConfirmedChatMessage(updatedReservation, storeSettings)
      } catch (chatError) {
        logger.error({ err: chatError }, 'Failed to send reservation confirmation chat message')
      }
    }

    if (changesTime) {
      try {
        await notificationService.sendReservationModification(updatedReservation, {
          startTime: existingReservation.startTime,
          endTime: existingReservation.endTime,
        })
      } catch (notificationError) {
        logger.error({ err: notificationError }, 'Failed to send notification')
      }
    }

    return NextResponse.json(
      sanitizeReservationResponseForRole(updatedReservation, session.user.role)
    )
  } catch (error) {
    if (error instanceof ReservationLocationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }
    if (error instanceof InvalidOptionSelectionError) {
      return invalidOptionSelectionResponse(error)
    }
    if (error instanceof ReservationHotelError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }
    logger.error({ err: error }, 'Error updating reservation')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'admin'
    const sessionCustomerId = session?.user?.id

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (session.user.role !== 'admin' && session.user.role !== 'customer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (isAdmin && !hasPermission(session.user.permissions ?? [], 'reservation:delete')) {
      return NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
    }
    if (isAdmin && !canAdminAccessStore(session.user, storeId)) {
      return NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
    }

    const existingReservation = await db.reservation.findFirst({
      where: { id, storeId },
      include: {
        customer: true,
        cast: true,
        course: true,
      },
    })

    if (!existingReservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // 管理者または予約の所有者のみキャンセル可能
    if (!isAdmin && existingReservation.customerId !== sessionCustomerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (existingReservation.status === 'cancelled') {
      return NextResponse.json({ error: 'Reservation is already cancelled' }, { status: 400 })
    }

    // 管理者は過去の予約もキャンセル可能
    if (!isAdmin && existingReservation.startTime < new Date()) {
      return NextResponse.json({ error: 'Cannot cancel past reservations' }, { status: 400 })
    }

    const cancellationSource = isAdmin ? 'store' : 'customer'

    const cancelledReservation = await db.reservation.update({
      where: { id },
      data: { status: 'cancelled', storeId, cancellationSource },
      include: {
        customer: true,
        cast: true,
        course: true,
      },
    })

    try {
      await notificationService.sendReservationCancellation(cancelledReservation)
    } catch (notificationError) {
      logger.error({ err: notificationError }, 'Failed to send notification')
    }

    return NextResponse.json(
      sanitizeReservationResponseForRole(cancelledReservation, session.user.role)
    )
  } catch (error) {
    logger.error({ err: error }, 'Error deleting reservation')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

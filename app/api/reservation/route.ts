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
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/constants'
import { calculateReservationRevenue } from '@/lib/reservation/revenue'
import {
  addPointTransaction,
  calculateEarnedPoints,
  calculateExpiryDate,
  resolvePointConfig,
} from '@/lib/point/utils'

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

const STATUS_LABEL_MAP: Record<string, string> = {
  confirmed: '確定済',
  pending: '仮予約',
  tentative: '仮予約',
  cancelled: 'キャンセル',
  modifiable: '修正待ち',
  completed: '対応済み',
}

const DESIGNATION_LABEL_MAP: Record<string, string> = {
  special: '特別指名',
  regular: '本指名',
  none: 'フリー',
}

const ALLOWED_PAYMENT_METHODS = new Set<PaymentMethod>(
  Object.values(PAYMENT_METHODS) as PaymentMethod[]
)

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '未設定'
  }
  return `¥${value.toLocaleString()}`
}

function formatText(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '未設定'
  }
  return String(value)
}

function formatStatus(value: string | null | undefined): string {
  if (!value) {
    return '未設定'
  }
  return STATUS_LABEL_MAP[value] ?? value
}

function formatDesignation(value: string | null | undefined): string {
  if (!value) {
    return '未設定'
  }
  return DESIGNATION_LABEL_MAP[value] ?? value
}

function resolveReservationTotalAmount(reservation: any): number | null {
  if (typeof reservation?.price === 'number') {
    return reservation.price
  }

  const storeShare =
    typeof reservation?.storeRevenue === 'number' ? reservation.storeRevenue : null
  const staffShare =
    typeof reservation?.staffRevenue === 'number' ? reservation.staffRevenue : null

  if (storeShare !== null || staffShare !== null) {
    return (storeShare ?? 0) + (staffShare ?? 0)
  }

  if (typeof reservation?.course?.price === 'number') {
    return reservation.course.price
  }

  return null
}

function formatChatAmount(amount: number | null): string {
  if (typeof amount === 'number' && Number.isFinite(amount)) {
    return `${amount.toLocaleString()}円`
  }
  return '店舗より別途ご案内いたします'
}

function buildReservationConfirmationChatContent(amountLabel: string, phoneNumber: string): string {
  const telLine = phoneNumber?.trim().length ? `TEL：${phoneNumber.trim()}` : 'TEL：店舗までお問い合わせください'
  return [
    'この度はネット予約をご利用いただき誠にありがとうございます。',
    '',
    'ご予約内容を確定させていただきました。',
    '',
    '＜支払内容＞',
    `お支払総額：${amountLabel}（ホテル代別途）`,
    '',
    'ご予約時間10分前までに、ホテル名・お部屋番号を下記お店までお知らせください。',
    telLine,
    '※ご予約内容の変更・キャンセルなどは直接お電話にてご連絡ください。',
    '',
    '＜オススメホテルの紹介＞',
    '※当店が池袋駅西口・北口にございますので下記ホテル及び周辺ホテルですとスムーズのご対応が可能になります。',
    '・トキワウエスト',
    '・グランドホテル',
    '・ホテルトキワ',
    '・アメジスト',
    '※池袋東口・南口・西口一部の場合、別途タクシー代を頂く場合がございますのでご了承ください。',
    '',
    'ぜひ、素敵な時間をお過ごしください。',
  ].join('\n')
}

async function sendReservationConfirmedChatMessage(
  reservation: any,
  storeSettings: any
): Promise<void> {
  if (!reservation?.customerId) {
    return
  }

  const amountLabel = formatChatAmount(resolveReservationTotalAmount(reservation))
  const content = buildReservationConfirmationChatContent(
    amountLabel,
    storeSettings?.phone ?? ''
  )

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

function normalizePaymentMethodInput(input: unknown): PaymentMethod | null {
  if (typeof input !== 'string') {
    return null
  }
  const trimmed = input.trim()
  if (trimmed.length === 0) {
    return null
  }
  const lower = trimmed.toLowerCase()
  if (lower.includes('card') || trimmed.includes('カード')) {
    return PAYMENT_METHODS.CARD
  }
  if (lower.includes('cash') || trimmed.includes('現金')) {
    return PAYMENT_METHODS.CASH
  }
  if (ALLOWED_PAYMENT_METHODS.has(trimmed as PaymentMethod)) {
    return trimmed as PaymentMethod
  }
  return null
}

function formatSchedule(value: Date | null | undefined): string {
  if (!value) {
    return '未設定'
  }
  return format(value, 'yyyy/MM/dd HH:mm')
}

function valuesDiffer(a: unknown, b: unknown): boolean {
  if (a === null || a === undefined) {
    return !(b === null || b === undefined)
  }
  if (b === null || b === undefined) {
    return true
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() !== b.getTime()
  }
  return a !== b
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

function parseReservationDate(raw: string): Date {
  if (typeof raw !== 'string') {
    throw new Error('Invalid date format')
  }

  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    throw new Error('Invalid date format')
  }

  const direct = new Date(trimmed)
  if (!Number.isNaN(direct.getTime())) {
    return direct
  }

  const normalized = trimmed.replace(/\s+/g, 'T')
  const hasTimePortion = normalized.includes('T')
  let isoCandidate = normalized

  if (!hasTimePortion) {
    isoCandidate = `${isoCandidate}T00:00:00`
  } else if (/T\d{2}:\d{2}$/.test(isoCandidate)) {
    isoCandidate = `${isoCandidate}:00`
  }

  if (!/[Zz]|[+-]\d{2}:?\d{2}$/.test(isoCandidate)) {
    isoCandidate = `${isoCandidate}+09:00`
  }

  const fallback = new Date(isoCandidate)
  if (!Number.isNaN(fallback.getTime())) {
    return fallback
  }

  throw new Error('Invalid date format')
}

export async function GET(request: NextRequest) {
  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'admin'
    const sessionCustomerId = session?.user?.id

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

      return NextResponse.json(reservation)
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')

    if (castId) where.castId = castId
    if (status) where.status = status
    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    // ページネーション
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    const take = limit ? parseInt(limit, 10) : undefined
    const skip = offset ? parseInt(offset, 10) : undefined

    // ソート
    const sortBy = searchParams.get('sortBy') || 'startTime'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    const orderBy: any = {}
    orderBy[sortBy] = sortOrder

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

    return NextResponse.json(reservations)
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

    const { customerId, ...reservationData } = data

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

    if (endTime <= startTime) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
    }

    const nowUtc = new Date()
    if (startTime.getTime() <= nowUtc.getTime()) {
      return NextResponse.json(
        { error: 'Cannot create reservations in the past' },
        { status: 400 }
      )
    }

    const [
      castRecord,
      customerRecord,
      courseRecord,
      areaRecord,
      stationRecord,
      storeSettings,
    ] = await Promise.all([
      db.cast.findFirst({ where: { id: reservationData.castId, storeId } }),
      db.customer.findUnique({
        where: { id: targetCustomerId },
        include: {
          ngCasts: {
            select: { castId: true, assignedBy: true },
          },
        },
      }),
      db.coursePrice.findFirst({ where: { id: reservationData.courseId, storeId } }),
      reservationData.areaId ? db.areaInfo.findFirst({ where: { id: reservationData.areaId, storeId } }) : Promise.resolve(null),
      reservationData.stationId
        ? db.stationInfo.findFirst({ where: { id: reservationData.stationId, storeId } })
        : Promise.resolve(null),
      db.storeSettings.findUnique({ where: { storeId } }),
    ])

    if (!customerRecord) {
      return NextResponse.json(
        { error: '指定された顧客が存在しません。顧客情報を登録してください。' },
        { status: 400 }
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

    const resolvedAreaId = reservationData.areaId && areaRecord ? reservationData.areaId : null
    const resolvedStationId =
      reservationData.stationId && stationRecord ? reservationData.stationId : null

    const rawWelfareRate =
      castRecord?.welfareExpenseRate ?? storeSettings?.welfareExpenseRate ?? 10
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
          ? reservationData.options.filter(
              (optionId: unknown): optionId is string =>
                typeof optionId === 'string' && optionId.trim().length > 0
            )
          : []

        let optionsToCreate: Array<{
          optionId: string
          optionName: string
          optionPrice: number
          storeShare: number | null
          castShare: number | null
        }> = []

        if (optionIds.length) {
          const uniqueOptionIds = Array.from(new Set(optionIds))
          const optionRecords = await tx.optionPrice.findMany({
            where: { id: { in: uniqueOptionIds }, storeId },
            select: {
              id: true,
              name: true,
              price: true,
              storeShare: true,
              castShare: true,
            },
          })

          const optionRecordMap = new Map(optionRecords.map((record) => [record.id, record]))
          const missingOptionIds = uniqueOptionIds.filter((optionId) => !optionRecordMap.has(optionId))

          if (missingOptionIds.length) {
            logger.warn({ missingOptionIds }, 'Some option IDs could not be resolved and will be skipped')
          }

          optionsToCreate = optionIds
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

        const designationAmount = Number.isFinite(Number(reservationData.designationFee))
          ? Number(reservationData.designationFee)
          : 0

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
          typeof reservationData.discountAmount === 'number'
            ? reservationData.discountAmount
            : 0

        const revenueInputBase = {
          basePrice: Number(courseRecord.price ?? 0),
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

        const providedStoreRevenue =
          typeof reservationData.storeRevenue === 'number' &&
          Number.isFinite(reservationData.storeRevenue)
            ? reservationData.storeRevenue
            : null

        let storeRevenue =
          providedStoreRevenue !== null
            ? Math.max(providedStoreRevenue, revenue.storeRevenue)
            : revenue.storeRevenue

        if (storeRevenue > revenue.total) {
          storeRevenue = revenue.total
        }

        let staffRevenue =
          typeof reservationData.staffRevenue === 'number' &&
          Number.isFinite(reservationData.staffRevenue)
            ? reservationData.staffRevenue
            : revenue.staffRevenue

        if (providedStoreRevenue !== null && providedStoreRevenue < revenue.storeRevenue) {
          staffRevenue = Math.max(revenue.total - storeRevenue, 0)
        } else if (!Number.isFinite(staffRevenue) || staffRevenue < 0) {
          staffRevenue = Math.max(revenue.total - storeRevenue, 0)
        }

        const createdReservation = await tx.reservation.create({
          data: {
            customerId: targetCustomerId,
            castId: reservationData.castId,
            courseId: reservationData.courseId,
            storeId,
            status: reservationData.status ?? 'pending',
            price: reservationData.price ?? revenue.total,
            designationType: reservationData.designationType ?? null,
            designationFee: reservationData.designationFee ?? 0,
            transportationFee: reservationData.transportationFee ?? 0,
            additionalFee: reservationData.additionalFee ?? 0,
            discountAmount: manualDiscountAmount,
            pointsUsed: pointsToUse,
            paymentMethod: paymentMethodToPersist,
            marketingChannel: reservationData.marketingChannel ?? null,
            areaId: resolvedAreaId,
            stationId: resolvedStationId,
            locationMemo: reservationData.locationMemo ?? null,
            notes: reservationData.notes ?? null,
            welfareExpense: revenue.welfareExpense,
            storeRevenue,
            staffRevenue,
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

      try {
        await castNotificationService.sendReservationCreated(newReservation)
      } catch {
        // エラーログは CastNotificationService 内で出力済み
      }

      return NextResponse.json(newReservation, { status: 201 })
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
      if (error.message?.startsWith('Invalid option selection')) {
        return NextResponse.json(
          {
            error: '選択されたオプションが存在しません。',
            missingOptions: Array.isArray((error as any)?.missingOptions)
              ? (error as any).missingOptions
              : [],
          },
          { status: 400 }
        )
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
    const normalizedStoreId = storeId?.trim().toLowerCase()
    const storeIdParam = request.nextUrl.searchParams.get('storeId')
    if (storeIdParam && normalizedStoreId && storeIdParam.trim().toLowerCase() !== normalizedStoreId) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // Check if reservation is modifiable
    if (existingReservation.status === 'modifiable' && !isAdmin) {
      // Only admins can modify reservations in modifiable status
      return NextResponse.json(
        { error: 'Only administrators can modify reservations' },
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

    const nextCastId = updates.castId || existingReservation.castId
    const ngEntry = await findNgEntry(existingReservation.customerId, nextCastId)
    if (ngEntry) {
      const source = (ngEntry.assignedBy ?? 'customer') as 'customer' | 'cast' | 'staff'
      return NextResponse.json(
        { error: NG_REASON_MESSAGES[source], reason: source },
        { status: 400 }
      )
    }

    if (updates.startTime || updates.endTime) {
      // 日付文字列を直接Dateオブジェクトに変換（タイムゾーン処理を簡略化）
      const startTime = updates.startTime
        ? new Date(updates.startTime)
        : existingReservation.startTime
      const endTime = updates.endTime ? new Date(updates.endTime) : existingReservation.endTime

      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
      }

      if (endTime <= startTime) {
        return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
      }

      const castId = nextCastId
      const availability = await checkCastAvailability(storeId, castId, startTime, endTime, db)
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

    // トランザクション内で予約更新とオプション更新を実行
    const updatedReservation = await db.$transaction(async (tx) => {
      // オプションが変更される場合は既存オプションを削除
      type OptionRecord = {
        id: string
        name: string
        price: number
        storeShare: number | null
        castShare: number | null
      }

      const rawOptionIds: string[] | null = Array.isArray(updates.options)
        ? updates.options
        : null
      let normalizedOptionIds: string[] | null = null
      let optionRecordMap: Map<string, OptionRecord> | null = null

      if (rawOptionIds) {
        await tx.reservationOption.deleteMany({
          where: { reservationId: id },
        })

        const candidateOptionIds = rawOptionIds.filter(
          (optionId): optionId is string =>
            typeof optionId === 'string' && optionId.trim().length > 0
        )

        if (candidateOptionIds.length > 0) {
          const uniqueOptionIds = Array.from(new Set(candidateOptionIds))
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
            },
          })
          optionRecordMap = new Map(optionRecords.map((record) => [record.id, {
            id: record.id,
            name: record.name,
            price: record.price,
            storeShare: record.storeShare ?? null,
            castShare: record.castShare ?? null,
          }]))
          const validOptionIds = new Set(optionRecords.map((option) => option.id))
          if (validOptionIds.size !== uniqueOptionIds.length) {
            logger.warn(
              {
                reservationId: id,
                requestedOptionIds: candidateOptionIds,
                validOptionIds: Array.from(validOptionIds),
              },
              'Some provided reservation option IDs were invalid for this store'
            )
          }
          normalizedOptionIds = candidateOptionIds.filter((optionId) =>
            validOptionIds.has(optionId)
          )
        } else {
          normalizedOptionIds = []
        }
      }

      let effectiveCast = previousReservation.cast ?? null
      let effectiveCourse = previousReservation.course ?? null
      let nextPaymentMethod = requestedPaymentMethod ?? previousPaymentNormalized

      // 予約を更新
      const updateData: Record<string, unknown> = {}

      if (updates.castId) updateData.castId = updates.castId
      if (updates.courseId) updateData.courseId = updates.courseId
      if (updates.status) updateData.status = updates.status
      if ('cancellationSource' in updates) {
        updateData.cancellationSource =
          updates.status === 'cancelled' ? updates.cancellationSource ?? null : null
      } else if (updates.status && updates.status !== 'cancelled') {
        updateData.cancellationSource = null
      }
      if (typeof updates.price === 'number') updateData.price = updates.price
      if ('designationType' in updates) updateData.designationType = updates.designationType ?? null
      if (typeof updates.designationFee === 'number') updateData.designationFee = updates.designationFee
      if (typeof updates.transportationFee === 'number') updateData.transportationFee = updates.transportationFee
      if (typeof updates.additionalFee === 'number') updateData.additionalFee = updates.additionalFee
      if (typeof updates.discountAmount === 'number') updateData.discountAmount = updates.discountAmount
      if (updates.marketingChannel) updateData.marketingChannel = updates.marketingChannel
      if ('areaId' in updates) updateData.areaId = updates.areaId ?? null
      if ('stationId' in updates) updateData.stationId = updates.stationId ?? null
      if ('locationMemo' in updates) updateData.locationMemo = updates.locationMemo ?? null
      if ('notes' in updates) updateData.notes = updates.notes ?? null
      if ('storeRevenue' in updates && typeof updates.storeRevenue === 'number') {
        updateData.storeRevenue = updates.storeRevenue
      }
      if ('staffRevenue' in updates && typeof updates.staffRevenue === 'number') {
        updateData.staffRevenue = updates.staffRevenue
      }

      if (updates.startTime) {
        updateData.startTime = new Date(updates.startTime)
      }
      if (updates.endTime) {
        updateData.endTime = new Date(updates.endTime)
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

      if (updateData.areaId) {
        const areaExists = await tx.areaInfo.findFirst({
          where: { id: updateData.areaId as string, storeId },
        })
        if (!areaExists) {
          throw new Error('指定されたエリアが存在しません。')
        }
      }

      if (updateData.stationId) {
        const stationExists = await tx.stationInfo.findFirst({
          where: { id: updateData.stationId as string, storeId },
        })
        if (!stationExists) {
          throw new Error('指定された駅が存在しません。')
        }
      }

      if (
        updates.paymentMethod !== undefined ||
        nextPaymentMethod !== previousReservation.paymentMethod
      ) {
        updateData.paymentMethod = nextPaymentMethod
      }

      const transportFee =
        typeof updates.transportationFee === 'number'
          ? updates.transportationFee
          : previousReservation.transportationFee ?? 0
      const additionalFee =
        typeof updates.additionalFee === 'number'
          ? updates.additionalFee
          : previousReservation.additionalFee ?? 0
      const discountAmount =
        typeof updates.discountAmount === 'number'
          ? updates.discountAmount
          : previousReservation.discountAmount ?? 0

      const existingPointsUsed = previousReservation.pointsUsed ?? 0

      const currentOptionShares =
        normalizedOptionIds === null
          ? (previousReservation.options ?? []).map((option: any) => ({
              price: Number(option?.option?.price ?? option?.optionPrice ?? 0),
              storeShare:
                option?.storeShare ?? option?.option?.storeShare ?? null,
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
          ? updates.designationType ?? null
          : previousReservation.designationType
      const designationAmount =
        typeof updates.designationFee === 'number'
          ? updates.designationFee
          : previousReservation.designationFee ?? 0

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

      const revenue =
        existingPointsUsed > 0
          ? calculateReservationRevenue({
              ...revenueInputBase,
              discountAmount: discountAmount + existingPointsUsed,
            })
          : calculateReservationRevenue(revenueInputBase)

      const providedStoreRevenue =
        typeof updates.storeRevenue === 'number' && Number.isFinite(updates.storeRevenue)
          ? updates.storeRevenue
          : null

      let storeRevenue =
        providedStoreRevenue !== null
          ? Math.max(providedStoreRevenue, revenue.storeRevenue)
          : revenue.storeRevenue

      if (storeRevenue > revenue.total) {
        storeRevenue = revenue.total
      }

      const providedStaffRevenue =
        typeof updates.staffRevenue === 'number' && Number.isFinite(updates.staffRevenue)
          ? updates.staffRevenue
          : null
      let staffRevenue =
        providedStaffRevenue !== null ? providedStaffRevenue : revenue.staffRevenue

      if (providedStoreRevenue !== null && providedStoreRevenue < revenue.storeRevenue) {
        staffRevenue = Math.max(revenue.total - storeRevenue, 0)
      } else if (!Number.isFinite(staffRevenue) || staffRevenue < 0) {
        staffRevenue = Math.max(revenue.total - storeRevenue, 0)
      }

      if (typeof updates.price !== 'number') {
        updateData.price = revenue.total
      }

      updateData.storeRevenue = storeRevenue
      updateData.staffRevenue = staffRevenue
      updateData.welfareExpense = revenue.welfareExpense

      const updated = await tx.reservation.update({
        where: { id },
        data: {
          ...updateData,
          options:
            normalizedOptionIds && normalizedOptionIds.length > 0
              ? {
                  create: normalizedOptionIds
                    .map((optionId) => optionRecordMap?.get(optionId))
                    .filter((record): record is OptionRecord => Boolean(record))
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
        const oldCourse = previousReservation.course?.name || previousReservation.courseId || '未設定'
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
        const oldStation = previousReservation.station?.name || previousReservation.stationId || '未設定'
        const newStation = updated.station?.name || updated.stationId || '未設定'
        historyEntries.push({
          fieldName: 'stationId',
          fieldDisplayName: '最寄り駅',
          oldValue: oldStation,
          newValue: newStation,
          reason: '最寄り駅を更新',
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
          typeof updated.price === 'number' ? updated.price : revenue.total,
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

    if (updates.startTime || updates.endTime) {
      try {
        await notificationService.sendReservationModification(updatedReservation, {
          startTime: existingReservation.startTime,
          endTime: existingReservation.endTime,
        })
      } catch (notificationError) {
        logger.error({ err: notificationError }, 'Failed to send notification')
      }
    }

    return NextResponse.json(updatedReservation)
  } catch (error) {
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

    return NextResponse.json(cancelledReservation)
  } catch (error) {
    logger.error({ err: error }, 'Error deleting reservation')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

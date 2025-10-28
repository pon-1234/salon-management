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
import logger from '@/lib/logger'
import { fromZonedTime } from 'date-fns-tz'
import { PrismaClient } from '@prisma/client'
import { hasPermission } from '@/lib/auth/permissions'

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

// Helper function to check cast availability
async function checkCastAvailability(
  castId: string,
  startTime: Date,
  endTime: Date,
  tx: PrismaTransactionClient | PrismaClient = db
): Promise<AvailabilityCheck> {
  // Find overlapping reservations
  const conflicts = await tx.reservation.findMany({
    where: {
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

const JST_TIMEZONE = 'Asia/Tokyo'
const notificationService = new NotificationService()

export async function GET(request: NextRequest) {
  try {
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

      const reservation = await db.reservation.findUnique({
        where: { id },
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
    const where: any = {}
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

    const startTime = fromZonedTime(reservationData.startTime, JST_TIMEZONE)
    const endTime = fromZonedTime(reservationData.endTime, JST_TIMEZONE)

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    if (endTime <= startTime) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
    }

    // 事前の空き状況チェック（早期リターン）
    const preflightAvailability = await checkCastAvailability(
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
          : []

        const createdReservation = await tx.reservation.create({
          data: {
            customerId: targetCustomerId,
            castId: reservationData.castId,
            courseId: reservationData.courseId,
            status: reservationData.status ?? 'pending',
            price: reservationData.price ?? 0,
            designationType: reservationData.designationType ?? null,
            designationFee: reservationData.designationFee ?? 0,
            transportationFee: reservationData.transportationFee ?? 0,
            additionalFee: reservationData.additionalFee ?? 0,
            paymentMethod: reservationData.paymentMethod ?? '現金',
            marketingChannel: reservationData.marketingChannel ?? null,
            areaId: reservationData.areaId ?? null,
            stationId: reservationData.stationId ?? null,
            locationMemo: reservationData.locationMemo ?? null,
            notes: reservationData.notes ?? null,
            storeRevenue: reservationData.storeRevenue ?? null,
            staffRevenue: reservationData.staffRevenue ?? null,
            startTime,
            endTime,
            options: optionIds.length
              ? {
                  create: optionIds.map((optionId) => ({ optionId })),
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

        return createdReservation
      })

      // 通知はトランザクションが成功した後に実行
      try {
        await notificationService.sendReservationConfirmation(newReservation)
      } catch (notificationError) {
        logger.error({ err: notificationError }, 'Failed to send notification')
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
      logger.error({ err: error }, 'Error creating reservation')
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  } catch (error) {
    // この最上位のcatchは、リクエストの解析や認証などのトランザクション外のエラーを捕捉
    logger.error({ err: error }, 'Error in POST handler')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    const existingReservation = await db.reservation.findUnique({ where: { id } })

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

    // Check if reservation is modifiable
    if (existingReservation.status === 'modifiable' && !isAdmin) {
      // Only admins can modify reservations in modifiable status
      return NextResponse.json(
        { error: 'Only administrators can modify reservations' },
        { status: 403 }
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

      const castId = updates.castId || existingReservation.castId
      const availability = await checkCastAvailability(castId, startTime, endTime, db)
      const filteredConflicts = availability.conflicts.filter((c) => c.id !== id)

      if (filteredConflicts.length > 0) {
        return NextResponse.json(
          { error: 'Time slot is not available', conflicts: filteredConflicts },
          { status: 409 }
        )
      }
    }

    // トランザクション内で予約更新とオプション更新を実行
    const updatedReservation = await db.$transaction(async (tx) => {
      // オプションが変更される場合は既存オプションを削除
      const optionIds: string[] | null = Array.isArray(updates.options)
        ? updates.options
        : null

      if (optionIds) {
        await tx.reservationOption.deleteMany({
          where: { reservationId: id },
        })
      }

      // 予約を更新
      const updateData: Record<string, unknown> = {}

      if (updates.castId) updateData.castId = updates.castId
      if (updates.courseId) updateData.courseId = updates.courseId
      if (updates.status) updateData.status = updates.status
      if (typeof updates.price === 'number') updateData.price = updates.price
      if ('designationType' in updates) updateData.designationType = updates.designationType ?? null
      if (typeof updates.designationFee === 'number') updateData.designationFee = updates.designationFee
      if (typeof updates.transportationFee === 'number') updateData.transportationFee = updates.transportationFee
      if (typeof updates.additionalFee === 'number') updateData.additionalFee = updates.additionalFee
      if (updates.paymentMethod) updateData.paymentMethod = updates.paymentMethod
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

      return await tx.reservation.update({
        where: { id },
        data: {
          ...updateData,
          options: optionIds
            ? {
                create: optionIds.map((optionId) => ({ optionId })),
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
    })

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

    const existingReservation = await db.reservation.findUnique({ where: { id } })

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

    const cancelledReservation = await db.reservation.update({
      where: { id },
      data: { status: 'cancelled' },
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

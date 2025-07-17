/**
 * @design_doc   Reservation API endpoints for CRUD operations
 * @related_to   ReservationRepository, Reservation type, Prisma Reservation model
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { checkCastAvailability } from './availability/route'
import { NotificationService } from '@/lib/notification/service'
import logger from '@/lib/logger'
import { fromZonedTime } from 'date-fns-tz'

const JST_TIMEZONE = 'Asia/Tokyo'
const notificationService = new NotificationService()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const authCustomerId = request.headers.get('x-customer-id')
    const isAdmin = session?.user?.role === 'admin'

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (id) {
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
        },
      })

      if (!reservation) {
        return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
      }

      // 管理者または自分の予約のみアクセス可能
      if (!isAdmin && reservation.customerId !== authCustomerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      return NextResponse.json(reservation)
    }

    // 管理者は全予約を、顧客は自分の予約のみを取得
    const where: any = {}
    if (!isAdmin) {
      if (!authCustomerId) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      where.customerId = authCustomerId
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
    const authCustomerId = request.headers.get('x-customer-id')
    const isAdmin = session?.user?.role === 'admin'

    const data = await request.json()

    // 管理者は顧客IDを指定可能、顧客は自分のIDのみ
    let targetCustomerId: string
    if (isAdmin && data.customerId) {
      targetCustomerId = data.customerId
    } else if (authCustomerId) {
      targetCustomerId = authCustomerId
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
          throw new Error('Time slot is not available')
        }

        // 予約を作成
        const createdReservation = await tx.reservation.create({
          data: {
            ...reservationData,
            customerId: targetCustomerId, // 対象顧客IDを使用
            startTime,
            endTime,
            options: reservationData.options
              ? {
                  create: reservationData.options.map((optionId: string) => ({
                    optionId,
                  })),
                }
              : undefined,
          },
          include: {
            customer: true,
            cast: true,
            course: true,
            options: { include: { option: true } },
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
        return NextResponse.json({ error: 'Time slot is not available' }, { status: 409 })
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
    const authCustomerId = request.headers.get('x-customer-id')
    const isAdmin = session?.user?.role === 'admin'

    const data = await request.json()
    const { id, customerId, ...updates } = data

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const existingReservation = await db.reservation.findUnique({ where: { id } })

    if (!existingReservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // 管理者または予約の所有者のみ編集可能
    if (!isAdmin && existingReservation.customerId !== authCustomerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (existingReservation.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot modify cancelled reservation' }, { status: 400 })
    }

    // Check if reservation is modifiable and if modification period has expired
    if (existingReservation.status === 'modifiable' && existingReservation.modifiableUntil) {
      const now = new Date()
      const modifiableUntil = new Date(existingReservation.modifiableUntil)

      if (now > modifiableUntil && !isAdmin) {
        return NextResponse.json({ error: 'The modification period has expired' }, { status: 400 })
      }
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
      if (updates.options) {
        await tx.reservationOption.deleteMany({
          where: { reservationId: id },
        })
      }

      // 予約を更新
      return await tx.reservation.update({
        where: { id },
        data: {
          ...updates,
          startTime: updates.startTime ? new Date(updates.startTime) : undefined,
          endTime: updates.endTime ? new Date(updates.endTime) : undefined,
          modifiableUntil: updates.modifiableUntil
            ? new Date(updates.modifiableUntil)
            : updates.modifiableUntil === null
              ? null
              : undefined,
          options: updates.options
            ? {
                create: updates.options.map((optionId: string) => ({
                  optionId,
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
    const authCustomerId = request.headers.get('x-customer-id')
    const isAdmin = session?.user?.role === 'admin'

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const existingReservation = await db.reservation.findUnique({ where: { id } })

    if (!existingReservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // 管理者または予約の所有者のみキャンセル可能
    if (!isAdmin && existingReservation.customerId !== authCustomerId) {
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

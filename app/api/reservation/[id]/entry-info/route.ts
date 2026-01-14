import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { format } from 'date-fns'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth/config'
import { castNotificationService } from '@/lib/notification/cast-service'
import logger from '@/lib/logger'

const entryInfoSchema = z.object({
  hotelName: z.string().trim().max(100).optional().nullable(),
  roomNumber: z.string().trim().max(50).optional().nullable(),
  entryMemo: z.string().trim().max(500).optional().nullable(),
  action: z.enum(['save', 'remind']).optional(),
})

type EntryInfo = {
  hotelName: string | null
  roomNumber: string | null
  entryMemo: string | null
  entryReceivedAt: Date
  entryReceivedBy: string
}

function normalizeText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function formatDateTime(value: Date) {
  return format(value, 'yyyy/MM/dd HH:mm')
}

function buildEntryInfoMessage(params: {
  reservationId: string
  castName: string
  customerName: string
  startTime: Date
  endTime: Date
  entry: EntryInfo
}) {
  const { reservationId, castName, customerName, startTime, endTime, entry } = params
  const lines = [
    '【入室情報の共有】',
    `予約ID: ${reservationId}`,
    `キャスト: ${castName}`,
    `お客様: ${customerName}`,
    `日時: ${formatDateTime(startTime)} 〜 ${formatDateTime(endTime)}`,
    entry.hotelName ? `ホテル名: ${entry.hotelName}` : 'ホテル名: 未設定',
    entry.roomNumber ? `部屋番号: ${entry.roomNumber}` : '部屋番号: 未設定',
    entry.entryMemo ? `連絡メモ: ${entry.entryMemo}` : '連絡メモ: なし',
    `受付時刻: ${formatDateTime(entry.entryReceivedAt)}`,
    `受付担当: ${entry.entryReceivedBy}`,
    '',
    '確認後はアプリ内の「確認済み」ボタンを押してください。',
  ]

  return lines.join('\n')
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const reservationId = params.id
  if (!reservationId) {
    return NextResponse.json({ error: 'reservationId is required' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const payload = entryInfoSchema.parse(body)
    const action = payload.action ?? 'save'

    const storeId = request.nextUrl.searchParams.get('storeId')

    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: {
        cast: {
          select: {
            id: true,
            name: true,
            lineUserId: true,
          },
        },
        customer: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!reservation || (storeId && reservation.storeId !== storeId)) {
      return NextResponse.json({ error: '予約が見つかりません。' }, { status: 404 })
    }

    const cast = reservation.cast
    if (!cast) {
      return NextResponse.json({ error: 'キャストが設定されていません。' }, { status: 400 })
    }

    const now = new Date()
    const staffName = session.user.name || session.user.email || 'スタッフ'

    let entryInfo: EntryInfo

    if (action === 'save') {
      const hotelName = normalizeText(payload.hotelName) ?? reservation.hotelName ?? null
      const roomNumber = normalizeText(payload.roomNumber) ?? reservation.roomNumber ?? null
      const entryMemo = normalizeText(payload.entryMemo) ?? reservation.entryMemo ?? null

      entryInfo = {
        hotelName,
        roomNumber,
        entryMemo,
        entryReceivedAt: now,
        entryReceivedBy: staffName,
      }

      await db.reservation.update({
        where: { id: reservationId },
        data: {
          hotelName,
          roomNumber,
          entryMemo,
          entryReceivedAt: entryInfo.entryReceivedAt,
          entryReceivedBy: entryInfo.entryReceivedBy,
          entryNotifiedAt: now,
          entryConfirmedAt: null,
          entryReminderSentAt: null,
        },
      })
    } else {
      entryInfo = {
        hotelName: reservation.hotelName ?? null,
        roomNumber: reservation.roomNumber ?? null,
        entryMemo: reservation.entryMemo ?? null,
        entryReceivedAt: reservation.entryReceivedAt ?? now,
        entryReceivedBy: reservation.entryReceivedBy ?? staffName,
      }

      await db.reservation.update({
        where: { id: reservationId },
        data: {
          entryReminderSentAt: now,
          entryNotifiedAt: reservation.entryNotifiedAt ?? now,
        },
      })
    }

    const message = buildEntryInfoMessage({
      reservationId: reservation.id,
      castName: cast.name ?? '未設定',
      customerName: reservation.customer?.name ?? 'お客様',
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      entry: entryInfo,
    })

    let lineStatus: 'sent' | 'failed' = 'sent'
    let lineErrorMessage: string | null = null
    try {
      await castNotificationService.sendEntryInfoNotification({
        cast: {
          id: cast.id,
          name: cast.name ?? '未設定',
          lineUserId: cast.lineUserId,
        },
        message,
      })
    } catch (error) {
      lineStatus = 'failed'
      lineErrorMessage = error instanceof Error ? error.message : 'LINE通知の送信に失敗しました。'
      logger.error({ err: error, reservationId }, 'Failed to send entry info LINE notification')
    }

    await db.message.create({
      data: {
        castId: cast.id,
        sender: 'staff',
        content: message,
        timestamp: now,
        readStatus: '未読',
        isReservationInfo: true,
        reservationInfo: Prisma.JsonNull,
      },
    })

    await db.reservationLineLog.create({
      data: {
        reservationId: reservation.id,
        castId: cast.id,
        message,
        status: lineStatus,
        errorMessage: lineErrorMessage,
      },
    })

    const updatedReservation = await db.reservation.findUnique({
      where: { id: reservationId },
      select: {
        hotelName: true,
        roomNumber: true,
        entryMemo: true,
        entryReceivedAt: true,
        entryReceivedBy: true,
        entryNotifiedAt: true,
        entryConfirmedAt: true,
        entryReminderSentAt: true,
      },
    })

    return NextResponse.json({
      ...updatedReservation,
      entryReceivedAt: updatedReservation?.entryReceivedAt?.toISOString() ?? null,
      entryNotifiedAt: updatedReservation?.entryNotifiedAt?.toISOString() ?? null,
      entryConfirmedAt: updatedReservation?.entryConfirmedAt?.toISOString() ?? null,
      entryReminderSentAt: updatedReservation?.entryReminderSentAt?.toISOString() ?? null,
    })
  } catch (error) {
    logger.error({ err: error, reservationId }, 'Failed to update entry info')
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? '入力が不正です。' }, { status: 400 })
    }
    return NextResponse.json({ error: '入室情報の更新に失敗しました。' }, { status: 500 })
  }
}

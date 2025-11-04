/**
 * @design_doc   Manual LINE messaging endpoint for reservation detail screen
 * @related_to   components/reservation/reservation-dialog.tsx
 * @known_issues No pagination for logs; extend if volume grows
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAdmin } from '@/lib/auth/utils'
import { handleApiError } from '@/lib/api/errors'
import { SuccessResponses } from '@/lib/api/responses'
import { db } from '@/lib/db'
import { castNotificationService } from '@/lib/notification/cast-service'
import { ensureStoreId, resolveStoreId } from '@/lib/store/server'

const sendMessageSchema = z.object({
  message: z.string().trim().min(1, 'メッセージを入力してください。').max(1000, 'メッセージは1000文字以内で入力してください。'),
})

const toDto = (log: {
  id: string
  message: string
  status: string
  errorMessage: string | null
  createdAt: Date
  cast?: { id: string; name: string | null } | null
}) => ({
  id: log.id,
  message: log.message,
  status: log.status,
  errorMessage: log.errorMessage,
  createdAt: log.createdAt.toISOString(),
  cast: log.cast
    ? {
        id: log.cast.id,
        name: log.cast.name ?? 'キャスト未設定',
      }
    : null,
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const reservationId = params.id
    if (!reservationId) {
      return NextResponse.json({ error: 'Reservation ID is required' }, { status: 400 })
    }

    const storeId = await ensureStoreId(await resolveStoreId(request))

    const logs = await db.reservationLineLog.findMany({
      where: {
        reservationId,
        reservation: {
          storeId,
        },
      },
      include: {
        cast: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return SuccessResponses.ok(logs.map(toDto))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const reservationId = params.id
    if (!reservationId) {
      return NextResponse.json({ error: 'Reservation ID is required' }, { status: 400 })
    }

    const storeId = await ensureStoreId(await resolveStoreId(request))

    const body = await request.json().catch(() => ({}))
    const { message } = sendMessageSchema.parse(body)
    const trimmedMessage = message.trim()

    const reservation = await db.reservation.findFirst({
      where: {
        id: reservationId,
        storeId,
      },
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
        course: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    if (!reservation.cast) {
      return NextResponse.json(
        { error: 'キャストが設定されていないためLINE送信できません。' },
        { status: 400 }
      )
    }

    let status: 'sent' | 'failed' = 'sent'
    let errorMessage: string | null = null

    try {
      await castNotificationService.sendManualMessage({
        cast: {
          id: reservation.cast.id,
          name: reservation.cast.name,
          lineUserId: reservation.cast.lineUserId,
        },
        message: trimmedMessage,
      })
    } catch (error) {
      status = 'failed'
      errorMessage =
        error instanceof Error ? error.message : 'LINE通知の送信に失敗しました。時間を置いて再度お試しください。'
    }

    const log = await db.reservationLineLog.create({
      data: {
        reservationId: reservation.id,
        castId: reservation.cast.id,
        message: trimmedMessage,
        status,
        errorMessage,
      },
      include: {
        cast: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (status === 'failed') {
      return NextResponse.json(
        {
          error: errorMessage ?? 'LINE通知の送信に失敗しました。',
          data: toDto(log),
        },
        { status: 502 }
      )
    }

    return SuccessResponses.created(toDto(log))
  } catch (error) {
    return handleApiError(error)
  }
}

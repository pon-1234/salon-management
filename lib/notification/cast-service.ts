/**
 * @design_doc   Notification helper for delivering LINE alerts to casts
 * @related_to   app/api/reservation/route.ts, app/api/chat/route.ts, line/client.ts
 * @known_issues Currently only sends text messages; extend if richer payloads are needed
 */
import { format } from 'date-fns'
import logger from '@/lib/logger'
import { env } from '@/lib/config/env'
import { LineMessagingClient, lineMessagingClient } from '@/lib/line/client'
import type { ChatAttachment } from '@/lib/types/chat'
import { buildChatPreview } from '@/lib/chat/attachments'

type CastRecipient = {
  id: string
  name: string
  lineUserId?: string | null
}

type ReservationForNotification = {
  id: string
  startTime: Date | string
  endTime?: Date | string | null
  status?: string | null
  notes?: string | null
  customer?: {
    name?: string | null
  } | null
  cast?: CastRecipient | null
  course?: {
    name?: string | null
  } | null
}

type ChatMessageForNotification = {
  id: string
  sender: 'customer' | 'staff' | 'cast'
  content: string
  timestamp: Date | string
  attachments?: ChatAttachment[]
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: '確定',
  pending: '仮予約',
  tentative: '仮予約',
  cancelled: 'キャンセル',
  modifiable: '修正待ち',
  completed: '対応済み',
}

const SENDER_LABELS: Record<ChatMessageForNotification['sender'], string> = {
  staff: 'スタッフ',
  customer: 'お客様',
  cast: 'キャスト',
}

function parseDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDateTime(value: Date | string | null | undefined): string {
  const date = parseDate(value)
  if (!date) return ''
  try {
    return format(date, 'yyyy/MM/dd HH:mm')
  } catch {
    return date.toISOString()
  }
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`
}

export class CastNotificationService {
  constructor(private readonly lineClient: LineMessagingClient = lineMessagingClient) {}

  private resolveRecipient(cast?: CastRecipient | null): string | undefined {
    const candidate = cast?.lineUserId?.trim()
    if (candidate) {
      return candidate
    }
    return this.lineClient.getDefaultUserId()
  }

  private ensureConfigured(): boolean {
    if (!this.lineClient.isConfigured()) {
      logger.debug('LINE messaging is not configured; skipping cast notification')
      return false
    }
    return true
  }

  async sendReservationCreated(reservation: ReservationForNotification): Promise<void> {
    if (!this.ensureConfigured()) return

    const recipient = this.resolveRecipient(reservation.cast)
    if (!recipient) {
      logger.info(
        {
          reservationId: reservation.id,
          castId: reservation.cast?.id,
        },
        'Skipping reservation notification because no LINE recipient is configured'
      )
      return
    }

    const lines = [
      '【新規予約のお知らせ】',
      `キャスト: ${reservation.cast?.name ?? '未設定'}`,
      `お客様: ${reservation.customer?.name ?? '非公開'}`,
      `日時: ${formatDateTime(reservation.startTime)}`,
    ]

    const endTimeFormatted = formatDateTime(reservation.endTime ?? null)
    if (endTimeFormatted) {
      lines[lines.length - 1] = `${lines[lines.length - 1]} 〜 ${endTimeFormatted}`
    }

    if (reservation.course?.name) {
      lines.push(`コース: ${reservation.course.name}`)
    }

    if (reservation.status) {
      const label =
        STATUS_LABELS[reservation.status] ?? STATUS_LABELS[reservation.status.toLowerCase()] ?? reservation.status
      lines.push(`ステータス: ${label}`)
    }

    if (reservation.notes) {
      lines.push(`メモ: ${truncate(reservation.notes, 200)}`)
    }

    const siteUrl = env.siteUrl?.trim()
    const castReservationUrl =
      siteUrl && reservation.id
        ? `${siteUrl.replace(/\/$/, '')}/cast/reservations?highlight=${reservation.id}`
        : null

    if (castReservationUrl) {
      lines.push('')
      lines.push(`予約詳細はこちら: ${castReservationUrl}`)
    } else if (siteUrl) {
      lines.push('')
      lines.push(`管理画面で詳細を確認: ${siteUrl}`)
    } else {
      lines.push('')
      lines.push('管理画面で詳細を確認してください。')
    }

    const message = lines.join('\n')

    try {
      await this.lineClient.pushText(recipient, message)
    } catch (error) {
      logger.error(
        {
          err: error,
          reservationId: reservation.id,
          castId: reservation.cast?.id,
        },
        'Failed to send LINE reservation notification to cast'
      )
      throw error
    }
  }

  async sendEntryInfoNotification(params: { cast: CastRecipient; message: string }): Promise<void> {
    if (!this.ensureConfigured()) return

    const recipient = this.resolveRecipient(params.cast)
    if (!recipient) {
      logger.info(
        { castId: params.cast.id },
        'Skipping entry info notification because no LINE recipient is configured'
      )
      return
    }

    try {
      await this.lineClient.pushText(recipient, params.message)
    } catch (error) {
      logger.error(
        {
          err: error,
          castId: params.cast.id,
        },
        'Failed to send LINE entry info notification to cast'
      )
      throw error
    }
  }

  async sendChatMessageNotification(params: {
    cast: CastRecipient
    message: ChatMessageForNotification
  }): Promise<void> {
    if (!this.ensureConfigured()) return

    const recipient = this.resolveRecipient(params.cast)
    if (!recipient) {
      logger.info(
        { castId: params.cast.id },
        'Skipping chat notification because no LINE recipient is configured'
      )
      return
    }

    const senderLabel = SENDER_LABELS[params.message.sender] ?? params.message.sender
    const timestamp = formatDateTime(params.message.timestamp)
    const previewSource = buildChatPreview(params.message.content, params.message.attachments)
    const preview = truncate(previewSource.length > 0 ? previewSource : '画像が送信されました', 500)
    const siteUrl = env.siteUrl?.trim()

    const lines = [
      '【新着チャットのお知らせ】',
      `キャスト: ${params.cast.name}`,
      `送信者: ${senderLabel}`,
      timestamp ? `受信: ${timestamp}` : undefined,
      '',
      preview,
      '',
      siteUrl
        ? `管理画面から返信: ${siteUrl}`
        : '管理画面にアクセスして内容を確認してください。',
    ].filter((line): line is string => typeof line === 'string' && line.length >= 0)

    const message = lines.join('\n')

    try {
      await this.lineClient.pushText(recipient, message)
    } catch (error) {
      logger.error(
        {
          err: error,
          castId: params.cast.id,
          messageId: params.message.id,
        },
        'Failed to send LINE chat notification to cast'
      )
      throw error
    }
  }

  async sendManualMessage(params: { cast: CastRecipient; message: string }): Promise<void> {
    if (!this.ensureConfigured()) {
      throw new Error('LINE通知機能が未設定のため送信できません。')
    }

    const recipient = this.resolveRecipient(params.cast)
    if (!recipient) {
      throw new Error('キャストのLINEユーザーIDが登録されていません。')
    }

    const trimmed = params.message?.trim()
    if (!trimmed) {
      throw new Error('送信メッセージが空です。')
    }

    await this.lineClient.pushText(recipient, trimmed)
  }
}

export const castNotificationService = new CastNotificationService()

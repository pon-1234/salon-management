/**
 * @design_doc   Handles LINE webhook commands for linking casts with LINE user IDs
 * @related_to   app/api/line/webhook/route.ts, Cast model
 * @known_issues Only supports simple "reg <castId>" text commands for now
 */
import type { PrismaClient } from '@prisma/client'
import logger from '@/lib/logger'
import { LineMessagingClient, lineMessagingClient } from '@/lib/line/client'
import type { LineWebhookEvent } from '@/lib/line/webhook'

type CastRepository = Pick<PrismaClient['cast'], 'findUnique' | 'findFirst' | 'update'>
type MessagingClient = Pick<LineMessagingClient, 'pushText' | 'isConfigured'>

export type CastRegistrationResult =
  | {
      status: 'ignored'
      reason: 'missing_user_id' | 'unsupported_event' | 'unrecognized_command'
      eventType: string
      lineUserId?: string
    }
  | {
      status: 'acknowledged'
      reason: 'sent_instructions'
      eventType: string
      lineUserId: string
    }
  | {
      status: 'linked'
      castId: string
      castName?: string | null
      lineUserId: string
      previousLineUserId?: string | null
    }
  | {
      status: 'not_found' | 'conflict'
      castId?: string
      lineUserId: string
      conflictedCastId?: string
      conflictedCastName?: string | null
    }
  | {
      status: 'error'
      message: string
    }

const REGISTRATION_COMMAND = /^(?:reg|register|link)\s+([a-z0-9_-]{6,64})$/i

export function extractCastIdFromCommand(text: string | null | undefined): string | null {
  if (!text) return null
  const normalized = text.trim()
  if (!normalized) return null
  const match = REGISTRATION_COMMAND.exec(normalized)
  return match ? match[1] : null
}

export function extractCastIdFromPostback(data: string | null | undefined): string | null {
  if (!data) return null
  try {
    const params = new URLSearchParams(data)
    return params.get('castId')
  } catch {
    return null
  }
}

export class LineCastRegistrationService {
  constructor(
    private readonly deps: {
      castRepository: CastRepository
      messagingClient?: MessagingClient
    }
  ) {}

  async handleEvent(event: LineWebhookEvent): Promise<CastRegistrationResult> {
    const lineUserId = event.source?.userId
    if (!lineUserId) {
      return {
        status: 'ignored',
        reason: 'missing_user_id',
        eventType: event.type,
      }
    }

    if (event.type === 'follow') {
      await this.sendMessage(
        lineUserId,
        [
          'ご登録ありがとうございます。',
          'LINE通知を受け取るには、以下の形式でメッセージを送信してください。',
          '',
          'reg <キャストID>',
          '',
          '例: reg cmgufq9rz000dhh6ynwqtybix',
        ].join('\n')
      )
      return {
        status: 'acknowledged',
        reason: 'sent_instructions',
        eventType: event.type,
        lineUserId,
      }
    }

    if (event.type === 'message' && event.message?.type === 'text') {
      const castId = extractCastIdFromCommand(event.message.text)
      if (!castId) {
        return {
          status: 'ignored',
          reason: 'unrecognized_command',
          eventType: event.type,
          lineUserId,
        }
      }
      return this.linkCast(lineUserId, castId)
    }

    if (event.type === 'postback' && event.postback?.data) {
      const castId = extractCastIdFromPostback(event.postback.data)
      if (!castId) {
        return {
          status: 'ignored',
          reason: 'unrecognized_command',
          eventType: event.type,
          lineUserId,
        }
      }
      return this.linkCast(lineUserId, castId)
    }

    return {
      status: 'ignored',
      reason: 'unsupported_event',
      eventType: event.type,
      lineUserId,
    }
  }

  private async linkCast(lineUserId: string, castId: string): Promise<CastRegistrationResult> {
    try {
      const repository = this.deps.castRepository

      const cast = await repository.findUnique({
        where: { id: castId },
        select: { id: true, name: true, lineUserId: true },
      })

      if (!cast) {
        await this.sendMessage(
          lineUserId,
          [
            'LINE連携に失敗しました。',
            `キャストID "${castId}" が見つかりません。`,
            '管理者から案内されたキャストIDを確認して、もう一度 reg <キャストID> を送信してください。',
          ].join('\n')
        )
        return {
          status: 'not_found',
          castId,
          lineUserId,
        }
      }

      const conflictingCast = await repository.findFirst({
        where: {
          lineUserId,
          NOT: {
            id: castId,
          },
        },
        select: { id: true, name: true },
      })

      if (conflictingCast) {
        await this.sendMessage(
          lineUserId,
          [
            'LINE連携を更新できませんでした。',
            `このLINEアカウントは既に別のキャスト「${conflictingCast.name ?? conflictingCast.id}」に紐付いています。`,
            '管理者に連絡して既存の紐付けを解除してもらってから、再度登録を実行してください。',
          ].join('\n')
        )
        return {
          status: 'conflict',
          castId,
          lineUserId,
          conflictedCastId: conflictingCast.id,
          conflictedCastName: conflictingCast.name,
        }
      }

      const updated = await repository.update({
        where: { id: castId },
        data: { lineUserId },
        select: {
          id: true,
          name: true,
          lineUserId: true,
        },
      })

      await this.sendMessage(
        lineUserId,
        [
          'LINE連携が完了しました。',
          `キャスト: ${updated.name ?? updated.id}`,
          `キャストID: ${updated.id}`,
          '',
          '通知を受け取れるようになりました。誤りがある場合は管理者へ連絡してください。',
        ].join('\n')
      )

      return {
        status: 'linked',
        castId: updated.id,
        castName: updated.name,
        lineUserId,
        previousLineUserId: cast.lineUserId ?? undefined,
      }
    } catch (error) {
      logger.error(
        {
          err: error,
          castId,
          lineUserId,
        },
        'Failed to link LINE user ID to cast'
      )
      await this.sendMessage(
        lineUserId,
        'LINE連携中にエラーが発生しました。時間をおいて再度お試しいただくか、管理者にお問い合わせください。'
      )
      return {
        status: 'error',
        message: 'internal_error',
      }
    }
  }

  private async sendMessage(lineUserId: string, text: string): Promise<void> {
    const client = this.deps.messagingClient ?? lineMessagingClient
    if (!lineUserId || !client.isConfigured()) {
      return
    }

    try {
      await client.pushText(lineUserId, text)
    } catch (error) {
      logger.error(
        {
          err: error,
          lineUserId,
        },
        'Failed to send LINE webhook acknowledgement'
      )
    }
  }
}

/**
 * @design_doc   One-time token flow for securely linking a cast to a LINE user
 * @related_to   app/api/line/webhook/route.ts, CastLineRegistrationToken model
 * @known_issues Unlinking an existing LINE account requires a separate administrative workflow
 */
import { createHash } from 'node:crypto'
import logger from '@/lib/logger'
import { LineMessagingClient, lineMessagingClient } from '@/lib/line/client'
import type { LineWebhookEvent } from '@/lib/line/webhook'

interface RegistrationTokenRecord {
  id: string
  castId: string
  storeId: string
  expiresAt: Date
  usedAt: Date | null
}

interface RegistrationCastRecord {
  id: string
  name: string
  storeId: string
  lineUserId: string | null
}

interface RegistrationTransaction {
  castLineRegistrationToken: {
    findUnique(args: {
      where: { tokenHash: string }
      select: {
        id: true
        castId: true
        storeId: true
        expiresAt: true
        usedAt: true
      }
    }): Promise<RegistrationTokenRecord | null>
    updateMany(args: {
      where: { id: string; usedAt: null; expiresAt: { gt: Date } }
      data: { usedAt: Date }
    }): Promise<{ count: number }>
  }
  cast: {
    findFirst(args: {
      where: { id: string; storeId: string } | { lineUserId: string; NOT: { id: string } }
      select: { id: true; name: true; storeId?: true; lineUserId?: true }
    }): Promise<RegistrationCastRecord | null>
    updateMany(args: {
      where: { id: string; storeId: string; lineUserId: null }
      data: { lineUserId: string }
    }): Promise<{ count: number }>
  }
}

export interface LineRegistrationDatabase {
  $transaction<T>(
    callback: (transaction: RegistrationTransaction) => Promise<T>,
    options: { isolationLevel: 'Serializable' }
  ): Promise<T>
}

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
      castName: string
      lineUserId: string
    }
  | {
      status: 'invalid_token' | 'conflict'
      lineUserId: string
    }
  | {
      status: 'error'
      message: string
    }

const REGISTRATION_COMMAND = /^reg\s+([A-Za-z0-9_-]{43})$/

class RegistrationFailure extends Error {
  constructor(readonly status: 'invalid_token' | 'conflict') {
    super(status)
    this.name = 'RegistrationFailure'
  }
}

export function extractRegistrationTokenFromCommand(
  text: string | null | undefined
): string | null {
  if (!text) return null
  const match = REGISTRATION_COMMAND.exec(text.trim())
  return match ? match[1] : null
}

export function hashLineRegistrationToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex')
}

export class LineCastRegistrationService {
  constructor(
    private readonly deps: {
      database: LineRegistrationDatabase
      messagingClient?: MessagingClient
      now?: () => Date
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
          'LINE通知を受け取るには、管理者が発行した招待トークンを次の形式で送信してください。',
          '',
          'reg <招待トークン>',
          '',
          '招待トークンは一度だけ使用でき、有効期限があります。',
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
      const token = extractRegistrationTokenFromCommand(event.message.text)
      if (!token) {
        return {
          status: 'ignored',
          reason: 'unrecognized_command',
          eventType: event.type,
          lineUserId,
        }
      }
      return this.linkCast(lineUserId, token)
    }

    if (event.type === 'postback') {
      return {
        status: 'ignored',
        reason: 'unrecognized_command',
        eventType: event.type,
        lineUserId,
      }
    }

    return {
      status: 'ignored',
      reason: 'unsupported_event',
      eventType: event.type,
      lineUserId,
    }
  }

  private async linkCast(lineUserId: string, rawToken: string): Promise<CastRegistrationResult> {
    const now = this.deps.now?.() ?? new Date()

    try {
      const linkedCast = await this.deps.database.$transaction(
        async (transaction) => {
          const token = await transaction.castLineRegistrationToken.findUnique({
            where: { tokenHash: hashLineRegistrationToken(rawToken) },
            select: {
              id: true,
              castId: true,
              storeId: true,
              expiresAt: true,
              usedAt: true,
            },
          })

          if (!token || token.usedAt !== null || token.expiresAt <= now) {
            throw new RegistrationFailure('invalid_token')
          }

          const cast = await transaction.cast.findFirst({
            where: { id: token.castId, storeId: token.storeId },
            select: { id: true, name: true, storeId: true, lineUserId: true },
          })

          if (!cast) {
            throw new RegistrationFailure('invalid_token')
          }
          if (cast.lineUserId !== null) {
            throw new RegistrationFailure('conflict')
          }

          const conflictingCast = await transaction.cast.findFirst({
            where: { lineUserId, NOT: { id: cast.id } },
            select: { id: true, name: true },
          })
          if (conflictingCast) {
            throw new RegistrationFailure('conflict')
          }

          const tokenClaim = await transaction.castLineRegistrationToken.updateMany({
            where: { id: token.id, usedAt: null, expiresAt: { gt: now } },
            data: { usedAt: now },
          })
          if (tokenClaim.count !== 1) {
            throw new RegistrationFailure('invalid_token')
          }

          const castLink = await transaction.cast.updateMany({
            where: { id: cast.id, storeId: token.storeId, lineUserId: null },
            data: { lineUserId },
          })
          if (castLink.count !== 1) {
            throw new RegistrationFailure('conflict')
          }

          return { id: cast.id, name: cast.name }
        },
        { isolationLevel: 'Serializable' }
      )

      await this.sendMessage(
        lineUserId,
        [
          'LINE連携が完了しました。',
          `キャスト: ${linkedCast.name}`,
          '',
          '通知を受け取れるようになりました。誤りがある場合は管理者へ連絡してください。',
        ].join('\n')
      )

      return {
        status: 'linked',
        castId: linkedCast.id,
        castName: linkedCast.name,
        lineUserId,
      }
    } catch (error) {
      if (error instanceof RegistrationFailure) {
        await this.sendFailureMessage(lineUserId, error.status)
        return { status: error.status, lineUserId }
      }

      if (isUniqueConstraintError(error)) {
        await this.sendFailureMessage(lineUserId, 'conflict')
        return { status: 'conflict', lineUserId }
      }

      logger.error({ err: error }, 'Failed to link LINE user ID to cast')
      await this.sendMessage(
        lineUserId,
        'LINE連携中にエラーが発生しました。時間をおいて再度お試しいただくか、管理者にお問い合わせください。'
      )
      return { status: 'error', message: 'internal_error' }
    }
  }

  private async sendFailureMessage(
    lineUserId: string,
    status: 'invalid_token' | 'conflict'
  ): Promise<void> {
    const text =
      status === 'invalid_token'
        ? 'LINE連携に失敗しました。招待トークンが無効・使用済み・期限切れです。管理者に新しい招待トークンを発行してもらってください。'
        : 'LINE連携を更新できませんでした。対象キャストまたはこのLINEアカウントは既に連携されています。管理者にお問い合わせください。'
    await this.sendMessage(lineUserId, text)
  }

  private async sendMessage(lineUserId: string, text: string): Promise<void> {
    const client = this.deps.messagingClient ?? lineMessagingClient
    if (!lineUserId || !client.isConfigured()) return

    try {
      await client.pushText(lineUserId, text)
    } catch (error) {
      logger.error({ err: error }, 'Failed to send LINE webhook acknowledgement')
    }
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  )
}

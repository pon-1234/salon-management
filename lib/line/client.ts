/**
 * @design_doc   Lightweight LINE Messaging API client
 * @related_to   notification/cast-service.ts, env.ts
 * @known_issues No retry/backoff; extend if rate limits become an issue
 */
import logger from '@/lib/logger'
import { env } from '@/lib/config/env'

export interface LineTextMessage {
  type: 'text'
  text: string
}

export type LineMessage = LineTextMessage

export interface LineMessagingConfig {
  enabled: boolean
  channelAccessToken: string
  defaultUserId?: string
}

export class LineMessagingClient {
  private readonly fetchImpl: typeof fetch
  private readonly config: LineMessagingConfig

  constructor(options?: { fetchImpl?: typeof fetch; config?: LineMessagingConfig }) {
    this.fetchImpl = options?.fetchImpl ?? fetch
    const baseConfig = options?.config ?? env.line.messaging
    this.config = {
      enabled: Boolean(baseConfig?.enabled),
      channelAccessToken: baseConfig?.channelAccessToken ?? '',
      defaultUserId: baseConfig?.defaultUserId?.trim() ?? '',
    }
  }

  isConfigured(): boolean {
    return Boolean(this.config.enabled && this.config.channelAccessToken.trim().length > 0)
  }

  getDefaultUserId(): string | undefined {
    const candidate = this.config.defaultUserId?.trim()
    return candidate && candidate.length > 0 ? candidate : undefined
  }

  async pushMessage(to: string, messages: LineMessage[]): Promise<void> {
    if (!this.isConfigured()) {
      logger.warn('LINE messaging client called without configuration; skipping request')
      return
    }

    const recipient = to?.trim()
    if (!recipient) {
      throw new Error('LINE push failed: recipient user ID is required')
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('LINE push failed: at least one message is required')
    }

    const payload = {
      to: recipient,
      messages: messages.map((message) => {
        if (message.type !== 'text') {
          throw new Error(`Unsupported LINE message type: ${message.type}`)
        }
        const text = message.text?.toString() ?? ''
        if (!text.trim()) {
          throw new Error('LINE push failed: text message content is empty')
        }
        return { type: 'text', text }
      }),
    }

    const response = await this.fetchImpl('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.channelAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const responseText = await response.text().catch(() => '')
      throw new Error(
        `LINE push failed with status ${response.status}: ${responseText || 'no response body'}`
      )
    }
  }

  async pushText(to: string, text: string): Promise<void> {
    return this.pushMessage(to, [{ type: 'text', text }])
  }
}

export const lineMessagingClient = new LineMessagingClient()

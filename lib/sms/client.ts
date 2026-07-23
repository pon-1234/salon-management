/**
 * @design_doc   SMS client for sending notifications
 * @related_to   notification/service.ts
 * @known_issues Provider health is configuration based and does not make a live Vonage request
 */
import { env } from '@/lib/config/env'
import logger from '@/lib/logger'

function normalizeToE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('81')) {
    return `+${digits}`
  }
  if (digits.startsWith('0')) {
    return `+81${digits.slice(1)}`
  }
  return `+${digits}`
}

function buildMockResponse() {
  return {
    success: true,
    id: `sms-mock-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
  }
}

export const smsClient = {
  async send(data: {
    to: string
    message: string
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    if (env.outbound.deliveryMode === 'disabled') {
      logger.info('SMS delivery skipped because outbound is disabled')
      return { success: false, error: 'Outbound delivery is disabled.' }
    }

    const { apiKey, apiSecret, smsFrom } = env.vonage
    if (!apiKey || !apiSecret || !smsFrom) {
      if (env.notification.mockEnabled) {
        logger.info('SMS mock delivery completed')
        return buildMockResponse()
      }
      logger.error('SMS provider is not configured.')
      return { success: false, error: 'SMS provider is not configured.' }
    }

    const payload = new URLSearchParams({
      api_key: apiKey,
      api_secret: apiSecret,
      to: normalizeToE164(data.to),
      from: smsFrom || 'Salon',
      text: data.message,
    })

    let response: Response
    try {
      response = await fetch('https://rest.nexmo.com/sms/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload.toString(),
      })
    } catch (error) {
      logger.error(
        { provider: 'vonage', errorType: error instanceof Error ? error.name : 'UnknownError' },
        'SMS provider request failed'
      )
      return { success: false, error: 'SMS provider request failed.' }
    }

    if (!response.ok) {
      logger.error({ provider: 'vonage', status: response.status }, 'SMS provider request failed')
      return { success: false, error: 'SMS provider request failed.' }
    }

    const result = await response.json().catch(() => null)
    const message = result?.messages?.[0]
    if (!message || message.status !== '0') {
      logger.error(
        { provider: 'vonage', status: message?.status ?? 'invalid-response' },
        'SMS provider rejected the request'
      )
      return { success: false, error: 'SMS provider rejected the request.' }
    }

    return { success: true, id: message['message-id'] }
  },
}

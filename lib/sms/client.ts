/**
 * @design_doc   SMS client for sending notifications
 * @related_to   notification/service.ts
 * @known_issues Fallbacks to mock send when Vonage credentials are missing
 */
import { env } from '@/lib/config/env'

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
    id: `sms-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  }
}

export const smsClient = {
  async send(data: { to: string; message: string }): Promise<{ success: boolean; id?: string }> {
    const { apiKey, apiSecret, smsFrom } = env.vonage
    if (!apiKey || !apiSecret) {
      console.log('Sending SMS (mock):', { to: data.to, message: data.message })
      await new Promise((resolve) => setTimeout(resolve, 100))
      return buildMockResponse()
    }

    const payload = new URLSearchParams({
      api_key: apiKey,
      api_secret: apiSecret,
      to: normalizeToE164(data.to),
      from: smsFrom || 'Salon',
      text: data.message,
    })

    const response = await fetch('https://rest.nexmo.com/sms/json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload.toString(),
    })

    if (!response.ok) {
      console.error('Vonage SMS request failed:', response.status)
      return { success: false }
    }

    const result = await response.json().catch(() => null)
    const message = result?.messages?.[0]
    if (!message || message.status !== '0') {
      console.error('Vonage SMS error:', message)
      return { success: false }
    }

    return { success: true, id: message['message-id'] }
  },
}

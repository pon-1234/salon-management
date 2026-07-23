/**
 * @design_doc   SMS delivery must fail closed unless a real provider or an explicit local mock is configured
 * @related_to   client.ts, notification/readiness.ts
 * @known_issues Delivery-provider availability is configuration based; runtime failures are emitted to monitoring logs
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { refreshEnv } from '@/lib/config/env'
import logger from '@/lib/logger'

const ORIGINAL_ENV = { ...process.env }

async function loadSmsClient() {
  vi.resetModules()
  refreshEnv()
  return (await import('./client')).smsClient
}

describe('SMS Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.VONAGE_API_KEY
    delete process.env.VONAGE_API_SECRET
    delete process.env.VONAGE_SMS_FROM
    delete process.env.NOTIFICATION_MOCK_ENABLED
    delete process.env.APP_RUNTIME_MODE
    delete process.env.OUTBOUND_DELIVERY_MODE
    delete process.env.RESEND_API_KEY
    delete process.env.FROM_EMAIL
    delete process.env.LINE_MESSAGING_ENABLED
    delete process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN
    delete process.env.LINE_MESSAGING_CHANNEL_SECRET
    delete process.env.LINE_CHANNEL_SECRET
    delete process.env.LINE_MESSAGING_DEFAULT_USER_ID
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    refreshEnv()
    vi.restoreAllMocks()
  })

  it('fails closed without provider credentials and never logs the recipient or message', async () => {
    const smsClient = await loadSmsClient()
    const result = await smsClient.send({
      to: '+819012345678',
      message: '認証コード: 123456',
    })

    expect(result).toEqual({
      success: false,
      error: 'SMS provider is not configured.',
    })
    expect(fetch).not.toHaveBeenCalled()

    const serializedLogs = JSON.stringify(vi.mocked(logger.error).mock.calls)
    expect(serializedLogs).not.toContain('+819012345678')
    expect(serializedLogs).not.toContain('123456')
  })

  it('short-circuits preview delivery before calling the SMS provider', async () => {
    process.env.APP_RUNTIME_MODE = 'preview'
    process.env.OUTBOUND_DELIVERY_MODE = 'disabled'
    process.env.PREVIEW_ACCESS_GATE_TOKEN = 'preview-access-gate-token-at-least-32-characters'
    process.env.PREVIEW_TARGET_ID = '01JZ8QFQ05J6JNRQY3YW7M0V55'
    process.env.DATABASE_URL = 'postgresql://preview:test@localhost:5432/salon_test_preview'
    process.env.STORAGE_ROOT = '/tmp/salon-preview-storage'
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
    process.env.STORAGE_PUBLIC_BASE_URL = 'http://localhost:3000/salon-uploads'
    const smsClient = await loadSmsClient()

    const result = await smsClient.send({
      to: '+819012345678',
      message: '認証コード: 123456',
    })

    expect(result).toEqual({
      success: false,
      error: 'Outbound delivery is disabled.',
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('uses a redacted mock only when the non-production mock flag is explicitly enabled', async () => {
    process.env.NOTIFICATION_MOCK_ENABLED = 'true'
    const smsClient = await loadSmsClient()
    const result = await smsClient.send({
      to: '+819012345678',
      message: '認証コード: 654321',
    })

    expect(result.success).toBe(true)
    expect(result.id).toMatch(/^sms-mock-/)
    expect(fetch).not.toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith('SMS mock delivery completed')

    const serializedLogs = JSON.stringify(vi.mocked(logger.info).mock.calls)
    expect(serializedLogs).not.toContain('+819012345678')
    expect(serializedLogs).not.toContain('654321')
  })

  it('returns a redacted failure when the provider request throws', async () => {
    process.env.VONAGE_API_KEY = 'vonage-key'
    process.env.VONAGE_API_SECRET = 'vonage-secret'
    process.env.VONAGE_SMS_FROM = 'Salon'
    vi.mocked(fetch).mockRejectedValueOnce(
      new Error('request failed for +819012345678 with 認証コード: 987654')
    )
    const smsClient = await loadSmsClient()

    const result = await smsClient.send({
      to: '+819012345678',
      message: '認証コード: 987654',
    })

    expect(result).toEqual({ success: false, error: 'SMS provider request failed.' })
    const serializedLogs = JSON.stringify(vi.mocked(logger.error).mock.calls)
    expect(serializedLogs).not.toContain('+819012345678')
    expect(serializedLogs).not.toContain('987654')
  })
})

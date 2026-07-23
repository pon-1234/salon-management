/**
 * @design_doc   Email delivery must fail closed unless a provider or explicit non-production mock is configured
 * @related_to   client.ts, notification/readiness.ts
 * @known_issues Live Resend delivery is covered by staging verification rather than unit tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { testConfig, sendEmail } = vi.hoisted(() => ({
  testConfig: {
    env: {
      runtimeMode: 'live' as 'live' | 'preview',
      outbound: { deliveryMode: 'provider' as 'provider' | 'disabled' },
      resend: { apiKey: 'resend-key', fromEmail: 'notifications@example.com' },
      notification: { mockEnabled: false },
    },
  },
  sendEmail: vi.fn(),
}))

vi.mock('@/lib/config/env', () => testConfig)
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendEmail }
  },
}))
vi.unmock('./client')

import logger from '@/lib/logger'
import { emailClient } from './client'

describe('Email Client implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    testConfig.env.resend.apiKey = ''
    testConfig.env.notification.mockEnabled = false
    testConfig.env.runtimeMode = 'live'
    testConfig.env.outbound.deliveryMode = 'provider'
  })

  it('fails closed when Resend is not configured', async () => {
    const result = await emailClient.send({
      to: 'private@example.com',
      subject: 'Password reset',
      body: 'secret-token-value',
    })

    expect(result).toEqual({
      success: false,
      error: 'RESEND_API_KEY is not configured.',
    })
    const serializedLogs = JSON.stringify(vi.mocked(logger.error).mock.calls)
    expect(serializedLogs).not.toContain('private@example.com')
    expect(serializedLogs).not.toContain('secret-token-value')
  })

  it('uses a redacted mock only when explicitly enabled', async () => {
    testConfig.env.notification.mockEnabled = true

    const result = await emailClient.send({
      to: 'private@example.com',
      subject: 'Password reset',
      body: 'secret-token-value',
    })

    expect(result.success).toBe(true)
    expect(result.id).toMatch(/^email-mock-/)
    expect(logger.info).toHaveBeenCalledWith('Email mock delivery completed')
    const serializedLogs = JSON.stringify(vi.mocked(logger.info).mock.calls)
    expect(serializedLogs).not.toContain('private@example.com')
    expect(serializedLogs).not.toContain('secret-token-value')
  })

  it('short-circuits preview delivery before calling Resend', async () => {
    testConfig.env.runtimeMode = 'preview'
    testConfig.env.outbound.deliveryMode = 'disabled'
    testConfig.env.resend.apiKey = 'resend-key'

    const result = await emailClient.send({
      to: 'private@example.com',
      subject: 'Password reset',
      body: 'secret-token-value',
    })

    expect(result).toEqual({
      success: false,
      error: 'Outbound delivery is disabled.',
    })
    expect(sendEmail).not.toHaveBeenCalled()
    const serializedLogs = JSON.stringify(vi.mocked(logger.info).mock.calls)
    expect(serializedLogs).not.toContain('private@example.com')
    expect(serializedLogs).not.toContain('secret-token-value')
  })
})

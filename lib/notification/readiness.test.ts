/**
 * @design_doc   Notification provider readiness is observable without exposing credentials
 * @related_to   app/api/health/route.ts, config/env.ts
 * @known_issues Readiness validates configuration presence, not live third-party delivery
 */
import { describe, expect, it } from 'vitest'
import { getNotificationReadiness } from './readiness'

describe('getNotificationReadiness', () => {
  it('treats explicitly disabled preview delivery as healthy without provider credentials', () => {
    const result = getNotificationReadiness({
      isProduction: true,
      runtimeMode: 'preview',
      outbound: { deliveryMode: 'disabled' },
      notification: { mockEnabled: false },
      resend: { apiKey: '', fromEmail: '' },
      vonage: { apiKey: '', apiSecret: '', smsFrom: '' },
    })

    expect(result).toEqual({
      ready: true,
      providers: {
        email: { ready: true, mode: 'disabled' },
        sms: { ready: true, mode: 'disabled' },
      },
    })
  })

  it('fails readiness when production email and SMS providers are not fully configured', () => {
    const result = getNotificationReadiness({
      isProduction: true,
      notification: { mockEnabled: true },
      resend: { apiKey: '', fromEmail: '' },
      vonage: { apiKey: '', apiSecret: '', smsFrom: '' },
    })

    expect(result).toEqual({
      ready: false,
      providers: {
        email: { ready: false, mode: 'unconfigured' },
        sms: { ready: false, mode: 'unconfigured' },
      },
    })
  })

  it('allows redacted mocks only outside production when explicitly enabled', () => {
    const result = getNotificationReadiness({
      isProduction: false,
      notification: { mockEnabled: true },
      resend: { apiKey: '', fromEmail: '' },
      vonage: { apiKey: '', apiSecret: '', smsFrom: '' },
    })

    expect(result).toEqual({
      ready: true,
      providers: {
        email: { ready: true, mode: 'mock' },
        sms: { ready: true, mode: 'mock' },
      },
    })
  })

  it('requires every credential field for real provider readiness', () => {
    const result = getNotificationReadiness({
      isProduction: true,
      notification: { mockEnabled: false },
      resend: { apiKey: 'resend-key', fromEmail: 'notifications@example.com' },
      vonage: { apiKey: 'vonage-key', apiSecret: 'vonage-secret', smsFrom: '' },
    })

    expect(result.ready).toBe(false)
    expect(result.providers.email).toEqual({ ready: true, mode: 'provider' })
    expect(result.providers.sms).toEqual({ ready: false, mode: 'unconfigured' })
  })
})

/**
 * @design_doc   Production-like preview environments must be unable to deliver outbound messages
 * @related_to   env.ts, notification/readiness.ts, email/client.ts, sms/client.ts, line/client.ts
 * @known_issues Network-level egress denial is enforced by deployment infrastructure, not this unit
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { refreshEnv } from './env'

const managedKeys = [
  'NODE_ENV',
  'APP_RUNTIME_MODE',
  'OUTBOUND_DELIVERY_MODE',
  'PREVIEW_ACCESS_GATE_TOKEN',
  'PREVIEW_TARGET_ID',
  'PREVIEW_SNAPSHOT_CUTOFF',
  'DATABASE_URL',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'STORAGE_ROOT',
  'STORAGE_PUBLIC_BASE_URL',
  'RESEND_API_KEY',
  'FROM_EMAIL',
  'VONAGE_API_KEY',
  'VONAGE_API_SECRET',
  'VONAGE_SMS_FROM',
  'LINE_MESSAGING_ENABLED',
  'LINE_MESSAGING_CHANNEL_ACCESS_TOKEN',
  'LINE_MESSAGING_CHANNEL_SECRET',
  'LINE_CHANNEL_SECRET',
  'LINE_MESSAGING_DEFAULT_USER_ID',
] as const

const originals = new Map(managedKeys.map((key) => [key, process.env[key]]))

function clearOutboundConfiguration() {
  for (const key of [
    'RESEND_API_KEY',
    'FROM_EMAIL',
    'VONAGE_API_KEY',
    'VONAGE_API_SECRET',
    'VONAGE_SMS_FROM',
    'LINE_MESSAGING_ENABLED',
    'LINE_MESSAGING_CHANNEL_ACCESS_TOKEN',
    'LINE_MESSAGING_CHANNEL_SECRET',
    'LINE_CHANNEL_SECRET',
    'LINE_MESSAGING_DEFAULT_USER_ID',
  ] as const) {
    Reflect.deleteProperty(process.env, key)
  }
}

describe('production preview environment policy', () => {
  beforeEach(() => {
    Reflect.set(process.env, 'NODE_ENV', 'production')
    process.env.APP_RUNTIME_MODE = 'preview'
    process.env.PREVIEW_ACCESS_GATE_TOKEN = 'preview-access-gate-token-at-least-32-characters'
    process.env.PREVIEW_TARGET_ID = '01JZ8QFQ05J6JNRQY3YW7M0V55'
    process.env.DATABASE_URL = 'postgresql://preview:secret@postgres:5432/salon_preview'
    process.env.NEXTAUTH_URL = 'https://salon-preview.example.com'
    process.env.NEXTAUTH_SECRET = 'preview-test-secret-at-least-32-characters'
    process.env.STORAGE_ROOT = '/var/lib/salon-preview-storage'
    process.env.STORAGE_PUBLIC_BASE_URL = 'https://salon-preview.example.com/salon-uploads'
    clearOutboundConfiguration()
  })

  afterEach(() => {
    for (const key of managedKeys) {
      const original = originals.get(key)
      if (original === undefined) Reflect.deleteProperty(process.env, key)
      else Reflect.set(process.env, key, original)
    }
    refreshEnv()
  })

  it('requires explicit disabled outbound delivery', () => {
    expect(() => refreshEnv()).toThrow(
      'APP_RUNTIME_MODE=preview requires OUTBOUND_DELIVERY_MODE=disabled'
    )
  })

  it('does not let the live production runtime silently masquerade as a disabled preview', () => {
    process.env.APP_RUNTIME_MODE = 'live'
    process.env.OUTBOUND_DELIVERY_MODE = 'disabled'

    expect(() => refreshEnv()).toThrow(
      'APP_RUNTIME_MODE=live requires OUTBOUND_DELIVERY_MODE=provider in production'
    )
  })

  it('exposes a production-capable preview mode with outbound delivery disabled', () => {
    process.env.OUTBOUND_DELIVERY_MODE = 'disabled'

    const config = refreshEnv()

    expect(config.runtimeMode).toBe('preview')
    expect(config.outbound.deliveryMode).toBe('disabled')
    expect(config.preview.accessGateToken).toBe('preview-access-gate-token-at-least-32-characters')
    expect(config.preview.targetId).toBe('01JZ8QFQ05J6JNRQY3YW7M0V55')
    expect(config.preview.snapshotCutoff).toBeNull()
    expect(config.line.messaging.enabled).toBe(false)
  })

  it('rejects a preview runtime connected to a database without the _preview suffix', () => {
    process.env.OUTBOUND_DELIVERY_MODE = 'disabled'
    process.env.DATABASE_URL = 'postgresql://preview:secret@postgres:5432/salon_production'

    expect(() => refreshEnv()).toThrow(
      'APP_RUNTIME_MODE=preview requires DATABASE_URL to select a _preview database'
    )
  })

  it('rejects a preview runtime using a storage root without a preview path segment', () => {
    process.env.OUTBOUND_DELIVERY_MODE = 'disabled'
    process.env.STORAGE_ROOT = '/var/lib/salon-storage'

    expect(() => refreshEnv()).toThrow(
      'APP_RUNTIME_MODE=preview requires an isolated preview STORAGE_ROOT'
    )
  })

  it('requires preview uploads to use the same gated public origin as the application', () => {
    process.env.OUTBOUND_DELIVERY_MODE = 'disabled'
    process.env.STORAGE_PUBLIC_BASE_URL = 'https://uploads.example.com/salon-uploads'

    expect(() => refreshEnv()).toThrow(
      'Preview STORAGE_PUBLIC_BASE_URL must use the NEXTAUTH_URL origin'
    )
  })

  it('requires a preview access gate token', () => {
    process.env.OUTBOUND_DELIVERY_MODE = 'disabled'
    delete process.env.PREVIEW_ACCESS_GATE_TOKEN

    expect(() => refreshEnv()).toThrow(
      'APP_RUNTIME_MODE=preview requires PREVIEW_ACCESS_GATE_TOKEN with at least 32 characters'
    )
  })

  it('rejects a short preview access gate token', () => {
    process.env.OUTBOUND_DELIVERY_MODE = 'disabled'
    process.env.PREVIEW_ACCESS_GATE_TOKEN = 'too-short'

    expect(() => refreshEnv()).toThrow(
      'APP_RUNTIME_MODE=preview requires PREVIEW_ACCESS_GATE_TOKEN with at least 32 characters'
    )
  })

  it.each([undefined, '', 'too-short', 'contains spaces and is still unsafe'])(
    'requires a strong opaque preview target marker: %s',
    (targetId) => {
      process.env.OUTBOUND_DELIVERY_MODE = 'disabled'
      if (targetId === undefined) delete process.env.PREVIEW_TARGET_ID
      else process.env.PREVIEW_TARGET_ID = targetId

      expect(() => refreshEnv()).toThrow(
        'APP_RUNTIME_MODE=preview requires a strong PREVIEW_TARGET_ID'
      )
    }
  )

  it.each([
    ['date', '2026-07-20', '2026-07-20'],
    ['UTC timestamp', '2026-07-20T03:15:00Z', '2026-07-20T03:15:00.000Z'],
    ['offset timestamp', '2026-07-20T12:15:00+09:00', '2026-07-20T03:15:00.000Z'],
  ])('validates and normalizes a snapshot cutoff %s', (_label, input, expected) => {
    process.env.OUTBOUND_DELIVERY_MODE = 'disabled'
    process.env.PREVIEW_SNAPSHOT_CUTOFF = input

    expect(refreshEnv().preview.snapshotCutoff).toBe(expected)
  })

  it.each(['2026-02-30', '20 July 2026', '2026-07-20T03:15:00'])(
    'rejects an invalid or timezone-free snapshot cutoff: %s',
    (cutoff) => {
      process.env.OUTBOUND_DELIVERY_MODE = 'disabled'
      process.env.PREVIEW_SNAPSHOT_CUTOFF = cutoff

      expect(() => refreshEnv()).toThrow(
        'PREVIEW_SNAPSHOT_CUTOFF must be an ISO date or a timezone-qualified ISO timestamp'
      )
    }
  )

  it.each([
    'RESEND_API_KEY',
    'FROM_EMAIL',
    'VONAGE_API_KEY',
    'VONAGE_API_SECRET',
    'VONAGE_SMS_FROM',
    'LINE_MESSAGING_CHANNEL_ACCESS_TOKEN',
    'LINE_CHANNEL_SECRET',
    'LINE_MESSAGING_DEFAULT_USER_ID',
  ] as const)('rejects preview when %s is present', (key) => {
    process.env.OUTBOUND_DELIVERY_MODE = 'disabled'
    process.env[key] = 'must-not-be-present'

    expect(() => refreshEnv()).toThrow('Preview runtime forbids outbound provider configuration')
  })

  it('rejects preview when LINE messaging is explicitly enabled', () => {
    process.env.OUTBOUND_DELIVERY_MODE = 'disabled'
    process.env.LINE_MESSAGING_ENABLED = 'true'

    expect(() => refreshEnv()).toThrow('Preview runtime forbids outbound provider configuration')
  })
})

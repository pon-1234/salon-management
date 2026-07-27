/**
 * @design_doc   Production notification configuration must not inherit development defaults
 * @related_to   env.ts, notification/readiness.ts
 * @known_issues Provider credentials are presence-checked by readiness rather than contacted here
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { refreshEnv } from './env'

const originalNodeEnv = process.env.NODE_ENV
const originalFromEmail = process.env.FROM_EMAIL
const originalMockFlag = process.env.NOTIFICATION_MOCK_ENABLED
const originalNextAuthUrl = process.env.NEXTAUTH_URL
const originalNextAuthSecret = process.env.NEXTAUTH_SECRET
const originalDatabaseUrl = process.env.DATABASE_URL
const originalStorageRoot = process.env.STORAGE_ROOT
const originalStoragePublicBaseUrl = process.env.STORAGE_PUBLIC_BASE_URL

describe('notification environment policy', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/salon_test'
    process.env.NEXTAUTH_SECRET = 'production-test-secret-at-least-32-characters'
    process.env.STORAGE_ROOT = '/var/lib/salon-storage'
    process.env.STORAGE_PUBLIC_BASE_URL = 'https://salon.example.com/salon-uploads'
  })

  afterEach(() => {
    if (originalNodeEnv === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV')
    else Reflect.set(process.env, 'NODE_ENV', originalNodeEnv)
    if (originalFromEmail === undefined) delete process.env.FROM_EMAIL
    else process.env.FROM_EMAIL = originalFromEmail
    if (originalMockFlag === undefined) delete process.env.NOTIFICATION_MOCK_ENABLED
    else process.env.NOTIFICATION_MOCK_ENABLED = originalMockFlag
    if (originalNextAuthUrl === undefined) delete process.env.NEXTAUTH_URL
    else process.env.NEXTAUTH_URL = originalNextAuthUrl
    if (originalNextAuthSecret === undefined) delete process.env.NEXTAUTH_SECRET
    else process.env.NEXTAUTH_SECRET = originalNextAuthSecret
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = originalDatabaseUrl
    if (originalStorageRoot === undefined) delete process.env.STORAGE_ROOT
    else process.env.STORAGE_ROOT = originalStorageRoot
    if (originalStoragePublicBaseUrl === undefined) delete process.env.STORAGE_PUBLIC_BASE_URL
    else process.env.STORAGE_PUBLIC_BASE_URL = originalStoragePublicBaseUrl
    refreshEnv()
  })

  it('does not default a sender or enable mocks in production', () => {
    Reflect.set(process.env, 'NODE_ENV', 'production')
    process.env.NEXTAUTH_URL = 'https://salon.example.com'
    delete process.env.FROM_EMAIL
    process.env.NOTIFICATION_MOCK_ENABLED = 'true'

    const config = refreshEnv()

    expect(config.resend.fromEmail).toBe('')
    expect(config.notification.mockEnabled).toBe(false)
  })

  it('fails closed without an explicit public NextAuth URL in production', () => {
    Reflect.set(process.env, 'NODE_ENV', 'production')
    process.env.NEXTAUTH_SECRET = 'production-test-secret-at-least-32-characters'
    delete process.env.NEXTAUTH_URL

    expect(() => refreshEnv()).toThrow('NEXTAUTH_URL is required in production')
  })

  it('rejects an insecure public NextAuth URL in production', () => {
    Reflect.set(process.env, 'NODE_ENV', 'production')
    process.env.NEXTAUTH_SECRET = 'production-test-secret-at-least-32-characters'
    process.env.NEXTAUTH_URL = 'http://salon.example.com'

    expect(() => refreshEnv()).toThrow('NEXTAUTH_URL must be an absolute HTTPS URL in production')
  })
})

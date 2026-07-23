/**
 * @design_doc   docs/VPS_DEPLOYMENT.md production runtime configuration gate
 * @related_to   env.ts, lib/operations/readiness.ts, deploy/xserver-vps/Dockerfile
 * @known_issues Credential validity is checked by runtime probes rather than environment parsing
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { refreshEnv } from './env'

const managedKeys = [
  'NODE_ENV',
  'DATABASE_URL',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'USE_MOCK_FALLBACK',
  'NEXT_PUBLIC_USE_MOCK_FALLBACK',
  'STORAGE_ROOT',
  'STORAGE_PUBLIC_BASE_URL',
] as const
const originals = new Map(managedKeys.map((key) => [key, process.env[key]]))

describe('production operational environment policy', () => {
  beforeEach(() => {
    Reflect.set(process.env, 'NODE_ENV', 'production')
    process.env.DATABASE_URL = 'postgresql://salon:secret@postgres:5432/salon'
    process.env.NEXTAUTH_URL = 'https://salon.example.com'
    process.env.NEXTAUTH_SECRET = 'production-test-secret-at-least-32-characters'
    process.env.STORAGE_ROOT = '/var/lib/salon-storage/images'
    process.env.STORAGE_PUBLIC_BASE_URL = 'https://salon.example.com/salon-uploads'
  })

  afterEach(() => {
    for (const key of managedKeys) {
      const original = originals.get(key)
      if (original === undefined) Reflect.deleteProperty(process.env, key)
      else Reflect.set(process.env, key, original)
    }
    refreshEnv()
  })

  it('loads explicit PostgreSQL and VPS storage configuration', () => {
    const config = refreshEnv()

    expect(config.database.url).toBe('postgresql://salon:secret@postgres:5432/salon')
    expect(config.storage).toEqual({
      root: '/var/lib/salon-storage/images',
      publicBaseUrl: 'https://salon.example.com/salon-uploads',
    })
  })

  it('fails closed when DATABASE_URL is missing in production', () => {
    delete process.env.DATABASE_URL

    expect(() => refreshEnv()).toThrow('DATABASE_URL is required in production')
  })

  it.each(['mysql://db/salon', 'not-a-url'])(
    'rejects an invalid production DATABASE_URL: %s',
    (databaseUrl) => {
      process.env.DATABASE_URL = databaseUrl

      expect(() => refreshEnv()).toThrow('DATABASE_URL must be a PostgreSQL URL')
    }
  )

  it('fails closed when STORAGE_ROOT is missing in production', () => {
    delete process.env.STORAGE_ROOT

    expect(() => refreshEnv()).toThrow('STORAGE_ROOT is required in production')
  })

  it.each(['relative/storage', '/'])(
    'rejects an unsafe production STORAGE_ROOT: %s',
    (storageRoot) => {
      process.env.STORAGE_ROOT = storageRoot

      expect(() => refreshEnv()).toThrow('STORAGE_ROOT must be a non-root absolute path')
    }
  )

  it('fails closed when STORAGE_PUBLIC_BASE_URL is missing in production', () => {
    delete process.env.STORAGE_PUBLIC_BASE_URL

    expect(() => refreshEnv()).toThrow('STORAGE_PUBLIC_BASE_URL is required in production')
  })

  it.each(['http://salon.example.com/uploads', 'not-a-url'])(
    'rejects an invalid production STORAGE_PUBLIC_BASE_URL: %s',
    (publicBaseUrl) => {
      process.env.STORAGE_PUBLIC_BASE_URL = publicBaseUrl

      expect(() => refreshEnv()).toThrow(
        'STORAGE_PUBLIC_BASE_URL must be an absolute HTTPS URL in production'
      )
    }
  )

  it('ignores explicit mock fallback flags in production', () => {
    process.env.USE_MOCK_FALLBACK = 'true'
    process.env.NEXT_PUBLIC_USE_MOCK_FALLBACK = 'true'

    expect(refreshEnv().featureFlags.useMockFallbacks).toBe(false)
  })

  it.each([
    'https://user:password@salon.example.com',
    'https://salon.example.com?redirect=evil',
    'https://salon.example.com/#fragment',
  ])('rejects an unsafe production NEXTAUTH_URL: %s', (nextAuthUrl) => {
    process.env.NEXTAUTH_URL = nextAuthUrl

    expect(() => refreshEnv()).toThrow('NEXTAUTH_URL must be an absolute HTTPS URL')
  })

  it('rejects a production NEXTAUTH_SECRET shorter than 32 characters', () => {
    process.env.NEXTAUTH_SECRET = 'too-short'

    expect(() => refreshEnv()).toThrow('NEXTAUTH_SECRET must be at least 32 characters')
  })
})

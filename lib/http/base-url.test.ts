import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resolveApiUrl } from './base-url'
import { refreshEnv } from '@/lib/config/env'

const ORIGINAL_ENV = { ...process.env }
const ORIGINAL_WINDOW = (globalThis as any).window

describe('resolveApiUrl', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    delete process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.NEXTAUTH_URL
    delete process.env.VERCEL_URL
    refreshEnv()
    ;(globalThis as any).window = undefined
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    refreshEnv()
    ;(globalThis as any).window = ORIGINAL_WINDOW
  })

  it('returns absolute path untouched', () => {
    const url = resolveApiUrl('https://example.com/api/test')
    expect(url).toBe('https://example.com/api/test')
  })

  it('uses NEXT_PUBLIC_SITE_URL when defined', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://public.example.com/'
    refreshEnv()
    const url = resolveApiUrl('/api/test')
    expect(url).toBe('https://public.example.com/api/test')
  })

  it('falls back to NEXTAUTH_URL when public url missing', () => {
    process.env.NEXTAUTH_URL = 'https://auth.example.com/'
    refreshEnv()
    const url = resolveApiUrl('api/sample')
    expect(url).toBe('https://auth.example.com/api/sample')
  })

  it('uses VERCEL_URL when others missing', () => {
    process.env.VERCEL_URL = 'my-app.vercel.app'
    refreshEnv()
    const url = resolveApiUrl('/api/health')
    expect(url).toBe('https://my-app.vercel.app/api/health')
  })

  it('falls back to localhost when no env provided', () => {
    const url = resolveApiUrl('/api/local')
    expect(url).toBe('http://localhost:3000/api/local')
  })
})

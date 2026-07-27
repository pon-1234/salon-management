/**
 * @design_doc   Single-process public request rate-limit security tests
 * @related_to   lib/security/public-request-rate-limit.ts
 * @known_issues Intended for the single-process VPS runtime only
 */
import { describe, expect, it, vi } from 'vitest'
import {
  FixedWindowRateLimiter,
  consumeRequestAttendanceRateLimit,
  extractTrustedProxyClientIp,
} from './public-request-rate-limit'

describe('public request IP rate limiting', () => {
  it('uses the proxy-appended final X-Forwarded-For address', () => {
    const headers = new Headers({
      'x-forwarded-for': '198.51.100.70, 203.0.113.20',
    })

    expect(extractTrustedProxyClientIp(headers)).toBe('203.0.113.20')
  })

  it.each([new Headers(), new Headers({ 'x-forwarded-for': 'not-an-ip' })])(
    'fails closed when the proxy client address is missing or invalid',
    (headers) => {
      expect(consumeRequestAttendanceRateLimit(headers)).toEqual({
        allowed: false,
        reason: 'unidentified-client',
        retryAfterSeconds: 60,
      })
    }
  )

  it('atomically consumes a fixed number of attempts per window', () => {
    let now = 1_000
    const limiter = new FixedWindowRateLimiter({
      limit: 3,
      windowMs: 60_000,
      maxEntries: 10,
      now: () => now,
    })

    expect(limiter.consume('203.0.113.1')).toEqual({ allowed: true })
    expect(limiter.consume('203.0.113.1')).toEqual({ allowed: true })
    expect(limiter.consume('203.0.113.1')).toEqual({ allowed: true })
    expect(limiter.consume('203.0.113.1')).toEqual({
      allowed: false,
      reason: 'rate-limited',
      retryAfterSeconds: 60,
    })

    now += 60_000
    expect(limiter.consume('203.0.113.1')).toEqual({ allowed: true })
  })

  it('fails closed at storage capacity and admits a new IP after stale cleanup', () => {
    let now = 1_000
    const limiter = new FixedWindowRateLimiter({
      limit: 3,
      windowMs: 60_000,
      maxEntries: 1,
      now: () => now,
    })

    expect(limiter.consume('203.0.113.1')).toEqual({ allowed: true })
    expect(limiter.consume('203.0.113.2')).toEqual({
      allowed: false,
      reason: 'capacity-exhausted',
      retryAfterSeconds: 60,
    })

    now += 60_000
    expect(limiter.consume('203.0.113.2')).toEqual({ allowed: true })
  })

  it('fails closed if its clock throws', () => {
    const limiter = new FixedWindowRateLimiter({
      limit: 3,
      windowMs: 60_000,
      maxEntries: 10,
      now: vi.fn(() => {
        throw new Error('clock unavailable')
      }),
    })

    expect(limiter.consume('203.0.113.1')).toEqual({
      allowed: false,
      reason: 'limiter-failure',
      retryAfterSeconds: 60,
    })
  })
})

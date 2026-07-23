/**
 * @design_doc   Abuse protection for public customer email authentication actions
 * @related_to   forgot-password and verify-email/send routes
 * @known_issues Process-local state is suitable only for the documented single-process VPS runtime
 */
import { describe, expect, it, vi } from 'vitest'
import { CustomerEmailRateLimiter } from './customer-email-rate-limit'

const headersFor = (ip: string) => new Headers({ 'x-forwarded-for': ip })

describe('customer email action rate limiting', () => {
  it('fails closed when the trusted proxy client IP is unavailable', () => {
    const limiter = new CustomerEmailRateLimiter({
      ipLimit: 5,
      emailLimit: 5,
      windowMs: 60_000,
      maxEntries: 10,
    })

    expect(limiter.consume('forgot-password', new Headers(), 'customer@example.com')).toEqual({
      allowed: false,
      reason: 'unidentified-client',
      retryAfterSeconds: 60,
    })
  })

  it('shares an email bucket after trim and lowercase normalization', () => {
    const limiter = new CustomerEmailRateLimiter({
      ipLimit: 5,
      emailLimit: 1,
      windowMs: 60_000,
      maxEntries: 10,
    })

    expect(
      limiter.consume('forgot-password', headersFor('203.0.113.1'), 'customer@example.com')
    ).toEqual({ allowed: true })
    expect(
      limiter.consume('forgot-password', headersFor('203.0.113.2'), '  Customer@Example.COM  ')
    ).toEqual({
      allowed: false,
      reason: 'rate-limited',
      retryAfterSeconds: 60,
    })
  })

  it('limits one IP even when it rotates email addresses', () => {
    const limiter = new CustomerEmailRateLimiter({
      ipLimit: 1,
      emailLimit: 5,
      windowMs: 60_000,
      maxEntries: 10,
    })
    const headers = headersFor('203.0.113.3')

    expect(limiter.consume('verify-email', headers, 'first@example.com')).toEqual({ allowed: true })
    expect(limiter.consume('verify-email', headers, 'second@example.com')).toEqual({
      allowed: false,
      reason: 'rate-limited',
      retryAfterSeconds: 60,
    })
  })

  it('keeps forgot-password and verify-email action windows independent', () => {
    const limiter = new CustomerEmailRateLimiter({
      ipLimit: 1,
      emailLimit: 1,
      windowMs: 60_000,
      maxEntries: 10,
    })
    const headers = headersFor('203.0.113.4')

    expect(limiter.consume('forgot-password', headers, 'customer@example.com')).toEqual({
      allowed: true,
    })
    expect(limiter.consume('verify-email', headers, 'customer@example.com')).toEqual({
      allowed: true,
    })
    expect(limiter.consume('register', headers, 'customer@example.com')).toEqual({
      allowed: true,
    })
  })

  it('fails closed when the limiter clock fails', () => {
    const limiter = new CustomerEmailRateLimiter({
      ipLimit: 5,
      emailLimit: 5,
      windowMs: 60_000,
      maxEntries: 10,
      now: vi.fn(() => {
        throw new Error('clock unavailable')
      }),
    })

    expect(
      limiter.consume('forgot-password', headersFor('203.0.113.5'), 'customer@example.com')
    ).toEqual({
      allowed: false,
      reason: 'limiter-failure',
      retryAfterSeconds: 60,
    })
  })
})

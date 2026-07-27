/**
 * @design_doc   Dual IP/email fixed-window protection for public customer email actions
 * @related_to   FixedWindowRateLimiter, forgot-password, and verify-email/send routes
 * @known_issues State is process-local and must be replaced before horizontal scaling
 */
import { createHash } from 'node:crypto'
import { normalizeCustomerEmail } from '@/lib/auth/customer-auth'
import {
  extractTrustedProxyClientIp,
  FixedWindowRateLimiter,
  type RateLimitDecision,
} from './public-request-rate-limit'

export type CustomerEmailAction = 'forgot-password' | 'register' | 'verify-email'

interface CustomerEmailRateLimiterOptions {
  ipLimit: number
  emailLimit: number
  windowMs: number
  maxEntries: number
  now?: () => number
}

const FAILURE_RETRY_AFTER_SECONDS = 60

export class CustomerEmailRateLimiter {
  private readonly ipLimiter: FixedWindowRateLimiter
  private readonly emailLimiter: FixedWindowRateLimiter

  constructor(options: CustomerEmailRateLimiterOptions) {
    this.ipLimiter = new FixedWindowRateLimiter({
      limit: options.ipLimit,
      windowMs: options.windowMs,
      maxEntries: options.maxEntries,
      now: options.now,
    })
    this.emailLimiter = new FixedWindowRateLimiter({
      limit: options.emailLimit,
      windowMs: options.windowMs,
      maxEntries: options.maxEntries,
      now: options.now,
    })
  }

  consume(action: CustomerEmailAction, headers: Headers, email: string): RateLimitDecision {
    const clientIp = extractTrustedProxyClientIp(headers)
    if (!clientIp) {
      return {
        allowed: false,
        reason: 'unidentified-client',
        retryAfterSeconds: FAILURE_RETRY_AFTER_SECONDS,
      }
    }

    const ipDecision = this.ipLimiter.consume(`${action}:ip:${clientIp}`)
    if (!ipDecision.allowed) {
      return ipDecision
    }

    const normalizedEmailHash = createHash('sha256')
      .update(normalizeCustomerEmail(email))
      .digest('hex')
    return this.emailLimiter.consume(`${action}:email:${normalizedEmailHash}`)
  }
}

const customerEmailRateLimiter = new CustomerEmailRateLimiter({
  ipLimit: 10,
  emailLimit: 5,
  windowMs: 15 * 60 * 1000,
  maxEntries: 20_000,
})

export function consumeCustomerEmailRateLimit(
  action: CustomerEmailAction,
  headers: Headers,
  normalizedEmail: string
): RateLimitDecision {
  return customerEmailRateLimiter.consume(action, headers, normalizedEmail)
}

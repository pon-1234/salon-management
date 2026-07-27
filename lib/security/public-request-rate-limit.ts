/**
 * @design_doc   Public endpoint abuse protection for the single-process VPS runtime
 * @related_to   app/api/request-attendance/route.ts, Caddy reverse proxy
 * @known_issues State is process-local and must be replaced by a shared limiter before horizontal scaling
 */
import { isIP } from 'node:net'

export type RateLimitRejectionReason =
  | 'rate-limited'
  | 'capacity-exhausted'
  | 'limiter-failure'
  | 'unidentified-client'

export type RateLimitDecision =
  | { allowed: true }
  | {
      allowed: false
      reason: RateLimitRejectionReason
      retryAfterSeconds: number
    }

interface FixedWindowRateLimiterOptions {
  limit: number
  windowMs: number
  maxEntries: number
  now?: () => number
}

interface WindowEntry {
  count: number
  expiresAt: number
}

const FAILURE_RETRY_AFTER_SECONDS = 60

export class FixedWindowRateLimiter {
  private readonly entries = new Map<string, WindowEntry>()
  private readonly limit: number
  private readonly windowMs: number
  private readonly maxEntries: number
  private readonly now: () => number

  constructor({ limit, windowMs, maxEntries, now = Date.now }: FixedWindowRateLimiterOptions) {
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      !Number.isSafeInteger(windowMs) ||
      windowMs < 1 ||
      !Number.isSafeInteger(maxEntries) ||
      maxEntries < 1
    ) {
      throw new Error('Invalid fixed-window rate limiter configuration')
    }

    this.limit = limit
    this.windowMs = windowMs
    this.maxEntries = maxEntries
    this.now = now
  }

  consume(identifier: string): RateLimitDecision {
    try {
      const now = this.now()
      if (!Number.isFinite(now)) {
        return this.failureDecision()
      }

      const existing = this.entries.get(identifier)
      if (existing && now < existing.expiresAt) {
        if (existing.count >= this.limit) {
          return {
            allowed: false,
            reason: 'rate-limited',
            retryAfterSeconds: this.secondsUntil(existing.expiresAt, now),
          }
        }

        existing.count += 1
        return { allowed: true }
      }

      this.removeExpiredEntries(now)
      if (this.entries.size >= this.maxEntries) {
        const firstExpiry = Math.min(
          ...Array.from(this.entries.values(), (entry) => entry.expiresAt)
        )
        return {
          allowed: false,
          reason: 'capacity-exhausted',
          retryAfterSeconds: this.secondsUntil(firstExpiry, now),
        }
      }

      this.entries.set(identifier, { count: 1, expiresAt: now + this.windowMs })
      return { allowed: true }
    } catch {
      return this.failureDecision()
    }
  }

  private removeExpiredEntries(now: number): void {
    for (const [identifier, entry] of this.entries) {
      if (now >= entry.expiresAt) {
        this.entries.delete(identifier)
      }
    }
  }

  private secondsUntil(timestamp: number, now: number): number {
    return Math.max(1, Math.ceil((timestamp - now) / 1000))
  }

  private failureDecision(): RateLimitDecision {
    return {
      allowed: false,
      reason: 'limiter-failure',
      retryAfterSeconds: FAILURE_RETRY_AFTER_SECONDS,
    }
  }
}

const requestAttendanceLimiter = new FixedWindowRateLimiter({
  limit: 3,
  windowMs: 15 * 60 * 1000,
  maxEntries: 10_000,
})

export function extractTrustedProxyClientIp(headers: Headers): string | null {
  const forwardedFor = headers.get('x-forwarded-for')
  if (!forwardedFor) {
    return null
  }

  const clientIp = forwardedFor
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .at(-1)

  return clientIp && isIP(clientIp) !== 0 ? clientIp : null
}

export function consumeRequestAttendanceRateLimit(headers: Headers): RateLimitDecision {
  const clientIp = extractTrustedProxyClientIp(headers)
  if (!clientIp) {
    return {
      allowed: false,
      reason: 'unidentified-client',
      retryAfterSeconds: FAILURE_RETRY_AFTER_SECONDS,
    }
  }

  return requestAttendanceLimiter.consume(clientIp)
}

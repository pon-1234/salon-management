/**
 * @design_doc   Rate limiting for authentication attempts
 * @related_to   lib/auth/config.ts
 * @known_issues Memory-based storage won't work in serverless environments
 */

interface LoginAttempt {
  count: number
  firstAttempt: number
  lastAttempt: number
}

// In-memory store for rate limiting
// In production, use Redis or a database
const loginAttempts = new Map<string, LoginAttempt>()

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const LOCKOUT_MS = 30 * 60 * 1000 // 30 minutes lockout

export function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const attempt = loginAttempts.get(identifier)

  if (!attempt) {
    return { allowed: true }
  }

  // Clean up old attempts
  if (now - attempt.firstAttempt > WINDOW_MS) {
    loginAttempts.delete(identifier)
    return { allowed: true }
  }

  // Check if locked out
  if (attempt.count >= MAX_ATTEMPTS) {
    const lockoutEnd = attempt.lastAttempt + LOCKOUT_MS
    if (now < lockoutEnd) {
      return {
        allowed: false,
        retryAfter: Math.ceil((lockoutEnd - now) / 1000),
      }
    }
    // Lockout expired, reset
    loginAttempts.delete(identifier)
    return { allowed: true }
  }

  return { allowed: true }
}

export function recordLoginAttempt(identifier: string, success: boolean): void {
  const now = Date.now()

  if (success) {
    // Clear attempts on successful login
    loginAttempts.delete(identifier)
    return
  }

  const attempt = loginAttempts.get(identifier)

  if (!attempt) {
    loginAttempts.set(identifier, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
    })
  } else {
    // Reset if window expired
    if (now - attempt.firstAttempt > WINDOW_MS) {
      loginAttempts.set(identifier, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
      })
    } else {
      attempt.count++
      attempt.lastAttempt = now
    }
  }
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, attempt] of loginAttempts.entries()) {
    if (now - attempt.lastAttempt > WINDOW_MS + LOCKOUT_MS) {
      loginAttempts.delete(key)
    }
  }
}, 60 * 1000) // Clean up every minute

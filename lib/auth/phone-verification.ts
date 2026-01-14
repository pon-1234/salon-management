interface VerificationAttempt {
  count: number
  firstAttempt: number
  lastAttempt: number
}

const sendAttempts = new Map<string, VerificationAttempt>()

const SEND_WINDOW_MS = 15 * 60 * 1000
const MAX_SEND_ATTEMPTS = 3

export function checkSendRateLimit(phone: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const attempt = sendAttempts.get(phone)

  if (!attempt) {
    return { allowed: true }
  }

  if (now - attempt.firstAttempt > SEND_WINDOW_MS) {
    sendAttempts.delete(phone)
    return { allowed: true }
  }

  if (attempt.count >= MAX_SEND_ATTEMPTS) {
    const retryAfter = Math.ceil((attempt.firstAttempt + SEND_WINDOW_MS - now) / 1000)
    return { allowed: false, retryAfter }
  }

  return { allowed: true }
}

export function recordSendAttempt(phone: string): void {
  const now = Date.now()
  const attempt = sendAttempts.get(phone)

  if (!attempt) {
    sendAttempts.set(phone, { count: 1, firstAttempt: now, lastAttempt: now })
    return
  }

  if (now - attempt.firstAttempt > SEND_WINDOW_MS) {
    sendAttempts.set(phone, { count: 1, firstAttempt: now, lastAttempt: now })
    return
  }

  attempt.count += 1
  attempt.lastAttempt = now
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

setInterval(() => {
  const now = Date.now()
  for (const [key, attempt] of sendAttempts.entries()) {
    if (now - attempt.lastAttempt > SEND_WINDOW_MS) {
      sendAttempts.delete(key)
    }
  }
}, 60 * 1000)

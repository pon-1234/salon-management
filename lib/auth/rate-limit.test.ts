import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { checkRateLimit, recordLoginAttempt } from './rate-limit'

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.restoreAllMocks()
  })

  describe('checkRateLimit', () => {
    it('should allow first attempt', () => {
      const result = checkRateLimit('user@example.com')
      expect(result.allowed).toBe(true)
      expect(result.retryAfter).toBeUndefined()
    })

    it('should allow attempts within limit', () => {
      const identifier = 'user@example.com'
      
      // Record 4 failed attempts
      for (let i = 0; i < 4; i++) {
        recordLoginAttempt(identifier, false)
      }
      
      const result = checkRateLimit(identifier)
      expect(result.allowed).toBe(true)
      expect(result.retryAfter).toBeUndefined()
    })

    it('should block after max attempts', () => {
      const identifier = 'user@example.com'
      
      // Record 5 failed attempts (MAX_ATTEMPTS)
      for (let i = 0; i < 5; i++) {
        recordLoginAttempt(identifier, false)
      }
      
      const result = checkRateLimit(identifier)
      expect(result.allowed).toBe(false)
      expect(result.retryAfter).toBeDefined()
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('should calculate correct retry time during lockout', () => {
      const identifier = 'user@example.com'
      
      // Record 5 failed attempts
      for (let i = 0; i < 5; i++) {
        recordLoginAttempt(identifier, false)
      }
      
      // Advance time by 10 minutes
      vi.advanceTimersByTime(10 * 60 * 1000)
      
      const result = checkRateLimit(identifier)
      expect(result.allowed).toBe(false)
      // Should have ~20 minutes left (30 minute lockout - 10 minutes elapsed)
      expect(result.retryAfter).toBeCloseTo(20 * 60, -1)
    })

    it('should allow access after lockout expires', () => {
      const identifier = 'user@example.com'
      
      // Record 5 failed attempts
      for (let i = 0; i < 5; i++) {
        recordLoginAttempt(identifier, false)
      }
      
      // Advance time past lockout period (30 minutes)
      vi.advanceTimersByTime(31 * 60 * 1000)
      
      const result = checkRateLimit(identifier)
      expect(result.allowed).toBe(true)
      expect(result.retryAfter).toBeUndefined()
    })

    it('should reset attempts after time window expires', () => {
      const identifier = 'user@example.com'
      
      // Record 3 failed attempts
      for (let i = 0; i < 3; i++) {
        recordLoginAttempt(identifier, false)
      }
      
      // Advance time past window (15 minutes)
      vi.advanceTimersByTime(16 * 60 * 1000)
      
      const result = checkRateLimit(identifier)
      expect(result.allowed).toBe(true)
      expect(result.retryAfter).toBeUndefined()
    })
  })

  describe('recordLoginAttempt', () => {
    it('should clear attempts on successful login', () => {
      const identifier = 'user@example.com'
      
      // Record failed attempts
      recordLoginAttempt(identifier, false)
      recordLoginAttempt(identifier, false)
      
      // Record successful login
      recordLoginAttempt(identifier, true)
      
      // Should be allowed to attempt again
      const result = checkRateLimit(identifier)
      expect(result.allowed).toBe(true)
    })

    it('should increment count for failed attempts', () => {
      const identifier = 'user@example.com'
      
      // Record multiple failed attempts
      for (let i = 0; i < 3; i++) {
        recordLoginAttempt(identifier, false)
      }
      
      // Still under limit, should be allowed
      let result = checkRateLimit(identifier)
      expect(result.allowed).toBe(true)
      
      // Two more to reach limit
      recordLoginAttempt(identifier, false)
      recordLoginAttempt(identifier, false)
      
      // Now should be blocked
      result = checkRateLimit(identifier)
      expect(result.allowed).toBe(false)
    })

    it('should reset count if window expired', () => {
      const identifier = 'user@example.com'
      
      // Record failed attempts
      recordLoginAttempt(identifier, false)
      recordLoginAttempt(identifier, false)
      
      // Advance time past window
      vi.advanceTimersByTime(16 * 60 * 1000)
      
      // Record new attempt - should start fresh count
      recordLoginAttempt(identifier, false)
      
      // Should still be allowed (only 1 attempt in new window)
      const result = checkRateLimit(identifier)
      expect(result.allowed).toBe(true)
    })
  })

  describe('cleanup interval', () => {
    it('should clean up old entries', () => {
      const identifier = 'user@example.com'
      
      // Record failed attempt
      recordLoginAttempt(identifier, false)
      
      // Verify it exists
      let result = checkRateLimit(identifier)
      expect(result.allowed).toBe(true)
      
      // Advance time past window + lockout (45+ minutes)
      vi.advanceTimersByTime(46 * 60 * 1000)
      
      // Trigger cleanup interval
      vi.runOnlyPendingTimers()
      
      // Should be treated as new user
      result = checkRateLimit(identifier)
      expect(result.allowed).toBe(true)
    })
  })
})
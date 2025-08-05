import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { smsClient } from './client'

describe('SMS Client', () => {
  let consoleLogSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    consoleLogSpy.mockRestore()
  })

  describe('send', () => {
    it('should log the SMS details', async () => {
      const promise = smsClient.send({
        to: '+1234567890',
        message: 'Test SMS message',
      })

      // Advance timers to complete the timeout
      vi.advanceTimersByTime(100)

      await promise

      expect(consoleLogSpy).toHaveBeenCalledWith('Sending SMS:', {
        to: '+1234567890',
        message: 'Test SMS message',
      })
    })

    it('should return success with a unique ID', async () => {
      const promise = smsClient.send({
        to: '+1234567890',
        message: 'Test message',
      })

      vi.advanceTimersByTime(100)

      const result = await promise

      expect(result.success).toBe(true)
      expect(result.id).toBeDefined()
      expect(result.id).toMatch(/^sms-\d+-[a-z0-9]{9}$/)
    })

    it('should generate different IDs for different messages', async () => {
      const promise1 = smsClient.send({
        to: '+1111111111',
        message: 'First message',
      })

      vi.advanceTimersByTime(100)
      const result1 = await promise1

      // Advance time a bit to ensure different timestamp
      vi.advanceTimersByTime(10)

      const promise2 = smsClient.send({
        to: '+2222222222',
        message: 'Second message',
      })

      vi.advanceTimersByTime(100)
      const result2 = await promise2

      expect(result1.id).not.toBe(result2.id)
    })

    it('should handle empty message', async () => {
      const promise = smsClient.send({
        to: '+1234567890',
        message: '',
      })

      vi.advanceTimersByTime(100)

      const result = await promise

      expect(result.success).toBe(true)
      expect(consoleLogSpy).toHaveBeenCalledWith('Sending SMS:', {
        to: '+1234567890',
        message: '',
      })
    })

    it('should handle international phone numbers', async () => {
      const promise = smsClient.send({
        to: '+44123456789',
        message: 'International SMS',
      })

      vi.advanceTimersByTime(100)

      const result = await promise

      expect(result.success).toBe(true)
      expect(consoleLogSpy).toHaveBeenCalledWith('Sending SMS:', {
        to: '+44123456789',
        message: 'International SMS',
      })
    })

    it('should handle long messages', async () => {
      const longMessage = 'A'.repeat(500)
      const promise = smsClient.send({
        to: '+1234567890',
        message: longMessage,
      })

      vi.advanceTimersByTime(100)

      const result = await promise

      expect(result.success).toBe(true)
      expect(consoleLogSpy).toHaveBeenCalledWith('Sending SMS:', {
        to: '+1234567890',
        message: longMessage,
      })
    })
  })
})

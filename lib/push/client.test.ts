import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { pushClient } from './client'

describe('Push Client', () => {
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
    it('should log the push notification details', async () => {
      const promise = pushClient.send({
        userId: 'user123',
        title: 'Test Notification',
        body: 'This is a test push notification'
      })

      // Advance timers to complete the timeout
      vi.advanceTimersByTime(100)
      
      await promise

      expect(consoleLogSpy).toHaveBeenCalledWith('Sending push notification:', {
        userId: 'user123',
        title: 'Test Notification',
        body: 'This is a test push notification'
      })
    })

    it('should return success with a unique ID', async () => {
      const promise = pushClient.send({
        userId: 'user123',
        title: 'Test',
        body: 'Test body'
      })

      vi.advanceTimersByTime(100)
      
      const result = await promise

      expect(result.success).toBe(true)
      expect(result.id).toBeDefined()
      expect(result.id).toMatch(/^push-\d+-[a-z0-9]{9}$/)
    })

    it('should generate different IDs for different notifications', async () => {
      const promise1 = pushClient.send({
        userId: 'user1',
        title: 'First',
        body: 'First notification'
      })

      vi.advanceTimersByTime(100)
      const result1 = await promise1

      // Advance time a bit to ensure different timestamp
      vi.advanceTimersByTime(10)

      const promise2 = pushClient.send({
        userId: 'user2',
        title: 'Second',
        body: 'Second notification'
      })

      vi.advanceTimersByTime(100)
      const result2 = await promise2

      expect(result1.id).not.toBe(result2.id)
    })

    it('should handle notifications with additional data', async () => {
      const promise = pushClient.send({
        userId: 'user123',
        title: 'Order Update',
        body: 'Your order has been shipped',
        data: {
          orderId: 'order123',
          trackingNumber: 'TRACK123',
          estimatedDelivery: '2023-12-25'
        }
      })

      vi.advanceTimersByTime(100)
      
      const result = await promise

      expect(result.success).toBe(true)
      // Note: The data field is not logged in the current implementation
      expect(consoleLogSpy).toHaveBeenCalledWith('Sending push notification:', {
        userId: 'user123',
        title: 'Order Update',
        body: 'Your order has been shipped'
      })
    })

    it('should handle empty title and body', async () => {
      const promise = pushClient.send({
        userId: 'user123',
        title: '',
        body: ''
      })

      vi.advanceTimersByTime(100)
      
      const result = await promise

      expect(result.success).toBe(true)
      expect(consoleLogSpy).toHaveBeenCalledWith('Sending push notification:', {
        userId: 'user123',
        title: '',
        body: ''
      })
    })

    it('should handle long title and body', async () => {
      const longTitle = 'A'.repeat(100)
      const longBody = 'B'.repeat(500)
      
      const promise = pushClient.send({
        userId: 'user123',
        title: longTitle,
        body: longBody
      })

      vi.advanceTimersByTime(100)
      
      const result = await promise

      expect(result.success).toBe(true)
      expect(consoleLogSpy).toHaveBeenCalledWith('Sending push notification:', {
        userId: 'user123',
        title: longTitle,
        body: longBody
      })
    })

    it('should handle special characters in content', async () => {
      const promise = pushClient.send({
        userId: 'user123',
        title: '🎉 Special Characters!',
        body: 'Japanese: こんにちは, Emoji: 🚀'
      })

      vi.advanceTimersByTime(100)
      
      const result = await promise

      expect(result.success).toBe(true)
      expect(consoleLogSpy).toHaveBeenCalledWith('Sending push notification:', {
        userId: 'user123',
        title: '🎉 Special Characters!',
        body: 'Japanese: こんにちは, Emoji: 🚀'
      })
    })
  })
})
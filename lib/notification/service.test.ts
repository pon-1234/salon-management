/**
 * @design_doc   Tests for notification service for reservations
 * @related_to   notification/service.ts, reservation/route.ts
 * @known_issues None currently
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotificationService } from './service'
import type { Reservation } from '@/lib/types/reservation'
import type { BulkNotification } from './service'

// Mock external services
vi.mock('@/lib/email/client', () => ({
  emailClient: {
    send: vi.fn().mockResolvedValue({ success: true, id: 'email-123' }),
  },
}))

vi.mock('@/lib/sms/client', () => ({
  smsClient: {
    send: vi.fn().mockResolvedValue({ success: true, id: 'sms-123' }),
  },
}))

vi.mock('@/lib/push/client', () => ({
  pushClient: {
    send: vi.fn().mockResolvedValue({ success: true, id: 'push-123' }),
  },
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

import { emailClient } from '@/lib/email/client'
import { smsClient } from '@/lib/sms/client'
import { pushClient } from '@/lib/push/client'

describe('NotificationService', () => {
  let notificationService: NotificationService

  beforeEach(() => {
    vi.clearAllMocks()
    notificationService = new NotificationService()
  })

  describe('sendReservationConfirmation', () => {
    const mockReservation = {
      id: 'reservation1',
      customerId: 'customer1',
      castId: 'cast1',
      courseId: 'course1',
      startTime: new Date('2025-07-10T10:00:00Z'),
      endTime: new Date('2025-07-10T11:00:00Z'),
      status: 'confirmed',
      customer: {
        id: 'customer1',
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '+1234567890',
        emailNotificationEnabled: true,
        smsEnabled: true,
        preferences: {
          pushNotifications: true,
        },
      },
      cast: {
        id: 'cast1',
        name: 'Test Cast',
      },
      course: {
        id: 'course1',
        name: '60-minute Course',
        price: 10000,
      },
    } as any

    it('should send email notification when enabled', async () => {
      await notificationService.sendReservationConfirmation(mockReservation)

      expect(vi.mocked(emailClient.send)).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: expect.stringContaining('ご予約が確定しました'),
        body: expect.stringContaining('Test Customer'),
        data: {
          customerName: 'Test Customer',
          castName: 'Test Cast',
          courseName: '60-minute Course',
          startTime: mockReservation.startTime,
          endTime: mockReservation.endTime,
          reservationId: 'reservation1',
        },
      })
    })

    it('should send SMS notification when enabled', async () => {
      await notificationService.sendReservationConfirmation(mockReservation)

      expect(vi.mocked(smsClient.send)).toHaveBeenCalledWith({
        to: '+1234567890',
        message: expect.stringContaining('予約'),
      })
    })

    it('should send push notification when enabled', async () => {
      await notificationService.sendReservationConfirmation(mockReservation)

      expect(vi.mocked(pushClient.send)).toHaveBeenCalledWith({
        userId: 'customer1',
        title: expect.stringContaining('予約が確定しました'),
        body: expect.stringContaining('Test Cast'),
        data: {
          reservationId: 'reservation1',
          type: 'reservation_confirmation',
        },
      })
    })

    it('should skip notifications based on customer preferences', async () => {
      const reservationWithPrefs = {
        ...mockReservation,
        customer: {
          ...mockReservation.customer,
          emailNotificationEnabled: false,
          preferences: {
            pushNotifications: false,
          },
        },
      }

      await notificationService.sendReservationConfirmation(reservationWithPrefs)

      expect(vi.mocked(emailClient.send)).not.toHaveBeenCalled()
      expect(vi.mocked(smsClient.send)).toHaveBeenCalled()
      expect(vi.mocked(pushClient.send)).not.toHaveBeenCalled()
    })
  })

  describe('sendReservationModification', () => {
    const mockReservation = {
      id: 'reservation1',
      customerId: 'customer1',
      customer: {
        id: 'customer1',
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '+1234567890',
        emailNotificationEnabled: true,
        smsEnabled: true,
        preferences: {
          pushNotifications: true,
        },
      },
      cast: {
        name: 'Test Cast',
      },
      startTime: new Date('2025-07-10T10:00:00Z'),
      endTime: new Date('2025-07-10T11:00:00Z'),
    } as any

    const oldReservation = {
      startTime: new Date('2025-07-10T09:00:00Z'),
      endTime: new Date('2025-07-10T10:00:00Z'),
    }

    it('should send modification notifications with old and new times', async () => {
      await notificationService.sendReservationModification(mockReservation, oldReservation)

      expect(vi.mocked(emailClient.send)).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: expect.stringContaining('内容が更新されました'),
        body: expect.stringContaining('Test Customer'),
        data: expect.objectContaining({
          oldStartTime: oldReservation.startTime,
          oldEndTime: oldReservation.endTime,
          newStartTime: mockReservation.startTime,
          newEndTime: mockReservation.endTime,
        }),
      })
    })
  })

  describe('sendReservationCancellation', () => {
    const mockReservation = {
      id: 'reservation1',
      customerId: 'customer1',
      customer: {
        id: 'customer1',
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '+1234567890',
        emailNotificationEnabled: true,
        smsEnabled: true,
        preferences: {
          pushNotifications: true,
        },
      },
      cast: {
        name: 'Test Cast',
      },
      course: {
        name: '60-minute Course',
      },
      startTime: new Date('2025-07-10T10:00:00Z'),
    } as any

    it('should send cancellation notifications', async () => {
      await notificationService.sendReservationCancellation(mockReservation)

      expect(vi.mocked(emailClient.send)).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: expect.stringContaining('キャンセル'),
        body: expect.stringContaining('Test Customer'),
        data: expect.objectContaining({
          customerName: 'Test Customer',
          castName: 'Test Cast',
          courseName: '60-minute Course',
        }),
      })

      expect(vi.mocked(smsClient.send)).toHaveBeenCalledWith({
        to: '+1234567890',
        message: expect.stringContaining('キャンセル'),
      })

      expect(vi.mocked(pushClient.send)).toHaveBeenCalledWith({
        userId: 'customer1',
        title: expect.stringContaining('キャンセル'),
        body: expect.stringContaining('Test Cast'),
        data: {
          reservationId: 'reservation1',
          type: 'reservation_cancellation',
        },
      })
    })
  })

  describe('sendBulkNotifications', () => {
    it('should handle errors gracefully and continue sending', async () => {
      const notifications: BulkNotification[] = [
        { type: 'email' as const, to: 'test1@example.com', data: {} },
        { type: 'email' as const, to: 'test2@example.com', data: {} },
        { type: 'sms' as const, to: '+1234567890', data: {} },
      ]

      // Mock first email to fail
      vi.mocked(emailClient.send)
        .mockRejectedValueOnce(new Error('Email failed'))
        .mockResolvedValueOnce({ success: true })

      vi.mocked(smsClient.send).mockResolvedValueOnce({ success: true })

      const results = await notificationService.sendBulkNotifications(notifications)

      expect(results).toHaveLength(3)
      expect(results[0].success).toBe(false)
      expect(results[0].error).toContain('Email failed')
      expect(results[1].success).toBe(true)
      expect(results[2].success).toBe(true)
    })
  })

  describe('getNotificationHistory', () => {
    it('should retrieve notification history for a reservation', async () => {
      const mockHistory = [
        {
          id: 'notif1',
          reservationId: 'reservation1',
          type: 'email',
          status: 'sent',
          sentAt: new Date('2025-07-10T09:00:00Z'),
        },
        {
          id: 'notif2',
          reservationId: 'reservation1',
          type: 'sms',
          status: 'sent',
          sentAt: new Date('2025-07-10T09:01:00Z'),
        },
      ]

      vi.spyOn(notificationService, 'getNotificationHistory').mockResolvedValueOnce(mockHistory)

      const history = await notificationService.getNotificationHistory('reservation1')

      expect(history).toHaveLength(2)
      expect(history[0].type).toBe('email')
      expect(history[1].type).toBe('sms')
    })
  })

  describe('retryFailedNotifications', () => {
    it('should retry failed notifications', async () => {
      const failedNotifications = [
        {
          id: 'notif1',
          type: 'email',
          to: 'test@example.com',
          data: { subject: 'Test' },
          attempts: 1,
        },
      ]

      vi.spyOn(notificationService, 'getFailedNotifications').mockResolvedValueOnce(
        failedNotifications
      )
      vi.mocked(emailClient.send).mockResolvedValueOnce({ success: true })

      const results = await notificationService.retryFailedNotifications()

      expect(results.retried).toBe(1)
      expect(results.successful).toBe(1)
      expect(results.failed).toBe(0)
    })

    it('should mark notifications as permanently failed after max retries', async () => {
      const failedNotifications = [
        {
          id: 'notif1',
          type: 'email',
          to: 'test@example.com',
          data: { subject: 'Test' },
          attempts: 3, // Max retries reached
        },
      ]

      vi.spyOn(notificationService, 'getFailedNotifications').mockResolvedValueOnce(
        failedNotifications
      )

      const results = await notificationService.retryFailedNotifications()

      expect(results.retried).toBe(0)
      expect(results.permanentlyFailed).toBe(1)
      expect(vi.mocked(emailClient.send)).not.toHaveBeenCalled()
    })
  })
})

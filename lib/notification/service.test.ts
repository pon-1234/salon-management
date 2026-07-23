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
import { env } from '@/lib/config/env'
import logger from '@/lib/logger'

describe('NotificationService', () => {
  let notificationService: NotificationService

  beforeEach(() => {
    vi.clearAllMocks()
    env.resend.apiKey = 'test-api-key'
    env.notification.mockEnabled = false
    notificationService = new NotificationService()
  })

  it('does not advertise notification history or retry support without durable storage', () => {
    expect('getNotificationHistory' in notificationService).toBe(false)
    expect('getFailedNotifications' in notificationService).toBe(false)
    expect('retryFailedNotifications' in notificationService).toBe(false)
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

    it('records a failed delivery without logging recipient data', async () => {
      vi.mocked(smsClient.send).mockResolvedValueOnce({
        success: false,
        error: 'SMS provider request failed.',
      })

      await notificationService.sendReservationConfirmation(mockReservation)

      expect(logger.error).toHaveBeenCalledWith(
        { reservationId: 'reservation1', failed: 1, attempted: 3 },
        'Reservation confirmation notification delivery failed'
      )
      const serializedLogs = JSON.stringify(vi.mocked(logger.error).mock.calls)
      expect(serializedLogs).not.toContain('+1234567890')
      expect(serializedLogs).not.toContain('test@example.com')
    })

    it('HTML-escapes all reservation data included in the email body', async () => {
      const maliciousReservation = {
        ...mockReservation,
        customer: { ...mockReservation.customer, name: '<img src=x onerror="alert(1)">' },
        cast: { ...mockReservation.cast, name: '<script>cast()</script>' },
        course: { ...mockReservation.course, name: 'A & B' },
        locationMemo: '<a href="https://attacker.example">click</a>',
      }

      await notificationService.sendReservationConfirmation(maliciousReservation)

      const body = vi.mocked(emailClient.send).mock.calls[0][0].body ?? ''
      expect(body).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
      expect(body).toContain('&lt;script&gt;cast()&lt;/script&gt;')
      expect(body).toContain('A &amp; B')
      expect(body).toContain('&lt;a href=&quot;https://attacker.example&quot;&gt;click&lt;/a&gt;')
      expect(body).not.toMatch(/<img|<script|<a href="https:\/\/attacker\.example"/i)
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
    it('delegates explicit development mocks to the email client', async () => {
      env.resend.apiKey = ''
      env.notification.mockEnabled = true
      vi.mocked(emailClient.send).mockResolvedValueOnce({
        success: true,
        id: 'email-mock-123',
      })

      const results = await notificationService.sendBulkNotifications([
        {
          type: 'email',
          to: 'test@example.com',
          data: { to: 'test@example.com', subject: 'Test' },
        },
      ])

      expect(results).toEqual([{ success: true, notificationId: 'email-mock-123' }])
      expect(emailClient.send).toHaveBeenCalledOnce()
    })

    it('reports an email failure when the provider is not configured', async () => {
      env.resend.apiKey = ''
      vi.mocked(emailClient.send).mockResolvedValueOnce({
        success: false,
        error: 'Email provider is not configured.',
      })

      const results = await notificationService.sendBulkNotifications([
        {
          type: 'email',
          to: 'test@example.com',
          data: { to: 'test@example.com', subject: 'Test' },
        },
      ])

      expect(results).toEqual([{ success: false, error: 'Email provider is not configured.' }])
      expect(emailClient.send).toHaveBeenCalledOnce()
    })

    it('reports a rejected SMS delivery as a failure', async () => {
      vi.mocked(smsClient.send).mockResolvedValueOnce({
        success: false,
        error: 'SMS provider rejected the request.',
      })

      const results = await notificationService.sendBulkNotifications([
        {
          type: 'sms',
          to: '+819012345678',
          data: { to: '+819012345678', message: 'secret code' },
        },
      ])

      expect(results).toEqual([{ success: false, error: 'SMS provider rejected the request.' }])
    })

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
})

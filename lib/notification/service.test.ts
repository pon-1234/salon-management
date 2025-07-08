/**
 * @design_doc   Notification service tests
 * @related_to   Notification system, email service, SMS service
 * @known_issues None currently
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotificationService } from './service'
import { NotificationType, NotificationStatus } from './types'

// Mock Prisma client
vi.mock('@/lib/generated/prisma', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    notification: {
      create: vi.fn().mockImplementation(({ data }) => {
        const now = new Date()
        return Promise.resolve({
          id: 'notification-123',
          recipientId: data.recipientId,
          recipientEmail: data.recipientEmail,
          recipientPhone: data.recipientPhone,
          type: data.type,
          templateId: data.templateId,
          subject: data.subject,
          content: data.content,
          status: data.status,
          sentAt: data.sentAt,
          deliveredAt: data.deliveredAt,
          failureReason: data.failureReason,
          metadata: data.metadata,
          createdAt: now,
          updatedAt: now,
        })
      }),
    },
  })),
}))

// Mock external notification providers
const mockEmailProvider = {
  sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'email-123' }),
}

const mockSMSProvider = {
  sendSMS: vi.fn().mockResolvedValue({ success: true, messageId: 'sms-123' }),
}

vi.mock('./providers/email-provider', () => ({
  EmailProvider: vi.fn().mockImplementation(() => mockEmailProvider),
}))

vi.mock('./providers/sms-provider', () => ({
  SMSProvider: vi.fn().mockImplementation(() => mockSMSProvider),
}))

describe('NotificationService', () => {
  let notificationService: NotificationService

  beforeEach(() => {
    vi.clearAllMocks()
    notificationService = new NotificationService()
  })

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      // RED: This test should fail because NotificationService doesn't exist yet
      const result = await notificationService.sendEmail(
        'test@example.com',
        'Test Subject',
        'Test Content'
      )

      expect(result).toBe(true)
    })

    it('should handle email sending failure', async () => {
      // RED: This test should fail because error handling isn't implemented
      // Mock failure response
      mockEmailProvider.sendEmail.mockResolvedValueOnce({ success: false, error: 'Network error' })
      
      const result = await notificationService.sendEmail(
        'test@example.com',
        'Test Subject',
        'Test Content'
      )

      expect(result).toBe(false)
    })
  })

  describe('sendSMS', () => {
    it('should send SMS successfully', async () => {
      // RED: This test should fail because SMS service isn't implemented
      const result = await notificationService.sendSMS(
        '+81-90-1234-5678',
        'Test SMS content'
      )

      expect(result).toBe(true)
    })

    it('should validate phone number format', async () => {
      // RED: This test should fail because validation isn't implemented
      const result = await notificationService.sendSMS(
        'invalid-phone',
        'Test SMS content'
      )

      expect(result).toBe(false)
    })
  })

  describe('sendNotification', () => {
    it('should create and send notification record', async () => {
      // RED: This test should fail because notification recording isn't implemented
      const notificationData = {
        recipientId: 'customer1',
        recipientEmail: 'test@example.com',
        type: 'email' as NotificationType,
        subject: 'Reservation Confirmation',
        content: 'Your reservation has been confirmed.',
        status: 'pending' as NotificationStatus,
      }

      const result = await notificationService.sendNotification(notificationData)

      expect(result).toHaveProperty('id')
      expect(result.status).toBe('sent')
      expect(result.sentAt).toBeInstanceOf(Date)
    })

    it('should update notification status on failure', async () => {
      // RED: This test should fail because failure handling isn't implemented
      // Mock failure response
      mockEmailProvider.sendEmail.mockResolvedValueOnce({ success: false, error: 'Network error' })
      
      const notificationData = {
        recipientId: 'customer1',
        recipientEmail: 'test@example.com',
        type: 'email' as NotificationType,
        subject: 'Test',
        content: 'Test content',
        status: 'pending' as NotificationStatus,
      }

      const result = await notificationService.sendNotification(notificationData)

      expect(result.status).toBe('failed')
      expect(result.failureReason).toBeDefined()
    })
  })

  describe('reservation notifications', () => {
    it('should send reservation confirmation notification', async () => {
      // RED: This test should fail because reservation notification template isn't implemented
      const reservationData = {
        customerName: 'Test Customer',
        customerEmail: 'customer@example.com',
        customerPhone: '+81-90-1234-5678',
        staffName: 'Test Staff',
        serviceName: 'Test Service',
        reservationDate: new Date('2024-01-15T10:00:00Z'),
        reservationTime: '10:00-11:00',
        location: 'Test Location',
        totalPrice: 10000,
        reservationId: 'reservation1',
      }

      const result = await notificationService.sendReservationConfirmation(reservationData)

      expect(result.email).toBe(true)
      if (reservationData.customerPhone) {
        expect(result.sms).toBe(true)
      }
    })

    it('should send reservation modification notification', async () => {
      // RED: This test should fail because modification notification isn't implemented
      const reservationData = {
        customerName: 'Test Customer',
        customerEmail: 'customer@example.com',
        staffName: 'Test Staff',
        serviceName: 'Test Service',
        reservationDate: new Date('2024-01-15T11:00:00Z'),
        reservationTime: '11:00-12:00',
        location: 'Test Location',
        totalPrice: 10000,
        reservationId: 'reservation1',
      }

      const result = await notificationService.sendReservationModification(reservationData)

      expect(result.email).toBe(true)
    })

    it('should send reservation cancellation notification', async () => {
      // RED: This test should fail because cancellation notification isn't implemented
      const reservationData = {
        customerName: 'Test Customer',
        customerEmail: 'customer@example.com',
        staffName: 'Test Staff',
        serviceName: 'Test Service',
        reservationDate: new Date('2024-01-15T10:00:00Z'),
        reservationTime: '10:00-11:00',
        location: 'Test Location',
        totalPrice: 10000,
        reservationId: 'reservation1',
      }

      const result = await notificationService.sendReservationCancellation(reservationData)

      expect(result.email).toBe(true)
    })
  })
})
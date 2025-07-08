/**
 * @design_doc   Notification system types and interfaces
 * @related_to   Reservation backend, email service, SMS service
 * @known_issues None currently
 */
import { BaseEntity } from '../shared'

export type NotificationType = 'email' | 'sms' | 'push'
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered'

export interface NotificationTemplate extends BaseEntity {
  name: string
  type: NotificationType
  subject?: string
  content: string
  variables: string[]
}

export interface Notification extends BaseEntity {
  recipientId: string
  recipientEmail?: string
  recipientPhone?: string
  type: NotificationType
  templateId?: string
  subject?: string
  content: string
  status: NotificationStatus
  sentAt?: Date
  deliveredAt?: Date
  failureReason?: string
  metadata?: Record<string, any>
}

export interface NotificationService {
  sendEmail(
    to: string,
    subject: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<boolean>

  sendSMS(
    to: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<boolean>

  sendPush(
    to: string,
    title: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<boolean>

  sendNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<Notification>
}

export interface ReservationNotificationData {
  customerName: string
  customerEmail: string
  customerPhone?: string
  staffName: string
  serviceName: string
  reservationDate: Date
  reservationTime: string
  location: string
  totalPrice: number
  reservationId: string
}
/**
 * @design_doc   Notification service implementation
 * @related_to   Notification system, email provider, SMS provider
 * @known_issues None currently
 */
import { 
  NotificationService as INotificationService, 
  Notification, 
  NotificationType,
  ReservationNotificationData 
} from './types'
import { EmailProvider } from './providers/email-provider'
import { SMSProvider } from './providers/sms-provider'
import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

export class NotificationService implements INotificationService {
  private emailProvider: EmailProvider
  private smsProvider: SMSProvider

  constructor() {
    this.emailProvider = new EmailProvider()
    this.smsProvider = new SMSProvider()
  }

  async sendEmail(
    to: string,
    subject: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const result = await this.emailProvider.sendEmail(to, subject, content, metadata)
      return result.success
    } catch (error) {
      console.error('Failed to send email:', error)
      return false
    }
  }

  async sendSMS(
    to: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Basic phone number validation
      const phoneRegex = /^\+?[1-9]\d{1,14}$/
      if (!phoneRegex.test(to.replace(/[\s-]/g, ''))) {
        console.error('Invalid phone number format:', to)
        return false
      }

      const result = await this.smsProvider.sendSMS(to, content, metadata)
      return result.success
    } catch (error) {
      console.error('Failed to send SMS:', error)
      return false
    }
  }

  async sendPush(
    to: string,
    title: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    // Push notification implementation would go here
    // For now, just return true as a placeholder
    console.log('Push notification would be sent:', { to, title, content, metadata })
    return true
  }

  async sendNotification(
    notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Notification> {
    const now = new Date()
    
    try {
      let success = false
      let messageId = ''

      // Send notification based on type
      switch (notification.type) {
        case 'email':
          if (notification.recipientEmail) {
            success = await this.sendEmail(
              notification.recipientEmail,
              notification.subject || 'Notification',
              notification.content,
              notification.metadata
            )
          }
          break
        case 'sms':
          if (notification.recipientPhone) {
            success = await this.sendSMS(
              notification.recipientPhone,
              notification.content,
              notification.metadata
            )
          }
          break
        case 'push':
          success = await this.sendPush(
            notification.recipientId,
            notification.subject || 'Notification',
            notification.content,
            notification.metadata
          )
          break
      }

      // Create notification record
      const notificationRecord = await prisma.notification.create({
        data: {
          recipientId: notification.recipientId,
          recipientEmail: notification.recipientEmail,
          recipientPhone: notification.recipientPhone,
          type: notification.type,
          templateId: notification.templateId,
          subject: notification.subject,
          content: notification.content,
          status: success ? 'sent' : 'failed',
          sentAt: success ? now : undefined,
          failureReason: success ? undefined : 'Failed to send notification',
          metadata: notification.metadata,
        }
      })

      return notificationRecord
    } catch (error) {
      console.error('Failed to send notification:', error)
      
      // Create failed notification record
      const failedRecord = await prisma.notification.create({
        data: {
          recipientId: notification.recipientId,
          recipientEmail: notification.recipientEmail,
          recipientPhone: notification.recipientPhone,
          type: notification.type,
          templateId: notification.templateId,
          subject: notification.subject,
          content: notification.content,
          status: 'failed',
          failureReason: error instanceof Error ? error.message : 'Unknown error',
          metadata: notification.metadata,
        }
      })

      return failedRecord
    }
  }

  async sendReservationConfirmation(
    data: ReservationNotificationData
  ): Promise<{ email: boolean; sms: boolean }> {
    const emailContent = this.generateReservationConfirmationEmail(data)
    const smsContent = this.generateReservationConfirmationSMS(data)

    const emailResult = await this.sendEmail(
      data.customerEmail,
      '予約確認のお知らせ',
      emailContent,
      { reservationId: data.reservationId, type: 'confirmation' }
    )

    let smsResult = false
    if (data.customerPhone) {
      smsResult = await this.sendSMS(
        data.customerPhone,
        smsContent,
        { reservationId: data.reservationId, type: 'confirmation' }
      )
    }

    return { email: emailResult, sms: smsResult }
  }

  async sendReservationModification(
    data: ReservationNotificationData
  ): Promise<{ email: boolean; sms: boolean }> {
    const emailContent = this.generateReservationModificationEmail(data)
    const smsContent = this.generateReservationModificationSMS(data)

    const emailResult = await this.sendEmail(
      data.customerEmail,
      '予約変更のお知らせ',
      emailContent,
      { reservationId: data.reservationId, type: 'modification' }
    )

    let smsResult = false
    if (data.customerPhone) {
      smsResult = await this.sendSMS(
        data.customerPhone,
        smsContent,
        { reservationId: data.reservationId, type: 'modification' }
      )
    }

    return { email: emailResult, sms: smsResult }
  }

  async sendReservationCancellation(
    data: ReservationNotificationData
  ): Promise<{ email: boolean; sms: boolean }> {
    const emailContent = this.generateReservationCancellationEmail(data)
    const smsContent = this.generateReservationCancellationSMS(data)

    const emailResult = await this.sendEmail(
      data.customerEmail,
      '予約キャンセルのお知らせ',
      emailContent,
      { reservationId: data.reservationId, type: 'cancellation' }
    )

    let smsResult = false
    if (data.customerPhone) {
      smsResult = await this.sendSMS(
        data.customerPhone,
        smsContent,
        { reservationId: data.reservationId, type: 'cancellation' }
      )
    }

    return { email: emailResult, sms: smsResult }
  }

  private generateReservationConfirmationEmail(data: ReservationNotificationData): string {
    return `
${data.customerName}様

この度はご予約いただき、誠にありがとうございます。
ご予約内容をご確認ください。

■ご予約詳細
予約番号: ${data.reservationId}
お客様名: ${data.customerName}
担当スタッフ: ${data.staffName}
サービス: ${data.serviceName}
日時: ${data.reservationDate.toLocaleDateString('ja-JP')} ${data.reservationTime}
場所: ${data.location}
料金: ¥${data.totalPrice.toLocaleString()}

ご不明点がございましたら、お気軽にお問い合わせください。
当日お会いできることを楽しみにしております。
    `.trim()
  }

  private generateReservationConfirmationSMS(data: ReservationNotificationData): string {
    return `【予約確認】${data.customerName}様 ${data.reservationDate.toLocaleDateString('ja-JP')} ${data.reservationTime} ${data.serviceName} ご予約を承りました。担当:${data.staffName} 予約番号:${data.reservationId}`
  }

  private generateReservationModificationEmail(data: ReservationNotificationData): string {
    return `
${data.customerName}様

ご予約内容が変更されました。
変更後のご予約内容をご確認ください。

■変更後ご予約詳細
予約番号: ${data.reservationId}
お客様名: ${data.customerName}
担当スタッフ: ${data.staffName}
サービス: ${data.serviceName}
日時: ${data.reservationDate.toLocaleDateString('ja-JP')} ${data.reservationTime}
場所: ${data.location}
料金: ¥${data.totalPrice.toLocaleString()}

ご不明点がございましたら、お気軽にお問い合わせください。
    `.trim()
  }

  private generateReservationModificationSMS(data: ReservationNotificationData): string {
    return `【予約変更】${data.customerName}様 ご予約が変更されました。${data.reservationDate.toLocaleDateString('ja-JP')} ${data.reservationTime} ${data.serviceName} 担当:${data.staffName}`
  }

  private generateReservationCancellationEmail(data: ReservationNotificationData): string {
    return `
${data.customerName}様

ご予約がキャンセルされました。

■キャンセル予約詳細
予約番号: ${data.reservationId}
お客様名: ${data.customerName}
担当スタッフ: ${data.staffName}
サービス: ${data.serviceName}
日時: ${data.reservationDate.toLocaleDateString('ja-JP')} ${data.reservationTime}

またのご利用をお待ちしております。
ご不明点がございましたら、お気軽にお問い合わせください。
    `.trim()
  }

  private generateReservationCancellationSMS(data: ReservationNotificationData): string {
    return `【予約キャンセル】${data.customerName}様 ${data.reservationDate.toLocaleDateString('ja-JP')} ${data.reservationTime}のご予約がキャンセルされました。予約番号:${data.reservationId}`
  }
}
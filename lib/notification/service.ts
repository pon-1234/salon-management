/**
 * @design_doc   Notification service for handling reservation notifications
 * @related_to   reservation/route.ts, email/client.ts, sms/client.ts, push/client.ts
 * @known_issues Delivery failures are logged, but durable history and automatic retry require a persisted queue
 */
import { emailClient } from '@/lib/email/client'
import { smsClient } from '@/lib/sms/client'
import { pushClient } from '@/lib/push/client'
import logger from '@/lib/logger'
import { escapeHtmlText } from '@/lib/email/html'

interface NotificationResult {
  success: boolean
  error?: string
  notificationId?: string
}

export interface BulkNotification {
  type: 'email' | 'sms' | 'push'
  to: string
  data: any
}

export class NotificationService {
  async sendReservationConfirmation(reservation: any): Promise<void> {
    const notifications: Promise<NotificationResult>[] = []

    // Send email if enabled
    if (this.shouldSendEmail(reservation.customer) && reservation.customer.email) {
      const { subject, body } = this.buildReservationEmailContent(reservation, 'confirmation')

      notifications.push(
        this.sendEmail({
          to: reservation.customer.email,
          subject,
          body,
          data: {
            customerName: reservation.customer.name,
            castName: reservation.cast?.name,
            courseName: reservation.course?.name,
            startTime: reservation.startTime,
            endTime: reservation.endTime,
            reservationId: reservation.id,
          },
        }).catch(() => {
          return { success: false, error: 'Failed to send email' }
        })
      )
    }

    if (this.shouldSendSms(reservation.customer)) {
      const storeLabel = this.getStoreLabel(reservation)
      const smsMessage = `${storeLabel}より: ${this.formatDateTime(reservation.startTime)}のご予約が確定しました。担当 ${reservation.cast?.name ?? ''}`
      notifications.push(
        this.sendSMS({
          to: reservation.customer.phone,
          message: smsMessage.trim(),
        }).catch(() => {
          return { success: false, error: 'Failed to send SMS' }
        })
      )
    }

    if (this.shouldSendPush(reservation.customer)) {
      notifications.push(
        this.sendPush({
          userId: reservation.customer.id,
          title: '予約が確定しました',
          body: `${reservation.cast?.name ?? 'キャスト'}との予約が確定しました`,
          data: {
            reservationId: reservation.id,
            type: 'reservation_confirmation',
          },
        }).catch(() => {
          return { success: false, error: 'Failed to send push notification' }
        })
      )
    }

    await this.recordReservationDeliveryResult(reservation.id, 'confirmation', notifications)
  }

  async sendReservationModification(reservation: any, oldReservation: any): Promise<void> {
    const notifications: Promise<NotificationResult>[] = []

    if (this.shouldSendEmail(reservation.customer) && reservation.customer.email) {
      const { subject, body } = this.buildReservationEmailContent(
        reservation,
        'modification',
        oldReservation
      )
      notifications.push(
        this.sendEmail({
          to: reservation.customer.email,
          subject,
          body,
          data: {
            customerName: reservation.customer.name,
            castName: reservation.cast?.name,
            oldStartTime: oldReservation.startTime,
            oldEndTime: oldReservation.endTime,
            newStartTime: reservation.startTime,
            newEndTime: reservation.endTime,
            reservationId: reservation.id,
          },
        }).catch(() => {
          return { success: false, error: 'Failed to send email' }
        })
      )
    }

    if (this.shouldSendSms(reservation.customer)) {
      const storeLabel = this.getStoreLabel(reservation)
      const smsMessage = `${storeLabel}より: ご予約日時が変更されました。新しい時間 ${this.formatDateTime(reservation.startTime)}`
      notifications.push(
        this.sendSMS({
          to: reservation.customer.phone,
          message: smsMessage,
        }).catch(() => {
          return { success: false, error: 'Failed to send SMS' }
        })
      )
    }

    if (this.shouldSendPush(reservation.customer)) {
      notifications.push(
        this.sendPush({
          userId: reservation.customer.id,
          title: '予約内容が変更されました',
          body: `${reservation.cast?.name ?? 'キャスト'}との予約内容が更新されました`,
          data: {
            reservationId: reservation.id,
            type: 'reservation_modification',
          },
        }).catch(() => {
          return { success: false, error: 'Failed to send push notification' }
        })
      )
    }

    await this.recordReservationDeliveryResult(reservation.id, 'modification', notifications)
  }

  async sendReservationCancellation(reservation: any): Promise<void> {
    const notifications: Promise<NotificationResult>[] = []

    if (this.shouldSendEmail(reservation.customer) && reservation.customer.email) {
      const { subject, body } = this.buildReservationEmailContent(reservation, 'cancellation')
      notifications.push(
        this.sendEmail({
          to: reservation.customer.email,
          subject,
          body,
          data: {
            customerName: reservation.customer.name,
            castName: reservation.cast?.name,
            courseName: reservation.course?.name,
            startTime: reservation.startTime,
            reservationId: reservation.id,
          },
        }).catch(() => {
          return { success: false, error: 'Failed to send email' }
        })
      )
    }

    if (this.shouldSendSms(reservation.customer)) {
      const storeLabel = this.getStoreLabel(reservation)
      const smsMessage = `${storeLabel}より: ${this.formatDateTime(reservation.startTime)}の予約がキャンセルされました。`
      notifications.push(
        this.sendSMS({
          to: reservation.customer.phone,
          message: smsMessage,
        }).catch(() => {
          return { success: false, error: 'Failed to send SMS' }
        })
      )
    }

    if (this.shouldSendPush(reservation.customer)) {
      notifications.push(
        this.sendPush({
          userId: reservation.customer.id,
          title: '予約がキャンセルされました',
          body: `${reservation.cast?.name ?? 'キャスト'}との予約がキャンセルされました`,
          data: {
            reservationId: reservation.id,
            type: 'reservation_cancellation',
          },
        }).catch(() => {
          return { success: false, error: 'Failed to send push notification' }
        })
      )
    }

    await this.recordReservationDeliveryResult(reservation.id, 'cancellation', notifications)
  }

  async sendBulkNotifications(notifications: BulkNotification[]): Promise<NotificationResult[]> {
    const results: NotificationResult[] = []

    for (const notification of notifications) {
      try {
        let result: NotificationResult

        switch (notification.type) {
          case 'email':
            result = await this.sendEmail(notification.data)
            break
          case 'sms':
            result = await this.sendSMS(notification.data)
            break
          case 'push':
            result = await this.sendPush(notification.data)
            break
          default:
            result = { success: false, error: 'Unknown notification type' }
        }

        results.push(result)
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return results
  }

  private async sendEmail(data: any): Promise<NotificationResult> {
    try {
      const result = await emailClient.send(data)
      if (!result.success) {
        return { success: false, error: result.error || 'Failed to send email' }
      }
      return { success: true, notificationId: result.id }
    } catch (error) {
      logger.error(
        { errorType: error instanceof Error ? error.name : 'UnknownError' },
        'Email provider request failed'
      )
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      }
    }
  }

  private async sendSMS(data: any): Promise<NotificationResult> {
    try {
      const result = await smsClient.send(data)
      if (!result.success) {
        return { success: false, error: result.error || 'Failed to send SMS' }
      }
      return { success: true, notificationId: result.id }
    } catch (error) {
      throw error
    }
  }

  private async sendPush(data: any): Promise<NotificationResult> {
    try {
      const result = await pushClient.send(data)
      return { success: true, notificationId: result.id }
    } catch (error) {
      throw error
    }
  }

  private async recordReservationDeliveryResult(
    reservationId: string,
    event: 'confirmation' | 'modification' | 'cancellation',
    notifications: Promise<NotificationResult>[]
  ): Promise<void> {
    const results = await Promise.all(notifications)
    const failed = results.filter((result) => !result.success).length

    if (failed > 0) {
      logger.error(
        { reservationId, failed, attempted: results.length },
        `Reservation ${event} notification delivery failed`
      )
    }
  }

  private shouldSendEmail(customer: any): boolean {
    if (!customer) {
      return false
    }
    if (customer.emailNotificationEnabled === false) {
      return false
    }
    if (customer.preferences?.emailNotifications === false) {
      return false
    }
    return true
  }

  private shouldSendSms(customer: any): boolean {
    if (!customer?.phone) {
      return false
    }
    if (typeof customer.smsEnabled === 'boolean') {
      return customer.smsEnabled
    }
    return Boolean(customer?.preferences?.smsNotifications)
  }

  private shouldSendPush(customer: any): boolean {
    if (!customer) {
      return false
    }
    if (customer.preferences && 'pushNotifications' in customer.preferences) {
      return Boolean(customer.preferences.pushNotifications)
    }
    return false
  }

  private getStoreLabel(reservation: any): string {
    return reservation.store?.displayName ?? reservation.store?.name ?? 'サロン'
  }

  private buildReservationEmailContent(
    reservation: any,
    type: 'confirmation' | 'modification' | 'cancellation',
    oldReservation?: any
  ): { subject: string; body: string } {
    const storeLabel = this.getStoreLabel(reservation)
    const customerName = escapeHtmlText(String(reservation.customer?.name ?? 'お客様'))

    let subject: string
    let lead: string

    switch (type) {
      case 'modification':
        subject = 'ご予約内容が更新されました'
        lead = '下記のご予約内容が変更されました。新しい日時をご確認ください。'
        break
      case 'cancellation':
        subject = 'ご予約がキャンセルされました'
        lead = '下記のご予約はキャンセル済みです。直前のキャンセルの場合は店舗までご連絡ください。'
        break
      default:
        subject = 'ご予約が確定しました'
        lead = '下記の内容でご予約を承りました。ご来店をお待ちしております。'
        break
    }

    const list = this.buildReservationDetailList(reservation, oldReservation, type)
    const footer = `
      <p style="margin-top:16px; font-size:12px; color:#4b5563;">
        ご不明な点がございましたら、このメールにご返信いただくか、お電話でお問い合わせください。<br />
        自動送信メールのため、行き違いの場合はご容赦ください。
      </p>
    `

    const body = `
      <p>${customerName} 様</p>
      <p>${lead}</p>
      ${list}
      ${footer}
    `

    return {
      subject: `【${storeLabel}】${subject}`,
      body,
    }
  }

  private buildReservationDetailList(
    reservation: any,
    oldReservation?: any,
    type?: string
  ): string {
    const lines: string[] = []
    const startLabel = this.formatDateTime(reservation.startTime)
    const endLabel = reservation.endTime ? this.formatDateTime(reservation.endTime) : null
    lines.push(`日時: ${startLabel}${endLabel ? ` 〜 ${endLabel}` : ''}`)

    if (type === 'modification' && oldReservation) {
      const oldStart = this.formatDateTime(oldReservation.startTime)
      const oldEnd = oldReservation.endTime ? this.formatDateTime(oldReservation.endTime) : null
      lines.push(`変更前: ${oldStart}${oldEnd ? ` 〜 ${oldEnd}` : ''}`)
    }

    if (reservation.cast?.name) {
      lines.push(`担当キャスト: ${escapeHtmlText(String(reservation.cast.name))}`)
    }

    if (reservation.course?.name) {
      lines.push(`コース: ${escapeHtmlText(String(reservation.course.name))}`)
    }

    if (reservation.locationMemo) {
      lines.push(`待ち合わせ: ${escapeHtmlText(String(reservation.locationMemo))}`)
    }

    return `<ul>${lines.map((line) => `<li>${line}</li>`).join('')}</ul>`
  }

  private formatDateTime(date: Date): string {
    if (!date) {
      return ''
    }
    const value = date instanceof Date ? date : new Date(date)
    if (Number.isNaN(value.getTime())) {
      return ''
    }
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(value)
  }
}

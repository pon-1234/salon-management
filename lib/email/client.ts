/**
 * @design_doc   Email client for sending notifications
 * @related_to   notification/service.ts
 * @known_issues Provider health is configuration based and does not make a live Resend request
 */
import { Resend } from 'resend'
import { env } from '@/lib/config/env'
import logger from '@/lib/logger'

// 環境変数からAPIキーを取得
const resendClient = env.resend.apiKey ? new Resend(env.resend.apiKey) : null

// Note: In production, update this to use a verified domain email address
// For development, 'onboarding@resend.dev' is provided by Resend for testing
const FROM_EMAIL = env.resend.fromEmail

export const emailClient = {
  async send(data: {
    to: string
    subject: string
    template?: string // 今は未使用だが、将来のHTMLメール用に残す
    data?: any // 同上
    body?: string
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    if (env.outbound.deliveryMode === 'disabled') {
      logger.info('Email delivery skipped because outbound is disabled')
      return { success: false, error: 'Outbound delivery is disabled.' }
    }

    if (!resendClient || !env.resend.apiKey) {
      if (env.notification.mockEnabled) {
        logger.info('Email mock delivery completed')
        return {
          success: true,
          id: `email-mock-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        }
      }
      logger.error('Email provider is not configured.')
      return { success: false, error: 'RESEND_API_KEY is not configured.' }
    }

    try {
      const response = await resendClient.emails.send({
        from: FROM_EMAIL,
        to: data.to,
        subject: data.subject,
        // Support both text and HTML formats
        text: data.body?.replace(/<[^>]*>/g, '') || 'This is a default email body.',
        html: data.body || '<p>This is a default email body.</p>',
      })

      if (response.error) {
        logger.error({ provider: 'resend' }, 'Email provider rejected the request')
        return { success: false, error: 'Email provider rejected the request.' }
      }

      return {
        success: true,
        id: response.data?.id,
      }
    } catch (error) {
      logger.error(
        { provider: 'resend', errorType: error instanceof Error ? error.name : 'UnknownError' },
        'Email provider request failed'
      )
      return { success: false, error: 'Email provider request failed.' }
    }
  },
}

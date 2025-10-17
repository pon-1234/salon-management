/**
 * @design_doc   Email client for sending notifications
 * @related_to   notification/service.ts
 * @known_issues Mock implementation - replace with actual email service
 */
import { Resend } from 'resend'
import { env } from '@/lib/config/env'

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
    if (!resendClient || !env.resend.apiKey) {
      console.error('RESEND_API_KEY is not set. Skipping email sending.')
      // 開発環境でキーがない場合でもアプリケーション全体が停止しないようにする
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
        console.error('Failed to send email:', response.error)
        return { success: false, error: response.error.message }
      }

      return {
        success: true,
        id: response.data?.id,
      }
    } catch (error) {
      console.error('An exception occurred while sending email:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: errorMessage }
    }
  },
}

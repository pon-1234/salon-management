/**
 * @design_doc   Email client for sending notifications
 * @related_to   notification/service.ts
 * @known_issues Mock implementation - replace with actual email service
 */
import { Resend } from 'resend'

// 環境変数からAPIキーを取得
const resend = new Resend(process.env.RESEND_API_KEY)

// TODO: 'from'アドレスはResendで検証済みのドメインのメールアドレスにする必要があります
const FROM_EMAIL = 'onboarding@resend.dev'

export const emailClient = {
  async send(data: {
    to: string
    subject: string
    template?: string // 今は未使用だが、将来のHTMLメール用に残す
    data?: any // 同上
    body?: string
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set. Skipping email sending.')
      // 開発環境でキーがない場合でもアプリケーション全体が停止しないようにする
      return { success: false, error: 'RESEND_API_KEY is not configured.' }
    }

    try {
      const response = await resend.emails.send({
        from: FROM_EMAIL,
        to: data.to,
        subject: data.subject,
        // 現時点ではプレーンテキストの body を優先的に使用
        text: data.body || 'This is a default email body.',
        // 将来的には、template と data を使ってHTMLを生成する
        // html: `<div>${data.body}</div>`,
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

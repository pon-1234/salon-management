/**
 * @design_doc   SMS notification provider
 * @related_to   Notification service, SMS templates
 * @known_issues None currently
 */

export interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
}

export class SMSProvider {
  async sendSMS(
    to: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<SMSResult> {
    try {
      // Mock SMS sending - in production this would integrate with Twilio, AWS SNS, etc.
      console.log('Sending SMS:', { to, content, metadata })
      
      // Simulate phone number validation
      const phoneRegex = /^\+?[1-9]\d{1,14}$/
      const cleanPhone = to.replace(/[\s-]/g, '')
      
      if (!phoneRegex.test(cleanPhone)) {
        return {
          success: false,
          error: 'Invalid phone number format'
        }
      }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 150))

      // Mock success response
      return {
        success: true,
        messageId: `sms-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}
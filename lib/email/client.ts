/**
 * @design_doc   Email client for sending notifications
 * @related_to   notification/service.ts
 * @known_issues Mock implementation - replace with actual email service
 */
export const emailClient = {
  async send(data: {
    to: string
    subject: string
    template?: string
    data?: any
    body?: string
  }): Promise<{ success: boolean; id?: string }> {
    // Mock implementation
    console.log('Sending email:', { to: data.to, subject: data.subject })

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Return mock response
    return {
      success: true,
      id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }
  },
}

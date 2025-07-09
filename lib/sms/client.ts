/**
 * @design_doc   SMS client for sending notifications
 * @related_to   notification/service.ts
 * @known_issues Mock implementation - replace with actual SMS service (Twilio, etc.)
 */
export const smsClient = {
  async send(data: { to: string; message: string }): Promise<{ success: boolean; id?: string }> {
    // Mock implementation
    console.log('Sending SMS:', { to: data.to, message: data.message })

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Return mock response
    return {
      success: true,
      id: `sms-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }
  },
}

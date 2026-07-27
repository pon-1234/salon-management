/**
 * @design_doc   Push notification client for sending notifications
 * @related_to   notification/service.ts
 * @known_issues Mock implementation - replace with actual push service (FCM, APNs, etc.)
 */
import logger from '@/lib/logger'
import { env } from '@/lib/config/env'

export const pushClient = {
  async send(data: {
    userId: string
    title: string
    body: string
    data?: any
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    if (env.outbound.deliveryMode === 'disabled') {
      logger.info('Push delivery skipped because outbound is disabled')
      return { success: false, error: 'Outbound delivery is disabled.' }
    }

    // Mock implementation
    logger.info('Sending push notification:', {
      userId: data.userId,
      title: data.title,
      body: data.body,
    })

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Return mock response
    return {
      success: true,
      id: `push-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }
  },
}

/**
 * @design_doc   Push notification client for sending notifications
 * @related_to   notification/service.ts
 * @known_issues No push provider is configured; calls fail explicitly
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

    logger.warn('Push delivery provider is not configured.')
    return { success: false, error: 'Push delivery provider is not configured.' }
  },
}

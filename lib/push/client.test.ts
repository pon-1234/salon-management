/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md B-3
 * @related_to   notification/service.ts: consumes explicit push delivery failures
 * @known_issues A provider adapter must be added before push delivery can be enabled
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import logger from '@/lib/logger'
import { pushClient } from './client'

describe('Push Client without a configured provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    ['regular message', 'user-1', 'Title', 'Body'],
    ['empty content', 'user-2', '', ''],
    ['unicode content', 'user-3', '予約通知', 'こんにちは 🚀'],
  ])('fails explicitly for %s', async (_label, userId, title, body) => {
    const result = await pushClient.send({ userId, title, body })

    expect(result).toEqual({
      success: false,
      error: 'Push delivery provider is not configured.',
    })
    expect(logger.warn).toHaveBeenCalledWith('Push delivery provider is not configured.')
    expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).not.toContain(userId)
    if (body) {
      expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).not.toContain(body)
    }
  })
})

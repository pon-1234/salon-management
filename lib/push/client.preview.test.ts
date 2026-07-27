/**
 * @design_doc   Production-like preview environments must not emit push notifications or PII logs
 * @related_to   client.ts, config/env.ts
 * @known_issues The live push transport remains a local mock until a provider is approved
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const testConfig = vi.hoisted(() => ({
  env: {
    runtimeMode: 'preview',
    outbound: { deliveryMode: 'disabled' },
  },
}))

vi.mock('@/lib/config/env', () => testConfig)

import logger from '@/lib/logger'
import { pushClient } from './client'

describe('Push Client preview safety', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('short-circuits without logging recipient or message content', async () => {
    const result = await pushClient.send({
      userId: 'private-customer-id',
      title: 'Private title',
      body: 'Private notification body',
    })

    expect(result).toEqual({
      success: false,
      error: 'Outbound delivery is disabled.',
    })
    expect(logger.info).toHaveBeenCalledWith('Push delivery skipped because outbound is disabled')
    const serializedLogs = JSON.stringify(vi.mocked(logger.info).mock.calls)
    expect(serializedLogs).not.toContain('private-customer-id')
    expect(serializedLogs).not.toContain('Private notification body')
  })
})

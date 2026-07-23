/**
 * @design_doc   Production-like preview environments must not call LINE Messaging API
 * @related_to   client.ts, notification/cast-service.ts, config/env.ts
 * @known_issues Network-level egress denial remains a deployment responsibility
 */
import { describe, expect, it, vi } from 'vitest'

const testConfig = vi.hoisted(() => ({
  env: {
    runtimeMode: 'preview',
    outbound: { deliveryMode: 'disabled' },
    line: {
      messaging: {
        enabled: false,
        channelAccessToken: '',
        channelSecret: '',
        defaultUserId: '',
      },
    },
  },
}))

vi.mock('@/lib/config/env', () => testConfig)

import { LineMessagingClient } from './client'

describe('LINE client preview safety', () => {
  it('short-circuits even if a caller injects enabled provider configuration', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true })
    const client = new LineMessagingClient({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      config: {
        enabled: true,
        channelAccessToken: 'must-not-be-used',
        defaultUserId: 'private-line-user',
      },
    })

    expect(client.isConfigured()).toBe(false)
    await client.pushText('private-line-user', 'private-message')
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})

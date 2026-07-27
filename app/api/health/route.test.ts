/**
 * @design_doc   Operational readiness endpoint exposes only secret-free dependency statuses
 * @related_to   lib/operations/readiness.ts, deploy/xserver-vps
 * @known_issues Third-party delivery is verified separately from this lightweight endpoint
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getOperationalReadiness } from '@/lib/operations/readiness'
import { GET } from './route'

vi.mock('@/lib/operations/readiness', () => ({
  getOperationalReadiness: vi.fn(),
}))

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 when every required operational dependency is ready', async () => {
    vi.mocked(getOperationalReadiness).mockResolvedValue({
      ready: true,
      checks: {
        database: 'ready',
        storage: 'ready',
        notifications: 'ready',
        line: 'disabled',
      },
    })

    const response = await GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      status: 'ready',
      checks: {
        database: 'ready',
        storage: 'ready',
        notifications: 'ready',
        line: 'disabled',
      },
    })
  })

  it('returns 503 without exposing credentials, errors, or paths when a check fails', async () => {
    vi.mocked(getOperationalReadiness).mockResolvedValue({
      ready: false,
      checks: {
        database: 'not_ready',
        storage: 'ready',
        notifications: 'ready',
        line: 'ready',
      },
    })

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload).toEqual({
      status: 'not_ready',
      checks: {
        database: 'not_ready',
        storage: 'ready',
        notifications: 'ready',
        line: 'ready',
      },
    })
    expect(JSON.stringify(payload)).not.toMatch(/api[_-]?key|secret/i)
    expect(JSON.stringify(payload)).not.toContain('/srv/')
  })
})

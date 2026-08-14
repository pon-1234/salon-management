/**
 * @design_doc   Playwright cold-route warmup reliability contract
 * @related_to   e2e/global-setup.ts and scripts/ci.sh browser quality gate
 * @known_issues None
 */
import { describe, expect, it, vi } from 'vitest'

import { warmBrowserJourneyMutation, warmBrowserJourneyRoute } from '../e2e/global-setup'

function response(ok: boolean, status: number) {
  return {
    ok: () => ok,
    status: () => status,
  }
}

describe('Playwright browser-journey route warmup', () => {
  it('uses a 120-second request timeout and retries a transient transport failure', async () => {
    const get = vi
      .fn()
      .mockRejectedValueOnce(new Error('socket hang up'))
      .mockResolvedValueOnce(response(true, 200))

    await warmBrowserJourneyRoute({ get }, '/ikebukuro/booking')

    expect(get).toHaveBeenCalledTimes(2)
    expect(get).toHaveBeenNthCalledWith(1, '/ikebukuro/booking', { timeout: 120_000 })
    expect(get).toHaveBeenNthCalledWith(2, '/ikebukuro/booking', { timeout: 120_000 })
  })

  it('warms the age-verification mutation with a bounded POST request', async () => {
    const post = vi.fn().mockResolvedValue(response(true, 204))

    await warmBrowserJourneyMutation({ post }, '/api/age-verification')

    expect(post).toHaveBeenCalledOnce()
    expect(post).toHaveBeenCalledWith('/api/age-verification', { timeout: 120_000 })
  })

  it('fails immediately on a non-success response without retrying', async () => {
    const get = vi.fn().mockResolvedValue(response(false, 503))

    await expect(warmBrowserJourneyRoute({ get }, '/ikebukuro/services')).rejects.toThrow(
      'E2E route warmup failed for /ikebukuro/services with status 503.'
    )
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('fails closed after three transport attempts without exposing the transport error', async () => {
    const get = vi.fn().mockRejectedValue(new Error('socket hang up at secret.internal'))

    const error = await warmBrowserJourneyRoute({ get }, '/admin/dashboard').catch(
      (cause: unknown) => cause
    )

    expect(get).toHaveBeenCalledTimes(3)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe(
      'E2E route warmup failed for /admin/dashboard after 3 transport attempts.'
    )
    expect((error as Error).message).not.toContain('secret.internal')
  })
})

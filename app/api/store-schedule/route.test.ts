/**
 * @design_doc   Public schedule endpoint fails closed when availability cannot be verified
 * @related_to   getStoreScheduleDays supplies anonymous blocked time ranges
 * @known_issues The endpoint intentionally exposes exact blocked start/end times
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  ensureStoreId: vi.fn(),
  resolveStoreId: vi.fn(),
  getStoreScheduleDays: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('@/lib/store/server', () => ({
  ensureStoreId: mocks.ensureStoreId,
  resolveStoreId: mocks.resolveStoreId,
}))
vi.mock('@/lib/store/public-schedule', () => ({
  getStoreScheduleDays: mocks.getStoreScheduleDays,
}))
vi.mock('@/lib/logger', () => ({
  default: { error: mocks.loggerError },
}))

import { GET } from './route'

describe('store schedule route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveStoreId.mockResolvedValue('store-a')
    mocks.ensureStoreId.mockResolvedValue('store-a')
  })

  it('returns 500 instead of presenting an unknown schedule as empty availability', async () => {
    mocks.getStoreScheduleDays.mockRejectedValue(new Error('database unavailable'))

    const response = await GET(
      new NextRequest('http://localhost/api/store-schedule?storeId=store-a&days=1')
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Failed to load schedule' })
  })
})

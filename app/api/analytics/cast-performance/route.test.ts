/**
 * @design_doc   Store-authorized cast performance analytics endpoint contract
 * @related_to   GET /api/analytics/cast-performance and getCastPerformanceReport
 * @known_issues None
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireAnalyticsAccess: vi.fn(),
  getCastPerformanceReport: vi.fn(),
}))

vi.mock('@/lib/analytics/server/access', () => ({
  requireAnalyticsAccess: mocks.requireAnalyticsAccess,
}))

vi.mock('@/lib/analytics/server/cast-performance', () => ({
  getCastPerformanceReport: mocks.getCastPerformanceReport,
}))

import { GET } from './route'

const request = (query: string) =>
  new NextRequest(`http://localhost/api/analytics/cast-performance?${query}`)

describe('GET /api/analytics/cast-performance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAnalyticsAccess.mockResolvedValue({ storeId: 'ikebukuro', error: null })
  })

  it('returns the authorization response before reading cast analytics', async () => {
    const forbidden = NextResponse.json({ error: 'forbidden' }, { status: 403 })
    mocks.requireAnalyticsAccess.mockResolvedValueOnce({ storeId: 'ikebukuro', error: forbidden })

    const response = await GET(request('castId=cast-1&year=2026&month=8&storeId=ikebukuro'))

    expect(response.status).toBe(403)
    expect(mocks.getCastPerformanceReport).not.toHaveBeenCalled()
  })

  it.each([
    ['year=2026&month=8', 'castId'],
    ['castId=cast-1&year=x&month=8', 'year'],
    ['castId=cast-1&year=0&month=8', 'year'],
    ['castId=cast-1&year=2026&month=13', 'month'],
  ])('rejects invalid parameters in %s', async (query, field) => {
    const response = await GET(request(query))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining(field) })
    expect(mocks.getCastPerformanceReport).not.toHaveBeenCalled()
  })

  it('passes the authorized store and requested cast/month to the report builder', async () => {
    const report = {
      cast: { id: 'cast-1', name: '池袋キャスト' },
      period: { year: 2026, month: 8, timeZone: 'Asia/Tokyo' },
    }
    mocks.getCastPerformanceReport.mockResolvedValueOnce(report)

    const response = await GET(request('castId=cast-1&year=2026&month=8&storeId=ikebukuro'))

    expect(response.status).toBe(200)
    expect(mocks.getCastPerformanceReport).toHaveBeenCalledWith(2026, 8, 'cast-1', 'ikebukuro')
    await expect(response.json()).resolves.toEqual(report)
  })

  it('does not expose a cast that is outside the authorized store', async () => {
    mocks.getCastPerformanceReport.mockResolvedValueOnce(null)

    const response = await GET(request('castId=cast-other&year=2026&month=8&storeId=ikebukuro'))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'キャストが見つかりません。' })
  })

  it('returns an explicit failure instead of an empty report when aggregation fails', async () => {
    mocks.getCastPerformanceReport.mockRejectedValueOnce(new Error('database unavailable'))

    const response = await GET(request('castId=cast-1&year=2026&month=8&storeId=ikebukuro'))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: '就業成績の集計に失敗しました。' })
  })
})

/**
 * @design_doc   refactor-instructions.md Phase 6 D-11 analytics real-data connection
 * @related_to   route.ts, getStaffPerformanceReport: staff performance API wiring
 * @known_issues Baseline analytics coverage is incremental; see refactor-baseline.md
 */
import { describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth/utils'
import { getStaffPerformanceReport } from '@/lib/analytics/server'
import { GET } from './route'

vi.mock('@/lib/auth/utils', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/analytics/server', () => ({
  getStaffPerformanceReport: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
  },
}))

describe('GET /api/analytics/staff-performance', () => {
  it('returns the admin guard response before reading analytics data', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(
      NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    )

    const response = await GET(
      new NextRequest('http://localhost/api/analytics/staff-performance?year=2026&month=7')
    )
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({ error: '認証が必要です' })
    expect(getStaffPerformanceReport).not.toHaveBeenCalled()
  })

  it('passes year, month, and storeId to the staff performance report builder', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(null)
    vi.mocked(getStaffPerformanceReport).mockResolvedValueOnce([])

    const response = await GET(
      new NextRequest(
        'http://localhost/api/analytics/staff-performance?year=2026&month=7&storeId=ginza'
      )
    )

    expect(response.status).toBe(200)
    expect(getStaffPerformanceReport).toHaveBeenCalledWith(2026, 7, 'ginza')
  })
})

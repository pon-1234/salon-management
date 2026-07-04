/**
 * @design_doc   refactor-instructions.md Phase 6 analytics authorization coverage
 * @related_to   route.ts, requireAdmin
 * @known_issues Covers monthly route as representative analytics authorization pattern
 */
import { describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth/utils'
import { GET } from './route'

vi.mock('@/lib/auth/utils', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/analytics/server', () => ({
  getMonthlyAnalytics: vi.fn().mockResolvedValue({ rows: [] }),
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
  },
}))

describe('GET /api/analytics/monthly', () => {
  it('returns the admin guard response before reading analytics data', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(
      NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    )

    const response = await GET(new NextRequest('http://localhost/api/analytics/monthly?year=2026'))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({ error: '認証が必要です' })
  })
})

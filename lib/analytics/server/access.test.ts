/**
 * @design_doc   Multi-store analytics authorization boundary
 * @related_to   Analytics API routes use this guard before reading store reports
 * @known_issues The fallback store remains only for legacy URLs without storeId
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const authMocks = vi.hoisted(() => ({ requireAdmin: vi.fn() }))

vi.mock('@/lib/auth/utils', () => authMocks)

import { requireAnalyticsAccess } from './access'

describe('requireAnalyticsAccess', () => {
  beforeEach(() => {
    authMocks.requireAdmin.mockReset()
    authMocks.requireAdmin.mockResolvedValue(null)
  })

  it('requires analytics read permission for the explicitly requested store', async () => {
    const result = await requireAnalyticsAccess(
      new NextRequest('http://localhost/api/analytics/monthly?storeId=GINZA&year=2026')
    )

    expect(result).toEqual({ storeId: 'ginza', error: null })
    expect(authMocks.requireAdmin).toHaveBeenCalledWith({
      permissions: 'analytics:read',
      storeId: 'ginza',
    })
  })

  it('binds legacy URLs without storeId to the configured fallback store', async () => {
    const result = await requireAnalyticsAccess(
      new NextRequest('http://localhost/api/analytics/monthly?year=2026')
    )

    expect(result.storeId).toBe('ikebukuro')
    expect(authMocks.requireAdmin).toHaveBeenCalledWith({
      permissions: 'analytics:read',
      storeId: 'ikebukuro',
    })
  })

  it('returns the authorization response without allowing report execution', async () => {
    const forbidden = NextResponse.json({ error: 'forbidden' }, { status: 403 })
    authMocks.requireAdmin.mockResolvedValue(forbidden)

    const result = await requireAnalyticsAccess(
      new NextRequest('http://localhost/api/analytics/monthly?storeId=ginza')
    )

    expect(result).toEqual({ storeId: 'ginza', error: forbidden })
  })
})

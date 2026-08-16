/**
 * @design_doc   Multi-store analytics authorization boundary
 * @related_to   Analytics API routes use this guard before reading store reports
 * @known_issues The fallback store remains only for legacy URLs without storeId
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const authMocks = vi.hoisted(() => ({ requireAdmin: vi.fn() }))
const storeMocks = vi.hoisted(() => ({ resolveStoreId: vi.fn(), ensureStoreId: vi.fn() }))

vi.mock('@/lib/auth/utils', () => authMocks)
vi.mock('@/lib/store/server', () => storeMocks)

import { requireAnalyticsAccess } from './access'

describe('requireAnalyticsAccess', () => {
  beforeEach(() => {
    authMocks.requireAdmin.mockReset()
    authMocks.requireAdmin.mockResolvedValue(null)
    storeMocks.resolveStoreId.mockReset()
    storeMocks.resolveStoreId.mockResolvedValue(null)
    storeMocks.ensureStoreId.mockReset()
    storeMocks.ensureStoreId.mockImplementation(async (storeId: string) => storeId)
  })

  it('requires analytics read permission for the explicitly requested store', async () => {
    storeMocks.resolveStoreId.mockResolvedValueOnce('ginza')
    const request = new NextRequest(
      'http://localhost/api/analytics/monthly?storeId=GINZA&year=2026'
    )

    const result = await requireAnalyticsAccess(request)

    expect(result).toEqual({ storeId: 'ginza', error: null })
    expect(storeMocks.resolveStoreId).toHaveBeenCalledWith(request)
    expect(storeMocks.ensureStoreId).toHaveBeenCalledWith('ginza')
    expect(authMocks.requireAdmin).toHaveBeenCalledWith({
      permissions: 'analytics:read',
      storeId: 'ginza',
    })
  })

  it('canonicalizes a requested store slug before authorizing the report', async () => {
    storeMocks.resolveStoreId.mockResolvedValueOnce('ikebukuro')
    storeMocks.ensureStoreId.mockResolvedValueOnce('uat-ikebukuro')
    const request = new NextRequest('http://localhost/api/analytics/daily-report?storeId=ikebukuro')

    const result = await requireAnalyticsAccess(request)

    expect(result).toEqual({ storeId: 'uat-ikebukuro', error: null })
    expect(storeMocks.resolveStoreId).toHaveBeenCalledWith(request)
    expect(storeMocks.ensureStoreId).toHaveBeenCalledWith('ikebukuro')
    expect(authMocks.requireAdmin).toHaveBeenCalledWith({
      permissions: 'analytics:read',
      storeId: 'uat-ikebukuro',
    })
  })

  it('honors the store query alias through the shared resolver', async () => {
    storeMocks.resolveStoreId.mockResolvedValueOnce('shinjuku')
    storeMocks.ensureStoreId.mockResolvedValueOnce('store-shinjuku')
    const request = new NextRequest(
      'http://localhost/api/analytics/monthly?store=SHINJUKU&year=2026'
    )

    const result = await requireAnalyticsAccess(request)

    expect(result).toEqual({ storeId: 'store-shinjuku', error: null })
    expect(storeMocks.resolveStoreId).toHaveBeenCalledWith(request)
    expect(storeMocks.ensureStoreId).toHaveBeenCalledWith('shinjuku')
    expect(authMocks.requireAdmin).toHaveBeenCalledWith({
      permissions: 'analytics:read',
      storeId: 'store-shinjuku',
    })
  })

  it('honors the store header through the shared resolver', async () => {
    storeMocks.resolveStoreId.mockResolvedValueOnce('ginza')
    storeMocks.ensureStoreId.mockResolvedValueOnce('store-ginza')
    const request = new NextRequest('http://localhost/api/analytics/monthly?year=2026', {
      headers: { 'x-store-id': 'GINZA' },
    })

    const result = await requireAnalyticsAccess(request)

    expect(result).toEqual({ storeId: 'store-ginza', error: null })
    expect(storeMocks.resolveStoreId).toHaveBeenCalledWith(request)
    expect(storeMocks.ensureStoreId).toHaveBeenCalledWith('ginza')
    expect(authMocks.requireAdmin).toHaveBeenCalledWith({
      permissions: 'analytics:read',
      storeId: 'store-ginza',
    })
  })

  it('binds legacy URLs without storeId to the configured fallback store', async () => {
    storeMocks.ensureStoreId.mockResolvedValueOnce('uat-ikebukuro')
    const request = new NextRequest('http://localhost/api/analytics/monthly?year=2026')

    const result = await requireAnalyticsAccess(request)

    expect(result.storeId).toBe('uat-ikebukuro')
    expect(storeMocks.resolveStoreId).toHaveBeenCalledWith(request)
    expect(storeMocks.ensureStoreId).toHaveBeenCalledWith('ikebukuro')
    expect(authMocks.requireAdmin).toHaveBeenCalledWith({
      permissions: 'analytics:read',
      storeId: 'uat-ikebukuro',
    })
  })

  it('returns the authorization response without allowing report execution', async () => {
    const forbidden = NextResponse.json({ error: 'forbidden' }, { status: 403 })
    authMocks.requireAdmin.mockResolvedValue(forbidden)
    storeMocks.resolveStoreId.mockResolvedValueOnce('ginza')

    const result = await requireAnalyticsAccess(
      new NextRequest('http://localhost/api/analytics/monthly?storeId=ginza')
    )

    expect(result).toEqual({ storeId: 'ginza', error: forbidden })
  })
})

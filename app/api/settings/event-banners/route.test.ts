/**
 * @design_doc   Store event banner tenant-bound authorization and mutation contract
 * @related_to   route.ts reads and replaces only banners owned by the requested store
 * @known_issues Asset upload authorization is handled by the separate upload endpoint
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  resolveStoreId: vi.fn(),
  ensureStoreId: vi.fn(),
  shouldUseMockFallbacks: vi.fn(() => false),
  storeFindUnique: vi.fn(),
  bannerFindMany: vi.fn(),
  bannerCreateMany: vi.fn(),
  transaction: vi.fn(),
  txBannerDeleteMany: vi.fn(),
  txBannerUpdate: vi.fn(),
  txBannerCreate: vi.fn(),
}))

vi.mock('@/lib/auth/utils', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/store/server', () => ({
  resolveStoreId: mocks.resolveStoreId,
  ensureStoreId: mocks.ensureStoreId,
}))
vi.mock('@/lib/config/feature-flags', () => ({
  shouldUseMockFallbacks: mocks.shouldUseMockFallbacks,
}))
vi.mock('@/lib/store/public-fallbacks', () => ({
  getDefaultBanners: vi.fn(() => [
    {
      title: 'Demo banner',
      imageUrl: '/demo.jpg',
      mobileImageUrl: null,
      link: null,
    },
  ]),
}))
vi.mock('@/lib/db', () => ({
  db: {
    store: { findUnique: mocks.storeFindUnique },
    storeEventBanner: {
      findMany: mocks.bannerFindMany,
      createMany: mocks.bannerCreateMany,
    },
    $transaction: mocks.transaction,
  },
}))

import { GET, PUT } from './route'

function request(method: 'GET' | 'PUT', body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/settings/event-banners?storeId=store-a', {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  })
}

describe('event banner settings route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdmin.mockResolvedValue(null)
    mocks.resolveStoreId.mockResolvedValue('store-a')
    mocks.ensureStoreId.mockResolvedValue('store-a')
    mocks.shouldUseMockFallbacks.mockReturnValue(false)
    mocks.storeFindUnique.mockResolvedValue({ slug: 'store-a' })
    mocks.bannerFindMany.mockResolvedValue([
      {
        id: 'banner-a',
        storeId: 'store-a',
        title: 'Banner',
        imageUrl: '/banner.jpg',
        displayOrder: 0,
        isActive: true,
      },
    ])
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        storeEventBanner: {
          deleteMany: mocks.txBannerDeleteMany,
          update: mocks.txBannerUpdate,
          create: mocks.txBannerCreate,
        },
      })
    )
  })

  it('requires settings:read permission and assignment for the requested store', async () => {
    const response = await GET(request('GET'))

    expect(response.status).toBe(200)
    expect(mocks.requireAdmin).toHaveBeenCalledWith({
      permissions: 'settings:read',
      storeId: 'store-a',
    })
  })

  it('rejects an update that supplies a banner ID outside the requested store', async () => {
    const response = await PUT(
      request('PUT', {
        banners: [{ id: 'foreign-banner', title: 'Foreign', imageUrl: '/foreign.jpg' }],
      })
    )

    expect(response.status).toBe(400)
    expect(mocks.requireAdmin).toHaveBeenCalledWith({
      permissions: 'settings:update',
      storeId: 'store-a',
    })
    expect(mocks.transaction).not.toHaveBeenCalled()
    expect(mocks.txBannerUpdate).not.toHaveBeenCalled()
  })

  it('does not persist demo banners when production fallbacks are disabled', async () => {
    mocks.bannerFindMany.mockResolvedValue([])

    const response = await GET(request('GET'))

    expect(response.status).toBe(200)
    expect(mocks.bannerCreateMany).not.toHaveBeenCalled()
  })

  it('allows staff to persist deletion of the final banner', async () => {
    mocks.bannerFindMany
      .mockResolvedValueOnce([
        {
          id: 'banner-a',
          storeId: 'store-a',
          title: 'Banner',
          imageUrl: '/banner.jpg',
          displayOrder: 0,
          isActive: true,
        },
      ])
      .mockResolvedValueOnce([])

    const response = await PUT(request('PUT', { banners: [] }))

    expect(response.status).toBe(200)
    expect(mocks.txBannerDeleteMany).toHaveBeenCalledWith({
      where: { storeId: 'store-a', id: { in: ['banner-a'] } },
    })
    await expect(response.json()).resolves.toMatchObject({ data: [] })
  })
})

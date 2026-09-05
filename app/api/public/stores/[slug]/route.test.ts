/**
 * @design_doc   Public store API privacy requirements
 * @related_to   route.ts, Review: public store payload construction
 * @known_issues None currently
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/lib/db'
import { fetchPublicStoreHomeData } from '@/lib/store/public-api'
import { GET } from './route'

const envMock = vi.hoisted(() => ({ useMockFallbacks: false }))

vi.mock('@/lib/config/env', () => ({
  env: {
    isProduction: true,
    runtimeMode: 'preview',
    featureFlags: envMock,
  },
}))

vi.mock('@/lib/db', () => ({
  db: {
    store: {
      findFirst: vi.fn(),
    },
    cast: {
      findMany: vi.fn(),
    },
    castSchedule: {
      findMany: vi.fn(),
    },
    review: {
      findMany: vi.fn(),
    },
    storeEventBanner: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
  },
}))

describe('GET /api/public/stores/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    envMock.useMockFallbacks = false
    vi.mocked(db.store.findFirst).mockResolvedValue({
      id: 'store-1',
      slug: 'test-store',
      name: 'Test Store',
      displayName: null,
      address: null,
      phone: null,
      email: null,
      isActive: true,
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
      updatedAt: new Date('2026-07-01T00:00:00.000Z'),
      storeSettings: null,
    } as never)
    vi.mocked(db.cast.findMany).mockResolvedValue([])
    vi.mocked(db.castSchedule.findMany).mockResolvedValue([])
    vi.mocked(db.review.findMany).mockResolvedValue([])
    vi.mocked(db.storeEventBanner.findMany).mockResolvedValue([])
  })

  it('queries only published reviews for the public payload', async () => {
    const response = await GET(new Request('http://localhost/api/public/stores/test-store'), {
      params: Promise.resolve({ slug: 'test-store' }),
    })

    expect(response.status).toBe(200)
    expect(db.review.findMany).toHaveBeenCalledWith({
      where: {
        status: 'published',
        cast: {
          storeId: 'store-1',
          employmentStatus: 'active',
        },
      },
      include: {
        cast: true,
        customer: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    })
    expect(db.store.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: 'test-store', isActive: true } })
    )
    for (const [args] of vi.mocked(db.cast.findMany).mock.calls) {
      expect(args?.where).toMatchObject({ employmentStatus: 'active' })
    }
    for (const [args] of vi.mocked(db.castSchedule.findMany).mock.calls) {
      expect(args?.where?.cast).toMatchObject({ employmentStatus: 'active' })
    }
  })

  it('uses the same database payload for the route and Server Component data without self-fetching', async () => {
    const globalFetch = vi.fn().mockRejectedValue(new Error('Basic Auth gateway returned 404'))
    vi.stubGlobal('fetch', globalFetch)
    const cast = {
      id: 'cast-1',
      name: '公開キャスト',
      age: 24,
      height: 160,
      bust: 'C',
      waist: 58,
      hip: 86,
      type: 'test',
      image: '/cast-1.jpg',
      images: ['/cast-1.jpg'],
      panelDesignationRank: 1,
      regularDesignationRank: 2,
      netReservation: true,
      workStatus: '出勤',
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
    }
    vi.mocked(db.cast.findMany).mockResolvedValue([cast] as never)
    vi.mocked(db.castSchedule.findMany).mockResolvedValue([
      {
        castId: cast.id,
        cast,
        startTime: new Date('2026-07-20T10:00:00.000Z'),
        endTime: new Date('2026-07-20T12:00:00.000Z'),
      },
    ] as never)
    vi.mocked(db.review.findMany).mockResolvedValue([
      {
        id: 'review-1',
        castId: cast.id,
        cast,
        customer: { name: '確認利用者' },
        rating: 5,
        comment: '公開済み口コミ',
        createdAt: new Date('2026-07-19T00:00:00.000Z'),
      },
    ] as never)
    vi.mocked(db.storeEventBanner.findMany).mockResolvedValue([
      {
        id: 'banner-1',
        title: '確認用バナー',
        imageUrl: '/banner.jpg',
        mobileImageUrl: null,
        link: null,
      },
    ] as never)

    const pageData = await fetchPublicStoreHomeData('test-store')
    const response = await GET(new Request('http://localhost/api/public/stores/test-store'), {
      params: Promise.resolve({ slug: 'test-store' }),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual(JSON.parse(JSON.stringify(pageData)))
    expect(pageData?.store.slug).toBe('test-store')
    expect(pageData?.highlights.ranking).toHaveLength(1)
    expect(pageData?.reviews).toHaveLength(1)
    expect(pageData?.banners).toHaveLength(1)
    expect(globalFetch).not.toHaveBeenCalled()
  })

  it('returns 404 instead of fabricated data for a missing store in production mode', async () => {
    vi.mocked(db.store.findFirst).mockResolvedValue(null)
    const globalFetch = vi.fn().mockRejectedValue(new Error('Basic Auth gateway returned 404'))
    vi.stubGlobal('fetch', globalFetch)

    const response = await GET(new Request('http://localhost/api/public/stores/ikebukuro'), {
      params: Promise.resolve({ slug: 'ikebukuro' }),
    })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Store not found' })
    await expect(fetchPublicStoreHomeData('ikebukuro')).resolves.toBeNull()
    expect(globalFetch).not.toHaveBeenCalled()
  })

  it('returns 404 when an inactive store leaks through a database mock', async () => {
    vi.mocked(db.store.findFirst).mockResolvedValue({
      id: 'inactive-store',
      slug: 'ikebukuro',
      name: 'Inactive',
      isActive: false,
      storeSettings: null,
    } as never)

    const response = await GET(new Request('http://localhost/api/public/stores/ikebukuro'), {
      params: Promise.resolve({ slug: 'ikebukuro' }),
    })

    expect(response.status).toBe(404)
    expect(db.cast.findMany).not.toHaveBeenCalled()
  })

  it('returns 503 instead of fabricated data when the database fails in production mode', async () => {
    vi.mocked(db.store.findFirst).mockRejectedValue(new Error('database unavailable'))

    const response = await GET(new Request('http://localhost/api/public/stores/ikebukuro'), {
      params: Promise.resolve({ slug: 'ikebukuro' }),
    })

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: 'Service unavailable' })
  })
})

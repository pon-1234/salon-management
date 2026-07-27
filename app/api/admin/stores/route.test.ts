/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md database-backed multi-store administrator UAT
 * @related_to   route.ts returns only active stores authorized for the current administrator
 * @known_issues Database access is mocked; PostgreSQL policy behavior is covered by integration rehearsal
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'

import { db } from '@/lib/db'
import { GET } from './route'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth/config', () => ({ authOptions: {} }))
vi.mock('@/lib/db', () => ({
  db: {
    store: {
      findMany: vi.fn(),
    },
  },
}))

const createdAt = new Date('2026-07-20T00:00:00.000Z')

function store(id: string, name: string, isActive = true) {
  return {
    id,
    slug: id,
    name,
    displayName: name,
    address: `[UAT] ${name} address`,
    phone: '00000000000',
    email: `${id}@preview-uat.invalid`,
    isActive,
    createdAt,
    updatedAt: createdAt,
    storeSettings: {
      businessHours: '10:00-24:00',
      welfareExpenseRate: 10,
      marketingChannels: ['[UAT] WEB'],
    },
  }
}

function request(query = '') {
  return new NextRequest(`http://localhost/api/admin/stores${query}`)
}

describe('GET /api/admin/stores', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires an authenticated administrator before reading the store catalog', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const response = await GET(request())

    expect(response.status).toBe(401)
    expect(db.store.findMany).not.toHaveBeenCalled()
  })

  it('returns every active database store to a super administrator', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: 'super-1',
        role: 'admin',
        adminRole: 'super_admin',
        permissions: ['*'],
        storeIds: [],
      },
    } as never)
    vi.mocked(db.store.findMany).mockResolvedValue([
      store('uat-ikebukuro', '[UAT] 池袋確認店'),
      store('uat-osaka', '[UAT] 大阪確認店'),
      store('uat-archived', '[UAT] 無効店舗', false),
    ] as never)

    const response = await GET(request())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.stores.map(({ id }: { id: string }) => id)).toEqual([
      'uat-ikebukuro',
      'uat-osaka',
    ])
    expect(payload.stores[0]).toEqual(
      expect.objectContaining({
        id: 'uat-ikebukuro',
        displayName: '[UAT] 池袋確認店',
        openingHours: {
          weekday: { open: '10:00', close: '00:00' },
          weekend: { open: '10:00', close: '00:00' },
        },
      })
    )
    expect(db.store.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } })
    )
  })

  it('queries assignments and fails closed if a manager query returns an unassigned store', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: 'manager-1',
        role: 'admin',
        adminRole: 'manager',
        permissions: ['reservation:read'],
        storeIds: ['uat-ikebukuro'],
      },
    } as never)
    vi.mocked(db.store.findMany).mockResolvedValue([
      store('uat-ikebukuro', '[UAT] 池袋確認店'),
      store('uat-osaka', '[UAT] 大阪確認店'),
    ] as never)

    const response = await GET(request())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.stores.map(({ id }: { id: string }) => id)).toEqual(['uat-ikebukuro'])
    expect(db.store.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          adminAssignments: { some: { adminId: 'manager-1' } },
        },
      })
    )
  })

  it('returns 403 before database access when a manager requests another store', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: 'manager-1',
        role: 'admin',
        adminRole: 'manager',
        permissions: ['reservation:read'],
        storeIds: ['uat-ikebukuro'],
      },
    } as never)

    const response = await GET(request('?storeId=uat-osaka'))

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'この店舗を操作する権限がありません' })
    expect(db.store.findMany).not.toHaveBeenCalled()
  })
})

/**
 * @design_doc   Admin settlement payment history authorization and store isolation boundary
 * @related_to   app/api/admin/cast/settlements/payments/route.ts, requireAdmin, settlement server
 * @known_issues None
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { listSettlementPayments } from '@/lib/settlement/server'
import { GET } from './route'

vi.mock('@/lib/auth/utils', () => ({
  requireAdmin: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('@/lib/db', () => ({
  db: {
    store: {
      findUnique: vi.fn(() => Promise.resolve({ id: 'ginza' })),
    },
    cast: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/lib/settlement/server', () => ({
  listSettlementPayments: vi.fn(),
}))

describe('GET /api/admin/cast/settlements/payments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAdmin).mockResolvedValue(null)
    vi.mocked(db.store.findUnique).mockResolvedValue({ id: 'ginza' } as any)
    vi.mocked(db.cast.findFirst).mockResolvedValue({ id: 'cast-1' } as any)
    vi.mocked(listSettlementPayments).mockResolvedValue([])
  })

  it('requires reservation read permission for the requested store and keeps cast scoping', async () => {
    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/admin/cast/settlements/payments?castId=cast-1&storeId=ginza'
      )
    )

    expect(response.status).toBe(200)
    expect(requireAdmin).toHaveBeenCalledWith({
      permissions: 'reservation:read',
      storeId: 'ginza',
    })
    expect(db.cast.findFirst).toHaveBeenCalledWith({
      where: { id: 'cast-1', storeId: 'ginza' },
      select: { id: true },
    })
    expect(listSettlementPayments).toHaveBeenCalledWith('cast-1', 'ginza')
  })

  it('returns the authorization error without reading payments', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(
      NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
    )

    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/admin/cast/settlements/payments?castId=cast-1&storeId=ginza'
      )
    )

    expect(response.status).toBe(403)
    expect(db.cast.findFirst).not.toHaveBeenCalled()
    expect(listSettlementPayments).not.toHaveBeenCalled()
  })
})

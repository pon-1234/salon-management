/**
 * @design_doc   Store-wide settlement ledger authorization boundary
 * @related_to   getStoreSettlementLedger, requireAdmin
 * @known_issues None
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth/utils'
import { getStoreSettlementLedger } from '@/lib/settlement/store-ledger'
import { GET } from './route'

vi.mock('@/lib/auth/utils', () => ({
  requireAdmin: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('@/lib/settlement/store-ledger', () => ({
  getStoreSettlementLedger: vi.fn(),
}))

vi.mock('@/lib/store/server', () => ({
  resolveStoreId: vi.fn(async () => 'ikebukuro'),
  ensureStoreId: vi.fn(async (storeId: string) => storeId),
}))

vi.mock('@/lib/logger', () => ({
  default: { error: vi.fn() },
}))

describe('/api/admin/settlements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAdmin).mockResolvedValue(null)
    vi.mocked(getStoreSettlementLedger).mockResolvedValue({
      month: '2026-08',
      hourlyGuaranteeAmount: 0,
      casts: [],
      payments: [],
      legacyEntries: [],
    })
  })

  it('reads the requested store month after admin authorization', async () => {
    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/admin/settlements?storeId=ikebukuro&year=2026&month=8'
      )
    )

    expect(response.status).toBe(200)
    expect(requireAdmin).toHaveBeenCalledWith({
      permissions: 'reservation:read',
      storeId: 'ikebukuro',
    })
    expect(getStoreSettlementLedger).toHaveBeenCalledWith('ikebukuro', 2026, 8)
  })

  it('returns the authorization error without reading the ledger', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(
      NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
    )

    const response = await GET(
      new NextRequest('http://localhost:3000/api/admin/settlements?storeId=ikebukuro')
    )

    expect(response.status).toBe(403)
    expect(getStoreSettlementLedger).not.toHaveBeenCalled()
  })
})

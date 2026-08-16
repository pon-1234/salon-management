/**
 * @design_doc   Admin cast settlement authorization and store isolation boundary
 * @related_to   app/api/admin/cast/settlements/route.ts, requireAdmin, settlement server
 * @known_issues None
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth/utils'
import { getCastSettlements } from '@/lib/cast-portal/server'
import { db } from '@/lib/db'
import { SettlementValidationError, upsertSettlementPayment } from '@/lib/settlement/server'
import { GET, POST } from './route'

vi.mock('@/lib/auth/utils', () => ({
  requireAdmin: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('@/lib/cast-portal/server', () => ({
  getCastSettlements: vi.fn(),
}))

vi.mock('@/lib/settlement/server', () => ({
  upsertSettlementPayment: vi.fn(),
  SettlementValidationError: class SettlementValidationError extends Error {},
}))

vi.mock('@/lib/db', () => ({
  db: {
    store: {
      findUnique: vi.fn(() => Promise.resolve({ id: 'ginza' })),
    },
    cast: {
      findFirst: vi.fn(),
    },
    reservation: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
  },
}))

describe('/api/admin/cast/settlements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAdmin).mockResolvedValue(null)
    vi.mocked(db.store.findUnique).mockResolvedValue({ id: 'ginza' } as any)
    vi.mocked(db.cast.findFirst).mockResolvedValue({ id: 'cast-1' } as any)
    vi.mocked(db.reservation.findMany).mockResolvedValue([])
    vi.mocked(getCastSettlements).mockResolvedValue({ days: [] } as any)
    vi.mocked(upsertSettlementPayment).mockResolvedValue({ id: 'payment-1' } as any)
  })

  it('requires reservation read permission for the requested store before reading settlements', async () => {
    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/admin/cast/settlements?castId=cast-1&storeId=ginza'
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
    expect(getCastSettlements).toHaveBeenCalledWith('cast-1', 'ginza')
  })

  it('returns the GET authorization error without reading settlement data', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(
      NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
    )

    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/admin/cast/settlements?castId=cast-1&storeId=ginza'
      )
    )

    expect(response.status).toBe(403)
    expect(db.cast.findFirst).not.toHaveBeenCalled()
    expect(getCastSettlements).not.toHaveBeenCalled()
  })

  it('requires reservation update permission for the requested store before saving a payment', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/admin/cast/settlements?storeId=ginza', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ castId: 'cast-1', amount: 12000, reservationIds: [] }),
      })
    )

    expect(response.status).toBe(201)
    expect(requireAdmin).toHaveBeenCalledWith({
      permissions: 'reservation:update',
      storeId: 'ginza',
    })
    expect(db.cast.findFirst).toHaveBeenCalledWith({
      where: { id: 'cast-1', storeId: 'ginza' },
      select: { id: true },
    })
    expect(upsertSettlementPayment).toHaveBeenCalledWith(
      expect.objectContaining({ castId: 'cast-1', storeId: 'ginza', reservationIds: [] })
    )
  })

  it('returns the POST authorization error without parsing or saving payment data', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(
      NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
    )

    const response = await POST(
      new NextRequest('http://localhost:3000/api/admin/cast/settlements?storeId=ginza', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ castId: 'cast-1', amount: 12000 }),
      })
    )

    expect(response.status).toBe(403)
    expect(db.cast.findFirst).not.toHaveBeenCalled()
    expect(upsertSettlementPayment).not.toHaveBeenCalled()
  })

  it('returns a visible validation error instead of a 500 for an invalid settlement amount', async () => {
    vi.mocked(db.reservation.findMany).mockResolvedValueOnce([{ id: 'reservation-1' }] as any)
    vi.mocked(upsertSettlementPayment).mockRejectedValueOnce(
      new SettlementValidationError(
        'Settlement amount must equal selected reservation staff revenue'
      )
    )

    const response = await POST(
      new NextRequest('http://localhost:3000/api/admin/cast/settlements?storeId=ginza', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          castId: 'cast-1',
          amount: 100,
          method: '現金精算',
          handledBy: '管理者',
          reservationIds: ['reservation-1'],
        }),
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: '支払金額が対象予約のキャスト取り分合計と一致しません。',
    })
  })
})

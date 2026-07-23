/**
 * @design_doc   Reservation history authorization and store isolation tests
 * @related_to   app/api/reservation/history/route.ts, lib/auth/utils.ts
 * @known_issues None
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/utils'
import { GET } from './route'

vi.mock('@/lib/db', () => ({
  db: {
    store: {
      findUnique: vi.fn(() => Promise.resolve({ id: 'ginza' })),
    },
    reservationHistory: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/utils', () => ({
  requireAdmin: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
  },
}))

describe('GET /api/reservation/history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAdmin).mockResolvedValue(null)
    vi.mocked(db.reservationHistory.findMany).mockResolvedValue([])
  })

  it('rejects requests without a reservation ID', async () => {
    const response = await GET(
      new NextRequest('http://localhost:3000/api/reservation/history?storeId=ginza')
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'reservationId is required' })
    expect(requireAdmin).not.toHaveBeenCalled()
    expect(db.reservationHistory.findMany).not.toHaveBeenCalled()
  })

  it('requires reservation read permission for the requested store', async () => {
    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/reservation/history?reservationId=res-1&storeId=ginza'
      )
    )

    expect(response.status).toBe(200)
    expect(requireAdmin).toHaveBeenCalledWith({
      permissions: 'reservation:read',
      storeId: 'ginza',
    })
  })

  it('returns the authorization error without reading history', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(
      NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
    )

    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/reservation/history?reservationId=res-1&storeId=ginza'
      )
    )

    expect(response.status).toBe(403)
    expect(db.reservationHistory.findMany).not.toHaveBeenCalled()
  })

  it('limits history to reservations in the requested store and omits internal audit metadata', async () => {
    vi.mocked(db.reservationHistory.findMany).mockResolvedValueOnce([
      {
        id: 'history-1',
        reservationId: 'res-1',
        fieldName: 'status',
        fieldDisplayName: 'ステータス',
        oldValue: 'pending',
        newValue: 'confirmed',
        reason: '電話確認済み',
        actorId: 'staff-internal-id',
        actorName: '受付担当',
        actorIp: '192.0.2.10',
        actorAgent: 'Internal Browser Agent',
        createdAt: new Date('2026-07-19T00:00:00.000Z'),
      },
    ] as any)

    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/reservation/history?reservationId=res-1&storeId=ginza'
      )
    )
    const payload = await response.json()

    expect(db.reservationHistory.findMany).toHaveBeenCalledWith({
      where: {
        reservationId: 'res-1',
        reservation: { storeId: 'ginza' },
      },
      select: {
        id: true,
        reservationId: true,
        fieldName: true,
        fieldDisplayName: true,
        oldValue: true,
        newValue: true,
        reason: true,
        actorName: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    expect(payload).toEqual([
      {
        id: 'history-1',
        reservationId: 'res-1',
        fieldName: 'status',
        fieldDisplayName: 'ステータス',
        oldValue: 'pending',
        newValue: 'confirmed',
        reason: '電話確認済み',
        actorName: '受付担当',
        createdAt: '2026-07-19T00:00:00.000Z',
      },
    ])
    expect(JSON.stringify(payload)).not.toMatch(
      /staff-internal-id|192\.0\.2\.10|Internal Browser Agent/
    )
  })
})

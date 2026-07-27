/**
 * @design_doc   Reservation LINE messaging authorization and store isolation boundary
 * @related_to   app/api/reservation/[id]/line/route.ts, requireAdmin, reservationLineLog
 * @known_issues None
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { castNotificationService } from '@/lib/notification/cast-service'
import { GET, POST } from './route'

vi.mock('@/lib/auth/utils', () => ({
  requireAdmin: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('@/lib/db', () => ({
  db: {
    store: {
      findUnique: vi.fn(() => Promise.resolve({ id: 'ginza' })),
    },
    reservationLineLog: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    reservation: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/lib/notification/cast-service', () => ({
  castNotificationService: {
    sendManualMessage: vi.fn(),
  },
}))

describe('/api/reservation/[id]/line', () => {
  const context = { params: Promise.resolve({ id: 'reservation-1' }) }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAdmin).mockResolvedValue(null)
    vi.mocked(db.store.findUnique).mockResolvedValue({ id: 'ginza' } as any)
    vi.mocked(db.reservationLineLog.findMany).mockResolvedValue([])
    vi.mocked(db.reservation.findFirst).mockResolvedValue({
      id: 'reservation-1',
      cast: { id: 'cast-1', name: 'キャスト', lineUserId: 'line-1' },
      customer: { name: '顧客' },
      course: { name: 'コース' },
    } as any)
    vi.mocked(castNotificationService.sendManualMessage).mockResolvedValue(undefined)
    vi.mocked(db.reservationLineLog.create).mockResolvedValue({
      id: 'line-log-1',
      message: '確認メッセージ',
      status: 'sent',
      errorMessage: null,
      createdAt: new Date('2026-07-19T01:00:00.000Z'),
      cast: { id: 'cast-1', name: 'キャスト' },
    } as any)
  })

  it('requires reservation read permission for the requested store before reading LINE logs', async () => {
    const response = await GET(
      new NextRequest('http://localhost:3000/api/reservation/reservation-1/line?storeId=ginza'),
      context
    )

    expect(response.status).toBe(200)
    expect(requireAdmin).toHaveBeenCalledWith({
      permissions: 'reservation:read',
      storeId: 'ginza',
    })
    expect(db.reservationLineLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { reservationId: 'reservation-1', reservation: { storeId: 'ginza' } },
      })
    )
  })

  it('returns the GET authorization error without reading LINE logs', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(
      NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
    )

    const response = await GET(
      new NextRequest('http://localhost:3000/api/reservation/reservation-1/line?storeId=ginza'),
      context
    )

    expect(response.status).toBe(403)
    expect(db.reservationLineLog.findMany).not.toHaveBeenCalled()
  })

  it('requires reservation update permission for the requested store before sending LINE', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/reservation/reservation-1/line?storeId=ginza', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '確認メッセージ' }),
      }),
      context
    )

    expect(response.status).toBe(201)
    expect(requireAdmin).toHaveBeenCalledWith({
      permissions: 'reservation:update',
      storeId: 'ginza',
    })
    expect(db.reservation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'reservation-1', storeId: 'ginza' } })
    )
    expect(castNotificationService.sendManualMessage).toHaveBeenCalledOnce()
  })

  it('returns the POST authorization error without reading or notifying a reservation', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(
      NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
    )

    const response = await POST(
      new NextRequest('http://localhost:3000/api/reservation/reservation-1/line?storeId=ginza', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '確認メッセージ' }),
      }),
      context
    )

    expect(response.status).toBe(403)
    expect(db.reservation.findFirst).not.toHaveBeenCalled()
    expect(castNotificationService.sendManualMessage).not.toHaveBeenCalled()
    expect(db.reservationLineLog.create).not.toHaveBeenCalled()
  })
})

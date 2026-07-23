/**
 * @design_doc   Reservation entry-info authorization and store isolation boundary
 * @related_to   app/api/reservation/[id]/entry-info/route.ts and requireAdmin
 * @known_issues Chat messages remain storeless until the chat tenancy policy is approved
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { requireAdmin } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { castNotificationService } from '@/lib/notification/cast-service'
import { POST } from './route'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/utils', () => ({
  requireAdmin: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('@/lib/db', () => ({
  db: {
    store: {
      findUnique: vi.fn(() => Promise.resolve({ id: 'ginza' })),
    },
    reservation: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    hotelSettings: {
      findFirst: vi.fn(),
    },
    message: {
      create: vi.fn(),
    },
    reservationLineLog: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/notification/cast-service', () => ({
  castNotificationService: {
    sendEntryInfoNotification: vi.fn(),
  },
}))

describe('/api/reservation/[id]/entry-info', () => {
  const context = { params: Promise.resolve({ id: 'reservation-1' }) }
  const reservation = {
    id: 'reservation-1',
    storeId: 'ginza',
    startTime: new Date('2026-07-20T01:00:00.000Z'),
    endTime: new Date('2026-07-20T02:00:00.000Z'),
    hotelId: null,
    hotelName: null,
    roomNumber: null,
    entryMemo: null,
    entryReceivedAt: null,
    entryReceivedBy: null,
    entryNotifiedAt: null,
    cast: { id: 'cast-1', name: 'キャスト', lineUserId: 'line-1' },
    customer: { name: '顧客' },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin-1', role: 'admin', name: '管理者' },
      expires: '2099-01-01T00:00:00.000Z',
    } as any)
    vi.mocked(requireAdmin).mockResolvedValue(null)
    vi.mocked(db.store.findUnique).mockResolvedValue({ id: 'ginza' } as any)
    vi.mocked(db.reservation.findFirst).mockReset()
    vi.mocked(db.reservation.findFirst)
      .mockResolvedValueOnce(reservation as any)
      .mockResolvedValueOnce({
        hotelName: 'ホテル',
        roomNumber: '101',
        entryMemo: null,
        entryReceivedAt: new Date('2026-07-19T12:00:00.000Z'),
        entryReceivedBy: '管理者',
        entryNotifiedAt: new Date('2026-07-19T12:00:00.000Z'),
        entryConfirmedAt: null,
        entryReminderSentAt: null,
      } as any)
    vi.mocked(db.reservation.findUnique)
      .mockResolvedValueOnce(reservation as any)
      .mockResolvedValueOnce({
        hotelName: 'ホテル',
        roomNumber: '101',
        entryMemo: null,
        entryReceivedAt: new Date('2026-07-19T12:00:00.000Z'),
        entryReceivedBy: '管理者',
        entryNotifiedAt: new Date('2026-07-19T12:00:00.000Z'),
        entryConfirmedAt: null,
        entryReminderSentAt: null,
      } as any)
    vi.mocked(db.reservation.update).mockResolvedValue(reservation as any)
    vi.mocked(db.hotelSettings.findFirst).mockResolvedValue(null)
    vi.mocked(db.message.create).mockResolvedValue({} as any)
    vi.mocked(db.reservationLineLog.create).mockResolvedValue({} as any)
    vi.mocked(castNotificationService.sendEntryInfoNotification).mockResolvedValue({
      status: 'sent',
    })
  })

  it('requires reservation update permission and reads the reservation inside the requested store', async () => {
    const response = await POST(
      new NextRequest(
        'http://localhost:3000/api/reservation/reservation-1/entry-info?storeId=ginza',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hotelName: 'ホテル', roomNumber: '101', action: 'save' }),
        }
      ),
      context
    )

    expect(response.status).toBe(200)
    expect(requireAdmin).toHaveBeenCalledWith({
      permissions: 'reservation:update',
      storeId: 'ginza',
    })
    expect(db.reservation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'reservation-1', storeId: 'ginza' } })
    )
  })

  it('returns the store authorization error before reading or notifying a reservation', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(
      NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
    )

    const response = await POST(
      new NextRequest(
        'http://localhost:3000/api/reservation/reservation-1/entry-info?storeId=ginza',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hotelName: 'ホテル', action: 'save' }),
        }
      ),
      context
    )

    expect(response.status).toBe(403)
    expect(db.reservation.findFirst).not.toHaveBeenCalled()
    expect(db.reservation.update).not.toHaveBeenCalled()
    expect(castNotificationService.sendEntryInfoNotification).not.toHaveBeenCalled()
  })

  it('reports a failed LINE delivery instead of presenting it as a successful notification', async () => {
    vi.mocked(db.reservation.findFirst).mockReset()
    vi.mocked(db.reservation.findFirst)
      .mockResolvedValueOnce(reservation as any)
      .mockResolvedValueOnce({
        hotelName: 'ホテル',
        roomNumber: '101',
        entryMemo: null,
        entryReceivedAt: new Date('2026-07-19T12:00:00.000Z'),
        entryReceivedBy: '管理者',
        entryNotifiedAt: null,
        entryConfirmedAt: null,
        entryReminderSentAt: null,
      } as any)
    vi.mocked(castNotificationService.sendEntryInfoNotification).mockRejectedValueOnce(
      new Error('LINE transport unavailable')
    )

    const response = await POST(
      new NextRequest(
        'http://localhost:3000/api/reservation/reservation-1/entry-info?storeId=ginza',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hotelName: 'ホテル', roomNumber: '101', action: 'save' }),
        }
      ),
      context
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.notificationStatus).toBe('failed')
    expect(data.notificationError).toContain('LINE transport unavailable')
    expect(data.entryNotifiedAt).toBeNull()
    expect(db.reservation.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ entryNotifiedAt: expect.any(Date) }),
      })
    )
  })

  it('reports skipped when the cast has no recipient and does not stamp a notification time', async () => {
    vi.mocked(db.reservation.findFirst).mockReset()
    vi.mocked(db.reservation.findFirst)
      .mockResolvedValueOnce({
        ...reservation,
        cast: { ...reservation.cast, lineUserId: null },
      } as any)
      .mockResolvedValueOnce({
        hotelName: 'ホテル',
        roomNumber: '101',
        entryMemo: null,
        entryReceivedAt: new Date('2026-07-19T12:00:00.000Z'),
        entryReceivedBy: '管理者',
        entryNotifiedAt: null,
        entryConfirmedAt: null,
        entryReminderSentAt: null,
      } as any)
    vi.mocked(castNotificationService.sendEntryInfoNotification).mockResolvedValueOnce({
      status: 'skipped',
      reason: 'キャストのLINEユーザーIDが登録されていません。',
    })

    const response = await POST(
      new NextRequest(
        'http://localhost:3000/api/reservation/reservation-1/entry-info?storeId=ginza',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hotelName: 'ホテル', roomNumber: '101', action: 'save' }),
        }
      ),
      context
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.notificationStatus).toBe('skipped')
    expect(data.notificationError).toContain('LINEユーザーID')
    expect(data.entryNotifiedAt).toBeNull()
    expect(db.reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          hotelName: 'ホテル',
          roomNumber: '101',
          entryReceivedAt: expect.any(Date),
          entryNotifiedAt: null,
        }),
      })
    )
    expect(db.reservation.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ entryNotifiedAt: expect.any(Date) }),
      })
    )
    expect(db.reservationLineLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'skipped',
          errorMessage: expect.stringContaining('LINEユーザーID'),
        }),
      })
    )
  })

  it('stamps the notification time only after LINE delivery succeeds', async () => {
    const response = await POST(
      new NextRequest(
        'http://localhost:3000/api/reservation/reservation-1/entry-info?storeId=ginza',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hotelName: 'ホテル', roomNumber: '101', action: 'save' }),
        }
      ),
      context
    )

    expect(response.status).toBe(200)
    expect(db.reservation.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          hotelName: 'ホテル',
          entryNotifiedAt: null,
        }),
      })
    )
    expect(db.reservation.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'reservation-1' },
      data: { entryNotifiedAt: expect.any(Date) },
    })
  })

  it('stamps a reminder time only after a reminder is actually delivered', async () => {
    const response = await POST(
      new NextRequest(
        'http://localhost:3000/api/reservation/reservation-1/entry-info?storeId=ginza',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'remind' }),
        }
      ),
      context
    )

    expect(response.status).toBe(200)
    expect(db.reservation.update).toHaveBeenCalledOnce()
    expect(db.reservation.update).toHaveBeenCalledWith({
      where: { id: 'reservation-1' },
      data: { entryReminderSentAt: expect.any(Date) },
    })
    expect(db.hotelSettings.findFirst).not.toHaveBeenCalled()
  })

  it('uses the canonical name when staff select an active hotel in the reservation store', async () => {
    vi.mocked(db.hotelSettings.findFirst).mockResolvedValueOnce({
      id: 'hotel-1',
      hotelName: '池袋グランドホテル',
    } as any)

    const response = await POST(
      new NextRequest(
        'http://localhost:3000/api/reservation/reservation-1/entry-info?storeId=ginza',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hotelId: 'hotel-1',
            hotelName: '改ざんされた名前',
            action: 'save',
          }),
        }
      ),
      context
    )

    expect(response.status).toBe(200)
    expect(db.hotelSettings.findFirst).toHaveBeenCalledWith({
      where: { id: 'hotel-1', storeId: 'ginza', isActive: true },
      select: { id: true, hotelName: true },
    })
    expect(db.reservation.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          hotelId: 'hotel-1',
          hotelName: '池袋グランドホテル',
        }),
      })
    )
  })

  it('rejects an unavailable hotel before saving or notifying', async () => {
    const response = await POST(
      new NextRequest(
        'http://localhost:3000/api/reservation/reservation-1/entry-info?storeId=ginza',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hotelId: 'other-store-hotel', action: 'save' }),
        }
      ),
      context
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ code: 'HOTEL_NOT_AVAILABLE' })
    expect(db.reservation.update).not.toHaveBeenCalled()
    expect(castNotificationService.sendEntryInfoNotification).not.toHaveBeenCalled()
  })

  it('does not stamp a reminder time when reminder delivery fails', async () => {
    vi.mocked(castNotificationService.sendEntryInfoNotification).mockRejectedValueOnce(
      new Error('LINE transport unavailable')
    )

    const response = await POST(
      new NextRequest(
        'http://localhost:3000/api/reservation/reservation-1/entry-info?storeId=ginza',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'remind' }),
        }
      ),
      context
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.notificationStatus).toBe('failed')
    expect(db.reservation.update).not.toHaveBeenCalled()
  })

  it('allows staff to clear previously saved entry fields', async () => {
    vi.mocked(db.reservation.findFirst).mockReset()
    vi.mocked(db.reservation.findFirst)
      .mockResolvedValueOnce({
        ...reservation,
        hotelId: 'hotel-old',
        hotelName: '旧ホテル',
        roomNumber: '旧部屋',
        entryMemo: '旧メモ',
      } as any)
      .mockResolvedValueOnce({
        hotelId: null,
        hotelName: null,
        roomNumber: null,
        entryMemo: null,
        entryReceivedAt: new Date('2026-07-19T12:00:00.000Z'),
        entryReceivedBy: '管理者',
        entryNotifiedAt: new Date('2026-07-19T12:00:00.000Z'),
        entryConfirmedAt: null,
        entryReminderSentAt: null,
      } as any)

    const response = await POST(
      new NextRequest(
        'http://localhost:3000/api/reservation/reservation-1/entry-info?storeId=ginza',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hotelName: '',
            roomNumber: '',
            entryMemo: '',
            action: 'save',
          }),
        }
      ),
      context
    )

    expect(response.status).toBe(200)
    expect(db.reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          hotelId: null,
          hotelName: null,
          roomNumber: null,
          entryMemo: null,
        }),
      })
    )
  })
})

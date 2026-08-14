/**
 * @design_doc   Test for batch cast schedule API endpoint
 * @related_to   Batch cast schedule API route
 * @known_issues None
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from './route'
import { parseScheduleDateTimeInJst } from '@/lib/cast-schedule/date-time'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn(),
    store: {
      findUnique: vi.fn().mockResolvedValue({ id: 'store-a' }),
    },
    cast: {
      findFirst: vi.fn().mockResolvedValue({ id: 'cast-1', storeId: 'store-a' }),
    },
    castSchedule: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

describe('POST /api/cast-schedule/batch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.store.findUnique).mockResolvedValue({ id: 'store-a' } as any)
    vi.mocked(db.cast.findFirst).mockResolvedValue({ id: 'cast-1', storeId: 'store-a' } as any)
  })

  it('parses schedule clocks as JST even when the server process uses UTC', () => {
    expect(parseScheduleDateTimeInJst('2026-08-14', '10:00').toISOString()).toBe(
      '2026-08-14T01:00:00.000Z'
    )
    expect(parseScheduleDateTimeInJst('2026-08-14', '24:00').toISOString()).toBe(
      '2026-08-14T15:00:00.000Z'
    )
  })

  it('stores an editor midnight end as the following JST midnight', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin-1', role: 'admin', permissions: ['*'] },
    } as any)

    let capturedCreateData: any
    vi.mocked(db.$transaction).mockImplementation(async (callback: any) =>
      callback({
        castSchedule: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn(async ({ data }) => {
            capturedCreateData = data
            return { id: 'new-1', ...data }
          }),
          update: vi.fn(),
          delete: vi.fn(),
        },
      })
    )

    const response = await POST(
      new NextRequest('http://localhost:3000/api/cast-schedule/batch?storeId=store-a', {
        method: 'POST',
        body: JSON.stringify({
          castId: 'cast-1',
          schedules: [
            {
              date: '2026-08-14',
              status: 'working',
              startTime: '14:00',
              endTime: '00:00',
            },
          ],
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(capturedCreateData.date.toISOString()).toBe('2026-08-13T15:00:00.000Z')
    expect(capturedCreateData.startTime.toISOString()).toBe('2026-08-14T05:00:00.000Z')
    expect(capturedCreateData.endTime.toISOString()).toBe('2026-08-14T15:00:00.000Z')
  })

  it('should create and update schedules in batch', async () => {
    const mockSession = {
      user: { id: 'admin-1', role: 'admin', permissions: ['*'] },
    }
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

    const mockTransaction = vi.fn(async (callback) => {
      const tx = {
        castSchedule: {
          findUnique: vi.fn(),
          create: vi.fn().mockResolvedValue({ id: 'new-1' }),
          update: vi.fn().mockResolvedValue({ id: 'updated-1' }),
          delete: vi.fn(),
        },
      }

      // Setup mock for existing schedule
      tx.castSchedule.findUnique
        .mockResolvedValueOnce(null) // First date - no existing
        .mockResolvedValueOnce({ id: 'existing-1' }) // Second date - existing
        .mockResolvedValueOnce({ id: 'existing-2' }) // Third date - for deletion

      return callback(tx)
    })

    vi.mocked(db.$transaction).mockImplementation(mockTransaction)

    const requestBody = {
      castId: 'cast-1',
      schedules: [
        {
          date: '2024-01-15',
          status: 'working',
          startTime: '10:00',
          endTime: '18:00',
        },
        {
          date: '2024-01-16',
          status: 'working',
          startTime: '14:00',
          endTime: '22:00',
        },
        {
          date: '2024-01-17',
          status: 'holiday',
        },
      ],
    }

    const request = new NextRequest(
      'http://localhost:3000/api/cast-schedule/batch?storeId=store-a',
      {
        method: 'POST',
        body: JSON.stringify(requestBody),
      }
    )

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.message).toBe('スケジュールを一括更新しました')
    expect(data.data.updatedCount).toBe(2)
  })

  it('should require admin authentication', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const request = new NextRequest(
      'http://localhost:3000/api/cast-schedule/batch?storeId=store-a',
      {
        method: 'POST',
        body: JSON.stringify({}),
      }
    )

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('should validate request body', async () => {
    const mockSession = {
      user: { id: 'admin-1', role: 'admin', permissions: ['*'] },
    }
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

    const invalidBody = {
      castId: 'cast-1',
      schedules: [
        {
          date: '2024-01-15',
          status: 'invalid-status', // Invalid status
        },
      ],
    }

    const request = new NextRequest(
      'http://localhost:3000/api/cast-schedule/batch?storeId=store-a',
      {
        method: 'POST',
        body: JSON.stringify(invalidBody),
      }
    )

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('入力データが無効です')
  })

  it('should handle transaction errors', async () => {
    const mockSession = {
      user: { id: 'admin-1', role: 'admin', permissions: ['*'] },
    }
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

    vi.mocked(db.$transaction).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest(
      'http://localhost:3000/api/cast-schedule/batch?storeId=store-a',
      {
        method: 'POST',
        body: JSON.stringify({
          castId: 'cast-1',
          schedules: [
            { date: '2024-01-15', status: 'working', startTime: '10:00', endTime: '18:00' },
          ],
        }),
      }
    )

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBeDefined()
  })

  it('rejects a cast that does not belong to the authorized store before mutation', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin-1', role: 'admin', permissions: ['*'] },
    } as any)
    vi.mocked(db.cast.findFirst).mockResolvedValueOnce(null)

    const response = await POST(
      new NextRequest('http://localhost:3000/api/cast-schedule/batch?storeId=store-a', {
        method: 'POST',
        body: JSON.stringify({
          castId: 'cast-from-store-b',
          schedules: [{ date: '2024-01-15', status: 'holiday' }],
        }),
      })
    )

    expect(response.status).toBe(404)
    expect(db.$transaction).not.toHaveBeenCalled()
  })
})

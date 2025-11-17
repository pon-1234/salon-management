/**
 * @design_doc   Tests for point expiration batch API
 * @related_to   app/api/customer/points/expire/route.ts
 * @known_issues None currently
 */
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { POST } from './route'
import { db } from '@/lib/db'
import { addPointTransaction } from '@/lib/point/utils'

const originalCronSecret = process.env.CRON_SECRET

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/config', () => ({
  authOptions: {},
}))

const updateMock = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    customerPointHistory: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn((callback: any) =>
      callback({
        customerPointHistory: {
          update: updateMock,
        },
      })
    ),
  },
}))

vi.mock('@/lib/point/utils', () => ({
  addPointTransaction: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

afterAll(() => {
  process.env.CRON_SECRET = originalCronSecret
})

describe('POST /api/customer/points/expire', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-cron-secret'
    updateMock.mockReset()
  })

  it('expires points for admin session', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin', role: 'admin' },
    } as any)

    vi.mocked(db.customerPointHistory.findMany).mockResolvedValueOnce([
      {
        id: 'hist-1',
        customerId: 'cust-1',
        type: 'earned',
        amount: 1000,
        description: 'Test',
        relatedService: null,
      },
    ] as any)

    const request = new NextRequest('http://localhost:3000/api/customer/points/expire', {
      method: 'POST',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.processedCount).toBe(1)
    expect(addPointTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'expired',
        amount: -1000,
      }),
      expect.anything()
    )
    expect(updateMock).toHaveBeenCalled()
  })

  it('allows cron token authentication', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as any)
    vi.mocked(db.customerPointHistory.findMany).mockResolvedValueOnce([] as any)

    const request = new NextRequest('http://localhost:3000/api/customer/points/expire', {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-cron-secret',
      },
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(db.customerPointHistory.findMany).toHaveBeenCalled()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as any)
    process.env.CRON_SECRET = 'another-secret'

    const request = new NextRequest('http://localhost:3000/api/customer/points/expire', {
      method: 'POST',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('handles unique constraint errors gracefully', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin', role: 'admin' },
    } as any)
    vi.mocked(db.customerPointHistory.findMany).mockResolvedValueOnce([
      {
        id: 'hist-1',
        customerId: 'cust-1',
        type: 'earned',
        amount: 1000,
        description: 'Test',
        relatedService: null,
      },
    ] as any)

    const prismaError = new Prisma.PrismaClientKnownRequestError('Unique violation', {
      code: 'P2002',
      clientVersion: '6.11.1',
      meta: { target: 'sourceHistoryId' },
    })

    vi.mocked(db.$transaction).mockImplementationOnce(() => {
      throw prismaError
    })

    const request = new NextRequest('http://localhost:3000/api/customer/points/expire', {
      method: 'POST',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.processedCount).toBe(0)
  })
})

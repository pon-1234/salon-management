/**
 * @design_doc   Tests for customer point balance API
 * @related_to   app/api/customer/points/balance/route.ts
 * @known_issues None currently
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { GET } from './route'
import { db } from '@/lib/db'
import { getExpiringPoints } from '@/lib/point/utils'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/config', () => ({
  authOptions: {},
}))

vi.mock('@/lib/db', () => ({
  db: {
    customer: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/point/utils', () => ({
  getExpiringPoints: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

describe('GET /api/customer/points/balance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns balance for admin viewing another customer', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin', role: 'admin' },
    } as any)
    vi.mocked(db.customer.findUnique).mockResolvedValueOnce({ points: 5000 } as any)
    const expiringDate = new Date('2024-12-31T00:00:00Z')
    vi.mocked(getExpiringPoints).mockResolvedValueOnce({
      amount: 1000,
      expiresAt: expiringDate,
    } as any)

    const request = new NextRequest(
      'http://localhost:3000/api/customer/points/balance?customerId=cust-1'
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.balance).toBe(5000)
    expect(data.expiringPoints.amount).toBe(1000)
    expect(getExpiringPoints).toHaveBeenCalled()
  })

  it('returns 403 when customer requests other balance', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'cust-1', role: 'customer' },
    } as any)

    const request = new NextRequest(
      'http://localhost:3000/api/customer/points/balance?customerId=cust-2'
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })
})

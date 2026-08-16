/**
 * @design_doc   Tests for customer point history API
 * @related_to   app/api/customer/points/route.ts
 * @known_issues None currently
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { GET } from './route'
import { db } from '@/lib/db'
import { canAdminAccessStore } from '@/lib/auth/store-access'
import { ensureStoreId, resolveStoreId } from '@/lib/store/server'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/config', () => ({
  authOptions: {},
}))

vi.mock('@/lib/db', () => ({
  db: {
    customerPointHistory: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    customerStoreAssignment: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/auth/store-access', () => ({ canAdminAccessStore: vi.fn() }))
vi.mock('@/lib/store/server', () => ({
  ensureStoreId: vi.fn(),
  resolveStoreId: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

describe('GET /api/customer/points', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(resolveStoreId).mockResolvedValue('ikebukuro')
    vi.mocked(ensureStoreId).mockResolvedValue('store-ikebukuro')
    vi.mocked(canAdminAccessStore).mockReturnValue(true)
    vi.mocked(db.customerStoreAssignment.findUnique).mockResolvedValue({
      customerId: 'cust-1',
    } as any)
  })

  it('allows admin users to view any customer history', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin', role: 'admin', permissions: ['customer:read'] },
    } as any)

    const mockHistory = [
      {
        id: 'hist-1',
        customerId: 'cust-1',
        type: 'earned',
        amount: 100,
        description: 'Test',
        relatedService: null,
        reservationId: null,
        balance: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    vi.mocked(db.customerPointHistory.findMany).mockResolvedValueOnce(mockHistory as any)
    vi.mocked(db.customerPointHistory.count).mockResolvedValueOnce(1)

    const request = new NextRequest(
      'http://localhost:3000/api/customer/points?customerId=cust-1&limit=10'
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.pagination.total).toBe(1)
    expect(db.customerPointHistory.findMany).toHaveBeenCalled()
    expect(db.customerStoreAssignment.findUnique).toHaveBeenCalledWith({
      where: {
        customerId_storeId: { customerId: 'cust-1', storeId: 'store-ikebukuro' },
      },
      select: { customerId: true },
    })
  })

  it('does not reveal another store customer history to an administrator', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin', role: 'admin', permissions: ['customer:read'] },
    } as any)
    vi.mocked(db.customerStoreAssignment.findUnique).mockResolvedValueOnce(null)

    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/customer/points?customerId=cust-1&storeId=ikebukuro'
      )
    )

    expect(response.status).toBe(404)
    expect(db.customerPointHistory.findMany).not.toHaveBeenCalled()
  })

  it('rejects an admin without customer:read permission', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin', role: 'admin', permissions: [] },
    } as any)

    const response = await GET(
      new NextRequest('http://localhost:3000/api/customer/points?customerId=cust-1')
    )

    expect(response.status).toBe(403)
    expect(db.customerPointHistory.findMany).not.toHaveBeenCalled()
  })

  it('allows customers to view their own history', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'cust-1', role: 'customer' },
    } as any)

    vi.mocked(db.customerPointHistory.findMany).mockResolvedValueOnce([] as any)
    vi.mocked(db.customerPointHistory.count).mockResolvedValueOnce(0)

    const request = new NextRequest('http://localhost:3000/api/customer/points?customerId=cust-1')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(db.customerPointHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { customerId: 'cust-1' } })
    )
  })

  it('prevents customers from viewing other histories', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'cust-1', role: 'customer' },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/customer/points?customerId=cust-2')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
    expect(db.customerPointHistory.findMany).not.toHaveBeenCalled()
  })
})

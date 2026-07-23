/**
 * @design_doc   Eligible review reservation multi-store authorization
 * @related_to   Review submission form and Review service
 * @known_issues None currently
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { GET } from './route'

const serviceMocks = vi.hoisted(() => ({
  getEligibleReservationsForCustomer: vi.fn(),
}))

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/config', () => ({
  authOptions: {},
}))

vi.mock('@/lib/reviews/service', () => ({
  getEligibleReservationsForCustomer: serviceMocks.getEligibleReservationsForCustomer,
}))

vi.mock('@/lib/logger', () => ({
  default: { error: vi.fn() },
}))

describe('GET /api/review/eligible', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    serviceMocks.getEligibleReservationsForCustomer.mockResolvedValue([])
  })

  it('requires a store for customer eligibility lookup', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'customer-1', role: 'customer' },
    } as any)

    const response = await GET(new NextRequest('http://localhost:3000/api/review/eligible'))

    expect(response.status).toBe(400)
    expect(serviceMocks.getEligibleReservationsForCustomer).not.toHaveBeenCalled()
  })

  it('rejects an admin who is not assigned to the requested store', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin-1', role: 'admin', storeIds: ['store-2'] },
    } as any)

    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/review/eligible?storeId=store-1&customerId=customer-1'
      )
    )

    expect(response.status).toBe(403)
    expect(serviceMocks.getEligibleReservationsForCustomer).not.toHaveBeenCalled()
  })

  it('uses the requested store for an assigned admin lookup', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin-1', role: 'admin', storeIds: ['store-1'] },
    } as any)

    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/review/eligible?storeId=store-1&customerId=customer-1'
      )
    )

    expect(response.status).toBe(200)
    expect(serviceMocks.getEligibleReservationsForCustomer).toHaveBeenCalledWith(
      'customer-1',
      'store-1'
    )
  })

  it('uses the requested store for the signed-in customer', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'customer-1', role: 'customer' },
    } as any)

    const response = await GET(
      new NextRequest('http://localhost:3000/api/review/eligible?storeId=store-1')
    )

    expect(response.status).toBe(200)
    expect(serviceMocks.getEligibleReservationsForCustomer).toHaveBeenCalledWith(
      'customer-1',
      'store-1'
    )
  })
})

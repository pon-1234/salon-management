/**
 * @design_doc   Tests for customer point adjustment API
 * @related_to   app/api/customer/points/adjust/route.ts
 * @known_issues None currently
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { POST } from './route'
import { requireAdmin } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { addPointTransaction } from '@/lib/point/utils'

vi.mock('@/lib/auth/utils', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn((callback: any) => callback({})),
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

describe('POST /api/customer/points/adjust', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAdmin).mockResolvedValue(null as any)
    vi.mocked(addPointTransaction).mockResolvedValue(undefined)
  })

  it('adjusts points when admin provides valid payload', async () => {
    const request = new NextRequest('http://localhost:3000/api/customer/points/adjust', {
      method: 'POST',
      body: JSON.stringify({
        customerId: 'cust-1',
        amount: 500,
        reason: 'Bonus',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(addPointTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cust-1',
        amount: 500,
        type: 'adjusted',
      }),
      expect.anything()
    )
    expect(db.$transaction).toHaveBeenCalled()
  })

  it('returns validation error when payload invalid', async () => {
    const request = new NextRequest('http://localhost:3000/api/customer/points/adjust', {
      method: 'POST',
      body: JSON.stringify({
        customerId: 'cust-1',
        amount: 'abc',
      }),
    } as any)

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('入力データが無効です')
  })

  it('returns auth error when requireAdmin fails', async () => {
    const errorResponse = NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    vi.mocked(requireAdmin).mockResolvedValueOnce(errorResponse)

    const request = new NextRequest('http://localhost:3000/api/customer/points/adjust', {
      method: 'POST',
      body: JSON.stringify({ customerId: 'cust-1', amount: 100, reason: 'Test' }),
    })

    const response = await POST(request)
    expect(response).toBe(errorResponse)
    expect(addPointTransaction).not.toHaveBeenCalled()
  })
})

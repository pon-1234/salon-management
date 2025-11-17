/**
 * @design_doc   Tests for expiring point notification API
 * @related_to   app/api/customer/points/notify-expiring/route.ts
 * @known_issues None currently
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { requireAdmin } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { emailClient } from '@/lib/email/client'

vi.mock('@/lib/auth/utils', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    customerPointHistory: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/email/client', () => ({
  emailClient: {
    send: vi.fn(),
  },
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

describe('POST /api/customer/points/notify-expiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAdmin).mockResolvedValue(null as any)
    vi.mocked(emailClient.send).mockResolvedValue({ success: true })
  })

  it('sends grouped notifications', async () => {
    vi.mocked(db.customerPointHistory.findMany).mockResolvedValueOnce([
      {
        id: 'hist-1',
        customerId: 'cust-1',
        amount: 500,
        expiresAt: new Date(Date.now() + 3 * 86400000),
        customer: { id: 'cust-1', name: '田中', email: 'test@example.com' },
      },
      {
        id: 'hist-2',
        customerId: 'cust-1',
        amount: 200,
        expiresAt: new Date(Date.now() + 5 * 86400000),
        customer: { id: 'cust-1', name: '田中', email: 'test@example.com' },
      },
    ] as any)

    const request = new NextRequest(
      'http://localhost:3000/api/customer/points/notify-expiring',
      { method: 'POST' }
    )
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.notifiedCount).toBe(1)
    expect(emailClient.send).toHaveBeenCalledTimes(1)
  })

  it('bubbles auth error from requireAdmin', async () => {
    const authResponse = new Response('forbidden', { status: 401 }) as any
    vi.mocked(requireAdmin).mockResolvedValueOnce(authResponse)

    const request = new NextRequest(
      'http://localhost:3000/api/customer/points/notify-expiring',
      { method: 'POST' }
    )
    const response = await POST(request)
    expect(response).toBe(authResponse)
    expect(emailClient.send).not.toHaveBeenCalled()
  })
})

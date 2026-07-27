/**
 * @design_doc   Authenticated atomic phone verification code consumption
 * @related_to   route.ts and send/route.ts
 * @known_issues Legacy anonymous account claiming remains disabled pending an approved identity policy
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { POST } from './route'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: {
    customer: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))
vi.mock('@/lib/auth/phone-verification', () => ({
  hashPhoneVerificationCode: vi.fn((_customerId: string, code: string) =>
    code === '123456' ? 'code-hash' : 'wrong-hash'
  ),
}))

const validCustomer = {
  id: 'customer-1',
  phoneVerificationCode: 'code-hash',
  phoneVerificationExpiry: new Date(Date.now() + 60_000),
  phoneVerificationAttempts: 0,
}

describe('POST /api/auth/verify-phone/confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects anonymous account-claim requests before any customer lookup', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const response = await POST(
      new NextRequest('http://localhost/api/auth/verify-phone/confirm', {
        method: 'POST',
        body: JSON.stringify({ phone: '09012345678', code: '123456' }),
      })
    )

    expect(response.status).toBe(401)
    expect(db.customer.findUnique).not.toHaveBeenCalled()
  })

  it.each(['', '12345', '1234567', 'abcdef'])('rejects a malformed code: %j', async (code) => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'customer-1', role: 'customer' },
    } as never)

    const response = await POST(
      new NextRequest('http://localhost/api/auth/verify-phone/confirm', {
        method: 'POST',
        body: JSON.stringify({ code }),
      })
    )

    expect(response.status).toBe(400)
    expect(db.customer.findUnique).not.toHaveBeenCalled()
  })

  it('consumes a valid code atomically and only once', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'customer-1', role: 'customer' },
    } as never)
    vi.mocked(db.customer.findUnique).mockResolvedValue(validCustomer as never)
    vi.mocked(db.customer.updateMany).mockResolvedValue({ count: 1 })

    const response = await POST(
      new NextRequest('http://localhost/api/auth/verify-phone/confirm', {
        method: 'POST',
        body: JSON.stringify({ code: '123456' }),
      })
    )

    expect(response.status).toBe(200)
    expect(db.customer.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'customer-1',
        phoneVerificationCode: 'code-hash',
        phoneVerificationExpiry: { gt: expect.any(Date) },
        phoneVerificationAttempts: { lt: 5 },
      },
      data: {
        phoneVerified: true,
        phoneVerifiedAt: expect.any(Date),
        phoneVerificationCode: null,
        phoneVerificationExpiry: null,
        phoneVerificationAttempts: 0,
      },
    })
  })

  it('increments a wrong-code attempt atomically without accepting it', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'customer-1', role: 'customer' },
    } as never)
    vi.mocked(db.customer.findUnique).mockResolvedValue(validCustomer as never)
    vi.mocked(db.customer.updateMany).mockResolvedValue({ count: 1 })

    const response = await POST(
      new NextRequest('http://localhost/api/auth/verify-phone/confirm', {
        method: 'POST',
        body: JSON.stringify({ code: '654321' }),
      })
    )

    expect(response.status).toBe(400)
    expect(db.customer.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'customer-1',
        phoneVerificationCode: 'code-hash',
        phoneVerificationExpiry: { gt: expect.any(Date) },
        phoneVerificationAttempts: { lt: 5 },
      },
      data: { phoneVerificationAttempts: { increment: 1 } },
    })
  })
})

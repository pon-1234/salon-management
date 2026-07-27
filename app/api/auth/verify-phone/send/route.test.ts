/**
 * @design_doc   Authenticated-only phone verification delivery
 * @related_to   route.ts, lib/auth/phone-verification.ts, lib/sms/client.ts
 * @known_issues A persistent distributed rate limiter is required before horizontal scaling
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { smsClient } from '@/lib/sms/client'
import { POST } from './route'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: {
    customer: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))
vi.mock('@/lib/sms/client', () => ({ smsClient: { send: vi.fn() } }))
vi.mock('@/lib/auth/phone-verification', () => ({
  checkSendRateLimit: vi.fn(() => ({ allowed: true })),
  recordSendAttempt: vi.fn(),
  generateVerificationCode: vi.fn(() => '123456'),
  hashPhoneVerificationCode: vi.fn(() => 'code-hash'),
}))

describe('POST /api/auth/verify-phone/send', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects anonymous account-claim requests before looking up a phone number', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const response = await POST(
      new NextRequest('http://localhost/api/auth/verify-phone/send', {
        method: 'POST',
        body: JSON.stringify({ phone: '09012345678' }),
      })
    )

    expect(response.status).toBe(401)
    expect(db.customer.findUnique).not.toHaveBeenCalled()
    expect(smsClient.send).not.toHaveBeenCalled()
  })

  it('stores a code only after SMS delivery succeeds for the signed-in customer', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'customer-1', role: 'customer' },
    } as never)
    vi.mocked(db.customer.findUnique).mockResolvedValue({
      id: 'customer-1',
      phone: '09012345678',
    } as never)
    vi.mocked(smsClient.send).mockResolvedValue({ success: true, id: 'sms-1' })
    vi.mocked(db.customer.update).mockResolvedValue({} as never)

    const response = await POST(
      new NextRequest('http://localhost/api/auth/verify-phone/send', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    )

    expect(response.status).toBe(200)
    expect(smsClient.send).toHaveBeenCalledWith({
      to: '09012345678',
      message: expect.stringContaining('123456'),
    })
    expect(vi.mocked(smsClient.send).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(db.customer.update).mock.invocationCallOrder[0]
    )
    expect(db.customer.update).toHaveBeenCalledWith({
      where: { id: 'customer-1' },
      data: {
        phoneVerificationCode: 'code-hash',
        phoneVerificationExpiry: expect.any(Date),
        phoneVerificationAttempts: 0,
      },
    })
  })

  it('does not leave a usable database code when SMS delivery fails', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'customer-1', role: 'customer' },
    } as never)
    vi.mocked(db.customer.findUnique).mockResolvedValue({
      id: 'customer-1',
      phone: '09012345678',
    } as never)
    vi.mocked(smsClient.send).mockResolvedValue({ success: false, error: 'provider failure' })

    const response = await POST(
      new NextRequest('http://localhost/api/auth/verify-phone/send', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    )

    expect(response.status).toBe(502)
    expect(db.customer.update).not.toHaveBeenCalled()
  })
})

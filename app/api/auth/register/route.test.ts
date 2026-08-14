/**
 * @design_doc   Store-scoped customer registration with verified email ownership
 * @related_to   verify-email/send, verify-email/confirm, and customer credentials login
 * @known_issues Delivery reachability is exercised in staging rather than unit tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { db } from '@/lib/db'
import { emailClient } from '@/lib/email/client'
import { refreshEnv } from '@/lib/config/env'
import { hashBearerToken } from '@/lib/auth/recovery-token'
import logger from '@/lib/logger'
import { consumeCustomerEmailRateLimit } from '@/lib/security/customer-email-rate-limit'

vi.mock('@/lib/db', () => ({
  db: {
    store: { findFirst: vi.fn() },
    customer: {
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/email/client', () => ({
  emailClient: { send: vi.fn() },
}))

vi.mock('@/lib/security/customer-email-rate-limit', () => ({
  consumeCustomerEmailRateLimit: vi.fn(),
}))

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed-password') },
}))

const registration = {
  nickname: 'Test User',
  email: '  Customer@Example.COM  ',
  phone: '090-1234-5678',
  password: 'password123',
  birthDate: '1990-01-01',
  storeId: 'store-1',
}

const createdCustomer = {
  id: 'customer-1',
  name: 'Test <User>',
  email: 'customer@example.com',
  phone: '+819012345678',
  createdAt: new Date('2026-07-20T00:00:00Z'),
}

function requestFor(body: unknown) {
  return new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
    refreshEnv()
    vi.mocked(consumeCustomerEmailRateLimit).mockReturnValue({ allowed: true })
    vi.mocked(db.store.findFirst).mockResolvedValue({ id: 'store-1', slug: 'ikebukuro' } as never)
    vi.mocked(db.customer.findFirst).mockResolvedValue(null)
    vi.mocked(db.customer.create).mockResolvedValue(createdCustomer as never)
    vi.mocked(db.customer.updateMany).mockResolvedValue({ count: 1 })
    vi.mocked(emailClient.send).mockResolvedValue({ success: true })
  })

  it('normalizes email and stores only a hashed verification token for an active store', async () => {
    const response = await POST(requestFor(registration))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.customer).toEqual(
      expect.objectContaining({ id: 'customer-1', email: 'customer@example.com' })
    )
    expect(db.store.findFirst).toHaveBeenCalledWith({
      where: { id: 'store-1', isActive: true },
      select: { id: true, slug: true },
    })
    expect(consumeCustomerEmailRateLimit).toHaveBeenCalledWith(
      'register',
      expect.anything(),
      'customer@example.com'
    )
    expect(db.customer.findFirst).toHaveBeenCalledWith({
      where: { email: { equals: 'customer@example.com', mode: 'insensitive' } },
      select: { id: true },
    })
    expect(db.customer.findFirst).toHaveBeenCalledWith({
      where: { phone: { in: ['+819012345678', '09012345678', '819012345678'] } },
      select: { id: true },
    })

    const createData = vi.mocked(db.customer.create).mock.calls[0][0].data
    expect(createData.email).toBe('customer@example.com')
    expect(createData.phone).toBe('+819012345678')
    expect(createData.emailVerified).toBe(false)
    expect(createData.emailVerificationExpiry).toBeInstanceOf(Date)
    expect(createData.storeAssignments).toEqual({ create: { storeId: 'store-1' } })
    const delivery = vi.mocked(emailClient.send).mock.calls[0][0]
    expect(delivery).toEqual(
      expect.objectContaining({
        to: 'customer@example.com',
        subject: 'メールアドレスの確認',
        body: expect.stringContaining('http://localhost:3000/verify-email?token='),
      })
    )
    const rawToken = delivery.body?.match(/token=([a-f0-9]{64})&amp;store=ikebukuro/)?.[1]
    expect(rawToken).toBeDefined()
    expect(createData.emailVerificationToken).toBe(hashBearerToken(rawToken!))
    expect(createData.emailVerificationToken).not.toBe(rawToken)
    expect(delivery.body).toContain('Test &lt;User&gt;')
    expect(delivery.body).not.toContain('Test <User>')
  })

  it('keeps profile fields that were not supplied genuinely unset', async () => {
    const response = await POST(requestFor({ ...registration, birthDate: undefined }))

    expect(response.status).toBe(201)
    const createData = vi.mocked(db.customer.create).mock.calls[0][0].data
    expect(createData.nameKana).toBeNull()
    expect(createData.birthDate).toBeNull()
    expect(createData.storeAssignments).toEqual({ create: { storeId: 'store-1' } })
  })

  it.each(['not-a-date', '2999-01-01'])(
    'rejects an invalid optional birth date instead of fabricating one: %s',
    async (birthDate) => {
      const response = await POST(requestFor({ ...registration, birthDate }))

      expect(response.status).toBe(400)
      expect(db.customer.create).not.toHaveBeenCalled()
    }
  )

  it.each([undefined, '', 'missing-store'])(
    'rejects a missing or inactive store: %s',
    async (storeId) => {
      if (storeId === 'missing-store') {
        vi.mocked(db.store.findFirst).mockResolvedValue(null)
      }

      const response = await POST(requestFor({ ...registration, storeId }))

      expect(response.status).toBe(400)
      expect(db.customer.create).not.toHaveBeenCalled()
      expect(emailClient.send).not.toHaveBeenCalled()
    }
  )

  it('rejects a malformed store slug returned from persistence', async () => {
    vi.mocked(db.store.findFirst).mockResolvedValue({ slug: '//evil.example' } as never)

    const response = await POST(requestFor(registration))

    expect(response.status).toBe(400)
    expect(db.customer.create).not.toHaveBeenCalled()
    expect(emailClient.send).not.toHaveBeenCalled()
  })

  it('rejects an existing email regardless of letter casing', async () => {
    vi.mocked(db.customer.findFirst).mockResolvedValue({ id: 'existing' } as never)

    const response = await POST(requestFor(registration))
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.code).toBe('EMAIL_EXISTS')
    expect(db.customer.create).not.toHaveBeenCalled()
  })

  it('rejects a migrated E.164 phone when registration uses national format', async () => {
    vi.mocked(db.customer.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'legacy-customer' } as never)

    const response = await POST(requestFor(registration))
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.code).toBe('PHONE_EXISTS')
    expect(db.customer.findFirst).toHaveBeenNthCalledWith(2, {
      where: { phone: { in: ['+819012345678', '09012345678', '819012345678'] } },
      select: { id: true },
    })
    expect(db.customer.create).not.toHaveBeenCalled()
  })

  it.each([
    '090-123-4567',
    '050-123-4567',
    '03-1234-56789',
    '0120-1234-567',
    '0570-1234-567',
    '0800-123-456',
  ])('rejects a structurally recognizable but non-writable Japanese phone: %s', async (phone) => {
    const response = await POST(requestFor({ ...registration, phone }))

    expect(response.status).toBe(400)
    expect(db.store.findFirst).not.toHaveBeenCalled()
    expect(db.customer.findFirst).not.toHaveBeenCalled()
    expect(db.customer.create).not.toHaveBeenCalled()
    expect(emailClient.send).not.toHaveBeenCalled()
  })

  it('keeps the account recoverable and reports an email delivery failure honestly', async () => {
    vi.mocked(emailClient.send).mockResolvedValue({
      success: false,
      error: 'provider exposed customer@example.com and the raw token',
    })

    const response = await POST(requestFor(registration))
    const data = await response.json()
    const storedTokenHash = vi.mocked(db.customer.create).mock.calls[0][0].data
      .emailVerificationToken as string

    expect(response.status).toBe(502)
    expect(data).toEqual(
      expect.objectContaining({
        code: 'VERIFICATION_DELIVERY_FAILED',
        accountCreated: true,
      })
    )
    expect(db.customer.updateMany).toHaveBeenCalledWith({
      where: { id: 'customer-1', emailVerificationToken: storedTokenHash },
      data: { emailVerificationToken: null, emailVerificationExpiry: null },
    })
    expect(logger.error).toHaveBeenCalledWith(
      { customerId: 'customer-1', failure: 'provider-rejected' },
      'Registration verification email delivery failed'
    )
    const serializedLogs = JSON.stringify(vi.mocked(logger.error).mock.calls)
    expect(serializedLogs).not.toContain('customer@example.com')
    const rawToken = vi
      .mocked(emailClient.send)
      .mock.calls[0][0].body?.match(/token=([a-f0-9]{64})/)?.[1]
    expect(rawToken).toBeDefined()
    expect(serializedLogs).not.toContain(rawToken!)
  })

  it('returns 429 with Retry-After before store lookup or password hashing', async () => {
    vi.mocked(consumeCustomerEmailRateLimit).mockReturnValue({
      allowed: false,
      reason: 'rate-limited',
      retryAfterSeconds: 240,
    })

    const response = await POST(requestFor(registration))

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('240')
    expect(db.store.findFirst).not.toHaveBeenCalled()
    expect(db.customer.create).not.toHaveBeenCalled()
  })

  it('returns 503 when registration rate limiting fails closed', async () => {
    vi.mocked(consumeCustomerEmailRateLimit).mockReturnValue({
      allowed: false,
      reason: 'unidentified-client',
      retryAfterSeconds: 60,
    })

    const response = await POST(requestFor(registration))

    expect(response.status).toBe(503)
    expect(response.headers.get('Retry-After')).toBe('60')
    expect(db.store.findFirst).not.toHaveBeenCalled()
    expect(db.customer.create).not.toHaveBeenCalled()
  })

  it.each(['a'.repeat(73), 'あ'.repeat(25), 'password\n123'])(
    'rejects a password bcrypt cannot represent exactly: %j',
    async (password) => {
      const response = await POST(requestFor({ ...registration, password }))

      expect(response.status).toBe(400)
      expect(db.store.findFirst).not.toHaveBeenCalled()
      expect(db.customer.create).not.toHaveBeenCalled()
    }
  )
})

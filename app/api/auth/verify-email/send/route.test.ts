/**
 * @design_doc   Enumeration-safe email verification delivery with hashed, revocable tokens
 * @related_to   route.ts, confirm/route.ts, lib/auth/recovery-token.ts
 * @known_issues Provider reachability is validated in staging rather than unit tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { emailClient } from '@/lib/email/client'
import { refreshEnv } from '@/lib/config/env'
import { hashBearerToken } from '@/lib/auth/recovery-token'
import logger from '@/lib/logger'
import { consumeCustomerEmailRateLimit } from '@/lib/security/customer-email-rate-limit'

vi.mock('@/lib/db', () => ({
  db: {
    store: {
      findFirst: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/security/customer-email-rate-limit', () => ({
  consumeCustomerEmailRateLimit: vi.fn(),
}))

vi.mock('@/lib/email/client', () => ({
  emailClient: {
    send: vi.fn(),
  },
}))

vi.mock('crypto', async () => {
  const actual = await vi.importActual<typeof import('crypto')>('crypto')
  return {
    ...actual,
    randomBytes: vi.fn(() => ({
      toString: vi.fn(() => 'mock-verification-token-1234567890abcdef'),
    })),
  }
})

// Helper function to create complete Customer mock
const createMockCustomer = (overrides = {}) => ({
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  nameKana: 'テストユーザー',
  phone: '090-1234-5678',
  password: 'hashed-password',
  birthDate: new Date('1990-01-01'),
  memberType: 'regular',
  points: 0,
  smsEnabled: true,
  emailNotificationEnabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  resetToken: null,
  resetTokenExpiry: null,
  emailVerified: false,
  emailVerificationToken: null,
  emailVerificationExpiry: null,
  phoneVerified: false,
  phoneVerifiedAt: null,
  phoneVerificationCode: null,
  phoneVerificationExpiry: null,
  phoneVerificationAttempts: 0,
  ...overrides,
})

const GENERIC_RESPONSE =
  '入力されたメールアドレスに一致する未確認アカウントがある場合、確認リンクを送信します'

describe('POST /api/auth/verify-email/send', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
    refreshEnv()
    vi.mocked(consumeCustomerEmailRateLimit).mockReturnValue({ allowed: true })
    vi.mocked(db.store.findFirst).mockResolvedValue({ slug: 'ikebukuro' } as never)
  })

  it('should send verification email for unverified customer', async () => {
    const mockCustomer = createMockCustomer({
      emailVerified: false,
      name: 'Test <User>',
    })

    vi.mocked(db.customer.findUnique).mockResolvedValue(mockCustomer)
    vi.mocked(db.customer.update).mockResolvedValue({
      ...mockCustomer,
      emailVerificationToken: 'mock-verification-token-1234567890abcdef',
      emailVerificationExpiry: new Date(Date.now() + 86400000),
    })
    vi.mocked(emailClient.send).mockResolvedValue({ success: true })

    const request = new NextRequest('http://localhost/api/auth/verify-email/send', {
      method: 'POST',
      body: JSON.stringify({ email: '  Test@Example.COM  ', storeId: 'store-1' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.message).toBe(GENERIC_RESPONSE)

    expect(db.customer.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    })

    expect(consumeCustomerEmailRateLimit).toHaveBeenCalledWith(
      'verify-email',
      expect.anything(),
      'test@example.com'
    )
    expect(db.store.findFirst).toHaveBeenCalledWith({
      where: { id: 'store-1', isActive: true },
      select: { slug: true },
    })

    expect(emailClient.send).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: 'メールアドレスの確認',
      body: expect.stringMatching(
        /http:\/\/localhost:3000\/verify-email\?token=[a-f0-9]+&amp;store=ikebukuro/
      ),
    })
    const deliveredBody = vi.mocked(emailClient.send).mock.calls[0][0].body ?? ''
    expect(deliveredBody).toContain('Test &lt;User&gt;')
    expect(deliveredBody).not.toContain('Test <User>')

    const storedTokenHash = vi.mocked(db.customer.update).mock.calls[0][0].data
      .emailVerificationToken
    const emailBody = vi.mocked(emailClient.send).mock.calls[0][0].body ?? ''
    const rawToken = emailBody.match(/verify-email\?token=([a-f0-9]+)/)?.[1]
    expect(rawToken).toBeDefined()
    expect(storedTokenHash).toBe(hashBearerToken(rawToken!))
    expect(storedTokenHash).not.toBe(rawToken)
    expect(db.customer.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: {
        emailVerificationToken: storedTokenHash,
        emailVerificationExpiry: expect.any(Date),
      },
    })
  })

  it('should return success message for already verified email', async () => {
    const mockCustomer = createMockCustomer({
      emailVerified: true,
    })

    vi.mocked(db.customer.findUnique).mockResolvedValue(mockCustomer)

    const request = new NextRequest('http://localhost/api/auth/verify-email/send', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', storeId: 'store-1' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.message).toBe(GENERIC_RESPONSE)

    expect(db.customer.update).not.toHaveBeenCalled()
    expect(emailClient.send).not.toHaveBeenCalled()
  })

  it('returns the same response for a non-existent email', async () => {
    vi.mocked(db.customer.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/auth/verify-email/send', {
      method: 'POST',
      body: JSON.stringify({ email: 'nonexistent@example.com', storeId: 'store-1' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.message).toBe(GENERIC_RESPONSE)

    expect(db.customer.update).not.toHaveBeenCalled()
    expect(emailClient.send).not.toHaveBeenCalled()
  })

  it('should return error for missing email', async () => {
    const request = new NextRequest('http://localhost/api/auth/verify-email/send', {
      method: 'POST',
      body: JSON.stringify({ storeId: 'store-1' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Bad Request')
    expect(data.message).toBe('入力内容に誤りがあります')
  })

  it('should return error for invalid email format', async () => {
    const request = new NextRequest('http://localhost/api/auth/verify-email/send', {
      method: 'POST',
      body: JSON.stringify({ email: 'invalid-email', storeId: 'store-1' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Bad Request')
    expect(data.message).toBe('入力内容に誤りがあります')
    expect(data.errors).toBeDefined()
  })

  it('records email rejection, revokes only its token, and returns the generic response', async () => {
    const mockCustomer = createMockCustomer({
      emailVerified: false,
    })

    vi.mocked(db.customer.findUnique).mockResolvedValue(mockCustomer)
    vi.mocked(db.customer.update).mockResolvedValue({
      ...mockCustomer,
      emailVerificationToken: 'mock-verification-token-1234567890abcdef',
      emailVerificationExpiry: new Date(Date.now() + 86400000),
    })
    vi.mocked(db.customer.updateMany).mockResolvedValue({ count: 1 })
    vi.mocked(emailClient.send).mockResolvedValue({
      success: false,
      error: 'Email failed for test@example.com token-secret',
    })

    const request = new NextRequest('http://localhost/api/auth/verify-email/send', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', storeId: 'store-1' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.message).toBe(GENERIC_RESPONSE)
    const storedTokenHash = vi.mocked(db.customer.update).mock.calls[0][0].data
      .emailVerificationToken
    expect(db.customer.updateMany).toHaveBeenCalledWith({
      where: { id: '1', emailVerificationToken: storedTokenHash },
      data: { emailVerificationToken: null, emailVerificationExpiry: null },
    })
    expect(logger.error).toHaveBeenCalledWith(
      { customerId: '1', failure: 'provider-rejected' },
      'Email verification delivery failed'
    )
    const serializedLogs = JSON.stringify(vi.mocked(logger.error).mock.calls)
    expect(serializedLogs).not.toContain('test@example.com')
    expect(serializedLogs).not.toContain('token-secret')
  })

  it('should handle database update failure', async () => {
    const mockCustomer = createMockCustomer({
      emailVerified: false,
    })

    vi.mocked(db.customer.findUnique).mockResolvedValue(mockCustomer)
    vi.mocked(db.customer.update).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/auth/verify-email/send', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', storeId: 'store-1' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.message).toBe(GENERIC_RESPONSE)
    expect(logger.error).toHaveBeenCalledWith(
      { failure: 'internal-error', errorType: 'Error' },
      'Email verification request failed'
    )
  })

  it('should handle invalid JSON body', async () => {
    const request = new NextRequest('http://localhost/api/auth/verify-email/send', {
      method: 'POST',
      body: 'invalid json',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal Server Error')
    expect(data.message).toBe('メール送信中にエラーが発生しました')
  })

  it('rejects an inactive store before looking up a customer', async () => {
    vi.mocked(db.store.findFirst).mockResolvedValue(null)

    const response = await POST(
      new NextRequest('http://localhost/api/auth/verify-email/send', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', storeId: 'inactive-store' }),
      })
    )

    expect(response.status).toBe(400)
    expect(db.customer.findUnique).not.toHaveBeenCalled()
  })

  it('returns 429 with Retry-After when the caller is rate limited', async () => {
    vi.mocked(consumeCustomerEmailRateLimit).mockReturnValue({
      allowed: false,
      reason: 'rate-limited',
      retryAfterSeconds: 180,
    })

    const response = await POST(
      new NextRequest('http://localhost/api/auth/verify-email/send', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', storeId: 'store-1' }),
      })
    )

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('180')
    expect(db.store.findFirst).not.toHaveBeenCalled()
    expect(db.customer.findUnique).not.toHaveBeenCalled()
  })

  it('returns 503 when the limiter cannot make a safe decision', async () => {
    vi.mocked(consumeCustomerEmailRateLimit).mockReturnValue({
      allowed: false,
      reason: 'capacity-exhausted',
      retryAfterSeconds: 60,
    })

    const response = await POST(
      new NextRequest('http://localhost/api/auth/verify-email/send', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', storeId: 'store-1' }),
      })
    )

    expect(response.status).toBe(503)
    expect(response.headers.get('Retry-After')).toBe('60')
    expect(db.store.findFirst).not.toHaveBeenCalled()
    expect(db.customer.findUnique).not.toHaveBeenCalled()
  })

  it('returns 503 if the limiter unexpectedly throws', async () => {
    vi.mocked(consumeCustomerEmailRateLimit).mockImplementation(() => {
      throw new Error('limiter unavailable')
    })

    const response = await POST(
      new NextRequest('http://localhost/api/auth/verify-email/send', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', storeId: 'store-1' }),
      })
    )

    expect(response.status).toBe(503)
    expect(response.headers.get('Retry-After')).toBe('60')
    expect(db.store.findFirst).not.toHaveBeenCalled()
  })
})

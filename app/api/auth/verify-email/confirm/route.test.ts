import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  db: {
    customer: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

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
  createdAt: new Date(),
  updatedAt: new Date(),
  resetToken: null,
  resetTokenExpiry: null,
  emailVerified: false,
  emailVerificationToken: null,
  emailVerificationExpiry: null,
  ...overrides,
})

describe('POST /api/auth/verify-email/confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should verify email with valid token', async () => {
    const mockCustomer = createMockCustomer({
      emailVerified: false,
      emailVerificationToken: 'valid-verification-token',
      emailVerificationExpiry: new Date(Date.now() + 86400000), // 24 hours from now
    })

    vi.mocked(db.customer.findFirst).mockResolvedValue(mockCustomer)
    vi.mocked(db.customer.update).mockResolvedValue({
      ...mockCustomer,
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
    })

    const request = new NextRequest('http://localhost/api/auth/verify-email/confirm', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid-verification-token',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.message).toBe('メールアドレスが正常に確認されました')

    expect(db.customer.findFirst).toHaveBeenCalledWith({
      where: {
        emailVerificationToken: 'valid-verification-token',
        emailVerificationExpiry: {
          gt: expect.any(Date),
        },
      },
    })

    expect(db.customer.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    })
  })

  it('should return success for already verified email', async () => {
    const mockCustomer = createMockCustomer({
      emailVerified: true,
      emailVerificationToken: 'valid-verification-token',
      emailVerificationExpiry: new Date(Date.now() + 86400000),
    })

    vi.mocked(db.customer.findFirst).mockResolvedValue(mockCustomer)

    const request = new NextRequest('http://localhost/api/auth/verify-email/confirm', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid-verification-token',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.message).toBe('メールアドレスは既に確認済みです')

    expect(db.customer.update).not.toHaveBeenCalled()
  })

  it('should return error for invalid token', async () => {
    vi.mocked(db.customer.findFirst).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/auth/verify-email/confirm', {
      method: 'POST',
      body: JSON.stringify({
        token: 'invalid-token',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Bad Request')
    expect(data.message).toBe('無効または期限切れのトークンです')

    expect(db.customer.update).not.toHaveBeenCalled()
  })

  it('should return error for expired token', async () => {
    vi.mocked(db.customer.findFirst).mockResolvedValue(null) // Won't find due to expiry condition

    const request = new NextRequest('http://localhost/api/auth/verify-email/confirm', {
      method: 'POST',
      body: JSON.stringify({
        token: 'expired-token',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Bad Request')
    expect(data.message).toBe('無効または期限切れのトークンです')
  })

  it('should return error for missing token', async () => {
    const request = new NextRequest('http://localhost/api/auth/verify-email/confirm', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Bad Request')
    expect(data.message).toBe('入力内容に誤りがあります')
  })

  it('should return error for empty token', async () => {
    const request = new NextRequest('http://localhost/api/auth/verify-email/confirm', {
      method: 'POST',
      body: JSON.stringify({ token: '' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Bad Request')
    expect(data.message).toBe('入力内容に誤りがあります')
  })

  it('should handle database update failure', async () => {
    const mockCustomer = createMockCustomer({
      emailVerified: false,
      emailVerificationToken: 'valid-verification-token',
      emailVerificationExpiry: new Date(Date.now() + 86400000),
    })

    vi.mocked(db.customer.findFirst).mockResolvedValue(mockCustomer)
    vi.mocked(db.customer.update).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/auth/verify-email/confirm', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid-verification-token',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal Server Error')
    expect(data.message).toBe('メール確認の処理中にエラーが発生しました')
  })

  it('should handle database find failure', async () => {
    vi.mocked(db.customer.findFirst).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/auth/verify-email/confirm', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid-token',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal Server Error')
    expect(data.message).toBe('メール確認の処理中にエラーが発生しました')
  })

  it('should handle invalid JSON body', async () => {
    const request = new NextRequest('http://localhost/api/auth/verify-email/confirm', {
      method: 'POST',
      body: 'invalid json',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal Server Error')
    expect(data.message).toBe('メール確認の処理中にエラーが発生しました')
  })
})

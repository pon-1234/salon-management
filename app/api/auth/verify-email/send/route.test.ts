import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { emailClient } from '@/lib/email/client'
import { refreshEnv } from '@/lib/config/env'

vi.mock('@/lib/db', () => ({
  db: {
    customer: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
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
  createdAt: new Date(),
  updatedAt: new Date(),
  resetToken: null,
  resetTokenExpiry: null,
  emailVerified: false,
  emailVerificationToken: null,
  emailVerificationExpiry: null,
  ...overrides,
})

describe('POST /api/auth/verify-email/send', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
    refreshEnv()
  })

  it('should send verification email for unverified customer', async () => {
    const mockCustomer = createMockCustomer({
      emailVerified: false,
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
      body: JSON.stringify({ email: 'test@example.com' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.message).toBe('メール確認のリンクを送信しました')

    expect(db.customer.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    })

    expect(db.customer.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: {
        emailVerificationToken: expect.any(String),
        emailVerificationExpiry: expect.any(Date),
      },
    })

    expect(emailClient.send).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: 'メールアドレスの確認',
      body: expect.stringContaining('http://localhost:3000/verify-email?token='),
    })
  })

  it('should return success message for already verified email', async () => {
    const mockCustomer = createMockCustomer({
      emailVerified: true,
    })

    vi.mocked(db.customer.findUnique).mockResolvedValue(mockCustomer)

    const request = new NextRequest('http://localhost/api/auth/verify-email/send', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.message).toBe('メールアドレスは既に確認済みです')

    expect(db.customer.update).not.toHaveBeenCalled()
    expect(emailClient.send).not.toHaveBeenCalled()
  })

  it('should return error for non-existent email', async () => {
    vi.mocked(db.customer.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/auth/verify-email/send', {
      method: 'POST',
      body: JSON.stringify({ email: 'nonexistent@example.com' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Not Found')
    expect(data.message).toBe('ユーザーが見つかりません')

    expect(db.customer.update).not.toHaveBeenCalled()
    expect(emailClient.send).not.toHaveBeenCalled()
  })

  it('should return error for missing email', async () => {
    const request = new NextRequest('http://localhost/api/auth/verify-email/send', {
      method: 'POST',
      body: JSON.stringify({}),
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
      body: JSON.stringify({ email: 'invalid-email' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Bad Request')
    expect(data.message).toBe('入力内容に誤りがあります')
    expect(data.errors).toBeDefined()
  })

  it('should handle email sending failure', async () => {
    const mockCustomer = createMockCustomer({
      emailVerified: false,
    })

    vi.mocked(db.customer.findUnique).mockResolvedValue(mockCustomer)
    vi.mocked(db.customer.update).mockResolvedValue({
      ...mockCustomer,
      emailVerificationToken: 'mock-verification-token-1234567890abcdef',
      emailVerificationExpiry: new Date(Date.now() + 86400000),
    })
    vi.mocked(emailClient.send).mockRejectedValue(new Error('Email service error'))

    const request = new NextRequest('http://localhost/api/auth/verify-email/send', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal Server Error')
    expect(data.message).toBe('メール送信中にエラーが発生しました')
  })

  it('should handle database update failure', async () => {
    const mockCustomer = createMockCustomer({
      emailVerified: false,
    })

    vi.mocked(db.customer.findUnique).mockResolvedValue(mockCustomer)
    vi.mocked(db.customer.update).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/auth/verify-email/send', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal Server Error')
    expect(data.message).toBe('メール送信中にエラーが発生しました')
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
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

vi.mock('@/lib/db', () => ({
  db: {
    customer: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
  },
}))

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reset password with valid token', async () => {
    const mockCustomer = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      nameKana: 'テストユーザー',
      phone: '090-1234-5678',
      password: 'old-hashed-password',
      birthDate: new Date('1990-01-01'),
      memberType: 'regular',
      points: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      resetToken: 'valid-reset-token',
      resetTokenExpiry: new Date(Date.now() + 1800000), // 30 minutes from now
      emailVerified: false,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
    }

    vi.mocked(db.customer.findFirst).mockResolvedValue(mockCustomer)
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-new-password' as any)
    vi.mocked(db.customer.update).mockResolvedValue({
      ...mockCustomer,
      password: 'hashed-new-password',
      resetToken: null,
      resetTokenExpiry: null,
    })

    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid-reset-token',
        password: 'newSecurePassword123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.message).toBe('パスワードが正常にリセットされました')

    expect(db.customer.findFirst).toHaveBeenCalledWith({
      where: {
        resetToken: 'valid-reset-token',
        resetTokenExpiry: {
          gt: expect.any(Date),
        },
      },
    })

    expect(bcrypt.hash).toHaveBeenCalledWith('newSecurePassword123', 12)

    expect(db.customer.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: {
        password: 'hashed-new-password',
        resetToken: null,
        resetTokenExpiry: null,
      },
    })
  })

  it('should return error for invalid token', async () => {
    vi.mocked(db.customer.findFirst).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'invalid-token',
        password: 'newPassword123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Bad Request')
    expect(data.message).toBe('無効または期限切れのトークンです')

    expect(bcrypt.hash).not.toHaveBeenCalled()
    expect(db.customer.update).not.toHaveBeenCalled()
  })

  it('should return error for expired token', async () => {
    const mockCustomer = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      nameKana: 'テストユーザー',
      phone: '090-1234-5678',
      password: 'old-hashed-password',
      birthDate: new Date('1990-01-01'),
      memberType: 'regular',
      points: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      resetToken: 'expired-token',
      resetTokenExpiry: new Date(Date.now() - 3600000), // 1 hour ago
      emailVerified: false,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
    }

    vi.mocked(db.customer.findFirst).mockResolvedValue(null) // Won't find due to expiry condition

    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'expired-token',
        password: 'newPassword123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Bad Request')
    expect(data.message).toBe('無効または期限切れのトークンです')
  })

  it('should return error for missing token', async () => {
    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        password: 'newPassword123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Bad Request')
    expect(data.message).toBe('入力内容に誤りがあります')
  })

  it('should return error for missing password', async () => {
    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid-token',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Bad Request')
    expect(data.message).toBe('入力内容に誤りがあります')
  })

  it('should return error for short password', async () => {
    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid-token',
        password: 'short',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Bad Request')
    expect(data.message).toBe('入力内容に誤りがあります')
  })

  it('should handle database update failure', async () => {
    const mockCustomer = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      nameKana: 'テストユーザー',
      phone: '090-1234-5678',
      password: 'old-hashed-password',
      birthDate: new Date('1990-01-01'),
      memberType: 'regular',
      points: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      resetToken: 'valid-reset-token',
      resetTokenExpiry: new Date(Date.now() + 1800000),
      emailVerified: false,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
    }

    vi.mocked(db.customer.findFirst).mockResolvedValue(mockCustomer)
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-new-password' as any)
    vi.mocked(db.customer.update).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid-reset-token',
        password: 'newSecurePassword123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal Server Error')
    expect(data.message).toBe('パスワードリセットの処理中にエラーが発生しました')
  })

  it('should handle invalid JSON body', async () => {
    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: 'invalid json',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal Server Error')
    expect(data.message).toBe('パスワードリセットの処理中にエラーが発生しました')
  })
})

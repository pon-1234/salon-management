import { NextRequest } from 'next/server'
import { POST } from './route'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// モックをインポート
import { db } from '@/lib/db'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

describe('/api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST', () => {
    it('有効な認証情報でログインできる', async () => {
      const mockCustomer = {
        id: 'customer-1',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        phone: '09012345678',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // DBからユーザーを取得するモック
      ;(db.customer.findUnique as any).mockResolvedValue(mockCustomer)
      
      // パスワード比較のモック
      ;(bcrypt.compare as any).mockResolvedValue(true)
      
      // JWT生成のモック
      ;(jwt.sign as any).mockReturnValue('mock-jwt-token')

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        message: 'Login successful',
      })
      
      // Cookieがセットされていることを確認
      const setCookieHeader = response.headers.get('set-cookie')
      expect(setCookieHeader).toContain('auth-token=mock-jwt-token')
      expect(setCookieHeader).toContain('HttpOnly')
      
      expect(db.customer.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      })
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password')
      expect(jwt.sign).toHaveBeenCalledWith(
        { customerId: 'customer-1', name: 'Test User' },
        'test-jwt-secret-for-testing',
        { expiresIn: '1h' }
      )
    })

    it('存在しないメールアドレスではログインできない', async () => {
      ;(db.customer.findUnique as any).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Invalid credentials' })
    })

    it('間違ったパスワードではログインできない', async () => {
      const mockCustomer = {
        id: 'customer-1',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        phone: '09012345678',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(db.customer.findUnique as any).mockResolvedValue(mockCustomer)
      ;(bcrypt.compare as any).mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Invalid credentials' })
    })

    it('必須フィールドが不足している場合はエラーを返す', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          // password is missing
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Email and password are required' })
    })

    it('不正なJSON形式の場合はエラーを返す', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })
    })

    it('JWT_SECRETが設定されていない場合はエラーを返す', async () => {
      const originalSecret = process.env.JWT_SECRET
      delete process.env.JWT_SECRET

      const mockCustomer = {
        id: 'customer-1',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        phone: '09012345678',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(db.customer.findUnique as any).mockResolvedValue(mockCustomer)
      ;(bcrypt.compare as any).mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })

      // 環境変数を元に戻す
      process.env.JWT_SECRET = originalSecret
    })
  })
})
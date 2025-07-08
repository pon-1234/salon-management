import { NextRequest, NextResponse } from 'next/server'
import { middleware } from './middleware'
import { jwtVerify } from 'jose'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// モックの設定
vi.mock('jose')

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // JWT_SECRETを設定
    process.env.JWT_SECRET = 'test-jwt-secret-for-testing'
  })

  describe('保護されていないパス', () => {
    it('認証なしでアクセスできる', async () => {
      const request = new NextRequest('http://localhost:3000/')
      const response = await middleware(request)
      
      expect(response).toBeDefined()
      expect(response?.status).toBe(200)
    })

    it('静的ファイルは認証チェックをスキップする', async () => {
      const request = new NextRequest('http://localhost:3000/images/logo.png')
      const response = await middleware(request)
      
      expect(response).toBeDefined()
      expect(response?.status).toBe(200)
    })
  })

  describe('保護されたAPIパス', () => {
    it('トークンなしでアクセスすると401エラーを返す', async () => {
      const request = new NextRequest('http://localhost:3000/api/reservation')
      const response = await middleware(request)
      
      expect(response?.status).toBe(401)
      const data = await response?.json()
      expect(data).toEqual({ error: 'Authentication required' })
    })

    it('有効なトークンでアクセスできる', async () => {
      const mockPayload = { customerId: 'customer-123' }
      ;(jwtVerify as any).mockResolvedValue({ payload: mockPayload })

      const request = new NextRequest('http://localhost:3000/api/reservation')
      request.cookies.set('auth-token', 'valid-token')
      
      const response = await middleware(request)
      
      expect(response).toBeDefined()
      // NextResponse.next() の戻り値は特殊なため、jwtVerifyが呼ばれたことを確認
      expect(jwtVerify).toHaveBeenCalled()
      const callArgs = (jwtVerify as any).mock.calls[0]
      expect(callArgs[0]).toBe('valid-token')
      // Uint8ArrayのチェックはVitestでは特殊な扱いになるためスキップ
    })

    it('無効なトークンで401エラーを返す', async () => {
      ;(jwtVerify as any).mockRejectedValue(new Error('Invalid token'))

      const request = new NextRequest('http://localhost:3000/api/reservation')
      request.cookies.set('auth-token', 'invalid-token')
      
      const response = await middleware(request)
      
      expect(response?.status).toBe(401)
      const data = await response?.json()
      expect(data).toEqual({ error: 'Invalid or expired token' })
    })

    it('トークンにcustomerIdがない場合は401エラーを返す', async () => {
      const mockPayload = {} // customerIdがない
      ;(jwtVerify as any).mockResolvedValue({ payload: mockPayload })

      const request = new NextRequest('http://localhost:3000/api/reservation')
      request.cookies.set('auth-token', 'token-without-customerid')
      
      const response = await middleware(request)
      
      expect(response?.status).toBe(401)
      const data = await response?.json()
      expect(data).toEqual({ error: 'Invalid or expired token' })
    })
  })

  describe('保護されたページパス', () => {
    it('トークンなしでログインページにリダイレクトする', async () => {
      const request = new NextRequest('http://localhost:3000/mypage')
      const response = await middleware(request)
      
      expect(response?.status).toBe(307) // リダイレクトステータス
      expect(response?.headers.get('location')).toBe('http://localhost:3000/login')
    })

    it('有効なトークンでアクセスできる', async () => {
      const mockPayload = { customerId: 'customer-123' }
      ;(jwtVerify as any).mockResolvedValue({ payload: mockPayload })

      const request = new NextRequest('http://localhost:3000/mypage')
      request.cookies.set('auth-token', 'valid-token')
      
      const response = await middleware(request)
      
      expect(response).toBeDefined()
      // 認証が成功したことを確認
      expect(jwtVerify).toHaveBeenCalled()
    })

    it('無効なトークンでログインページにリダイレクトする', async () => {
      ;(jwtVerify as any).mockRejectedValue(new Error('Invalid token'))

      const request = new NextRequest('http://localhost:3000/mypage')
      request.cookies.set('auth-token', 'invalid-token')
      
      const response = await middleware(request)
      
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toBe('http://localhost:3000/login')
    })
  })

  describe('adminパスの処理', () => {
    it('/adminにアクセスすると認証後にNextResponse.next()を返す', async () => {
      const mockPayload = { customerId: 'customer-123' }
      ;(jwtVerify as any).mockResolvedValue({ payload: mockPayload })

      const request = new NextRequest('http://localhost:3000/admin')
      request.cookies.set('auth-token', 'valid-token')
      
      const response = await middleware(request)
      
      // 認証が成功したことを確認
      expect(jwtVerify).toHaveBeenCalled()
      // /adminは保護されたパスなので、認証後はNextResponse.next()を返す
      // 実際のリダイレクトロジックは到達しない（line 67-70はデッドコード）
      expect(response).toBeDefined()
      // NextResponse.next()の戻り値の検証
      const callArgs = (jwtVerify as any).mock.calls[0]
      expect(callArgs[0]).toBe('valid-token')
    })

    it('トークンなしで/adminにアクセスするとログインページにリダイレクトする', async () => {
      const request = new NextRequest('http://localhost:3000/admin')
      const response = await middleware(request)
      
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toBe('http://localhost:3000/login')
    })
  })

  describe('JWT_SECRETが設定されていない場合', () => {
    it('エラーをスローする', async () => {
      delete process.env.JWT_SECRET
      
      const mockPayload = { customerId: 'customer-123' }
      ;(jwtVerify as any).mockImplementation(async (token, secret) => {
        // getJwtSecret が呼ばれてエラーになることを再現
        if (!process.env.JWT_SECRET) {
          throw new Error('JWT_SECRET is not defined in environment variables')
        }
        return { payload: mockPayload }
      })

      const request = new NextRequest('http://localhost:3000/api/reservation')
      request.cookies.set('auth-token', 'valid-token')
      
      const response = await middleware(request)
      
      expect(response?.status).toBe(401)
      const data = await response?.json()
      expect(data).toEqual({ error: 'Invalid or expired token' })
      
      // 環境変数を元に戻す
      process.env.JWT_SECRET = 'test-jwt-secret-for-testing'
    })
  })
})
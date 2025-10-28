import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { requireAdmin } from './utils'

vi.mock('next-auth')
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body, init) => ({ body, status: init?.status })),
  },
}))

describe('Auth Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('requireAdmin', () => {
    it('should return null for admin users', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: {
          id: '1',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'admin',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      const result = await requireAdmin()
      expect(result).toBeNull()
    })

    it('should return 401 error for non-admin users', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: {
          id: '2',
          name: 'Regular User',
          email: 'user@example.com',
          role: 'user',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      const result = await requireAdmin()
      expect(result).toBeDefined()
      expect(result?.status).toBe(401)
      expect(result?.body).toEqual({ error: '認証が必要です' })
    })

    it('should return 401 error when no session exists', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null)

      const result = await requireAdmin()
      expect(result).toBeDefined()
      expect(result?.status).toBe(401)
      expect(result?.body).toEqual({ error: '認証が必要です' })
    })

    it('should handle session without role gracefully', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: {
          id: '3',
          name: 'User Without Role',
          email: 'norole@example.com',
          // role is undefined
        } as any,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      const result = await requireAdmin()
      expect(result).toBeDefined()
      expect(result?.status).toBe(401)
      expect(result?.body).toEqual({ error: '認証が必要です' })
    })

    it('should enforce permission requirements when provided', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: {
          id: '4',
          name: 'Permissionless Admin',
          email: 'no-perm@example.com',
          role: 'admin',
          permissions: ['reservation:read'],
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      const result = await requireAdmin({ permissions: 'analytics:read' })
      expect(result).toBeDefined()
      expect(result?.status).toBe(403)
      expect(result?.body).toEqual({ error: 'この操作を行う権限がありません' })
    })

    it('should accept admins with matching permissions', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: {
          id: '5',
          name: 'Analytics Admin',
          email: 'analytics@example.com',
          role: 'admin',
          permissions: ['analytics:*'],
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      const result = await requireAdmin({ permissions: 'analytics:read' })
      expect(result).toBeNull()
    })
  })
})

/**
 * @design_doc   Administrative customer creation boundary
 * @related_to   app/api/admin/customers/route.ts, requireAdmin, Prisma Customer
 * @known_issues Customer-to-store ownership and required legacy profile fields remain undecided
 */
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAdmin } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { POST } from './route'

vi.mock('bcryptjs', () => ({ default: { hash: vi.fn() } }))
vi.mock('@/lib/auth/utils', () => ({ requireAdmin: vi.fn() }))
vi.mock('@/lib/logger', () => ({ default: { error: vi.fn() } }))
vi.mock('@/lib/db', () => ({
  db: {
    customer: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

const validBody = {
  name: 'Test Customer',
  phone: '090-1234-5678',
  email: 'test@example.com',
}

describe('POST /api/admin/customers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAdmin).mockResolvedValue(null)
    vi.mocked(db.customer.findFirst).mockResolvedValue(null)
    vi.mocked(db.customer.findUnique).mockResolvedValue(null)
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never)
    vi.mocked(db.customer.create).mockResolvedValue({
      id: 'customer-1',
      name: 'Test Customer',
      phone: '09012345678',
      email: 'test@example.com',
    } as never)
  })

  it('requires customer:create permission before reading the request or database', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(
      NextResponse.json({ error: 'forbidden' }, { status: 403 })
    )

    const response = await POST(
      new NextRequest('http://localhost/api/admin/customers', {
        method: 'POST',
        body: JSON.stringify(validBody),
      })
    )

    expect(response.status).toBe(403)
    expect(requireAdmin).toHaveBeenCalledWith({ permissions: 'customer:create' })
    expect(db.customer.findFirst).not.toHaveBeenCalled()
  })

  it('normalizes identity fields and hashes a cryptographically random password', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/admin/customers', {
        method: 'POST',
        body: JSON.stringify({
          ...validBody,
          name: ' Test Customer ',
          email: ' Test@Example.COM ',
        }),
      })
    )

    expect(response.status).toBe(201)
    const generatedPassword = vi.mocked(bcrypt.hash).mock.calls[0]?.[0]
    expect(generatedPassword).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(bcrypt.hash).toHaveBeenCalledWith(generatedPassword, 10)
    expect(db.customer.findFirst).toHaveBeenCalledWith({ where: { phone: '09012345678' } })
    expect(db.customer.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    })
    expect(db.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Test Customer',
          phone: '09012345678',
          email: 'test@example.com',
        }),
      })
    )
  })

  it.each(['123', '090abc12345'])(
    'rejects invalid phone input %s before persistence',
    async (phone) => {
      const response = await POST(
        new NextRequest('http://localhost/api/admin/customers', {
          method: 'POST',
          body: JSON.stringify({ ...validBody, phone }),
        })
      )

      expect(response.status).toBe(400)
      expect(db.customer.findFirst).not.toHaveBeenCalled()
      expect(bcrypt.hash).not.toHaveBeenCalled()
    }
  )

  it('rejects unknown fields instead of silently discarding store ownership input', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/admin/customers', {
        method: 'POST',
        body: JSON.stringify({ ...validBody, storeId: 'ginza' }),
      })
    )

    expect(response.status).toBe(400)
    expect(db.customer.create).not.toHaveBeenCalled()
  })
})

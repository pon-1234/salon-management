/**
 * @design_doc   Administrative customer creation boundary
 * @related_to   app/api/admin/customers/route.ts, requireAdmin, Prisma Customer
 * @known_issues None
 */
import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAdmin } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { ensureStoreId, resolveStoreId } from '@/lib/store/server'
import { POST } from './route'

vi.mock('@/lib/auth/utils', () => ({ requireAdmin: vi.fn() }))
vi.mock('@/lib/logger', () => ({ default: { error: vi.fn() } }))
vi.mock('@/lib/store/server', () => ({
  ensureStoreId: vi.fn(),
  resolveStoreId: vi.fn(),
}))
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
    vi.mocked(resolveStoreId).mockResolvedValue('legacy-store-ikebukuro')
    vi.mocked(ensureStoreId).mockResolvedValue('legacy-store-ikebukuro')
    vi.mocked(db.customer.findFirst).mockResolvedValue(null)
    vi.mocked(db.customer.findUnique).mockResolvedValue(null)
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
      new NextRequest('http://localhost/api/admin/customers?storeId=legacy-store-ikebukuro', {
        method: 'POST',
        body: JSON.stringify(validBody),
      })
    )

    expect(response.status).toBe(403)
    expect(requireAdmin).toHaveBeenCalledTimes(1)
    expect(requireAdmin).toHaveBeenCalledWith({ permissions: 'customer:create' })
    expect(resolveStoreId).not.toHaveBeenCalled()
    expect(ensureStoreId).not.toHaveBeenCalled()
    expect(db.customer.findFirst).not.toHaveBeenCalled()
  })

  it('checks the authorized store scope before reading customer data', async () => {
    vi.mocked(requireAdmin)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(NextResponse.json({ error: 'store forbidden' }, { status: 403 }))

    const response = await POST(
      new NextRequest('http://localhost/api/admin/customers?storeId=legacy-store-ikebukuro', {
        method: 'POST',
        body: JSON.stringify(validBody),
      })
    )

    expect(response.status).toBe(403)
    expect(requireAdmin).toHaveBeenNthCalledWith(1, { permissions: 'customer:create' })
    expect(requireAdmin).toHaveBeenNthCalledWith(2, {
      permissions: 'customer:create',
      storeId: 'legacy-store-ikebukuro',
    })
    expect(db.customer.findFirst).not.toHaveBeenCalled()
    expect(db.customer.create).not.toHaveBeenCalled()
  })

  it('normalizes supplied identity fields without inventing login credentials', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/admin/customers?storeId=legacy-store-ikebukuro', {
        method: 'POST',
        body: JSON.stringify({
          ...validBody,
          name: ' Test Customer ',
          email: ' Test@Example.COM ',
        }),
      })
    )

    expect(response.status).toBe(201)
    expect(requireAdmin).toHaveBeenNthCalledWith(1, { permissions: 'customer:create' })
    expect(requireAdmin).toHaveBeenNthCalledWith(2, {
      permissions: 'customer:create',
      storeId: 'legacy-store-ikebukuro',
    })
    expect(db.customer.findFirst).toHaveBeenCalledWith({
      where: { phone: { in: ['+819012345678', '09012345678', '819012345678'] } },
    })
    expect(db.customer.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    })
    expect(db.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Test Customer',
          nameKana: null,
          phone: '+819012345678',
          email: 'test@example.com',
          password: null,
          birthDate: null,
          storeAssignments: {
            create: { storeId: 'legacy-store-ikebukuro' },
          },
        }),
      })
    )
  })

  it('persists a phone-intake customer with only name, phone, and Ikebukuro ownership', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/admin/customers?storeId=legacy-store-ikebukuro', {
        method: 'POST',
        body: JSON.stringify({ name: ' 名前のみ ', phone: '090-1234-5678' }),
      })
    )

    expect(response.status).toBe(201)
    expect(db.customer.findUnique).not.toHaveBeenCalled()
    expect(db.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: '名前のみ',
          nameKana: null,
          phone: '+819012345678',
          email: null,
          password: null,
          birthDate: null,
          emailNotificationEnabled: false,
          storeAssignments: {
            create: { storeId: 'legacy-store-ikebukuro' },
          },
        }),
      })
    )
  })

  it('accepts an E.164 phone without creating a second identity form', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/admin/customers?storeId=legacy-store-ikebukuro', {
        method: 'POST',
        body: JSON.stringify({ ...validBody, phone: '+81 90 1234 5678' }),
      })
    )

    expect(response.status).toBe(201)
    expect(db.customer.findFirst).toHaveBeenCalledWith({
      where: { phone: { in: ['+819012345678', '09012345678', '819012345678'] } },
    })
    expect(db.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phone: '+819012345678' }),
      })
    )
  })

  it('accepts the explicit optional trunk notation as the same fixed-line identity', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/admin/customers?storeId=legacy-store-ikebukuro', {
        method: 'POST',
        body: JSON.stringify({ ...validBody, phone: '+81 (0)3-1234-5678' }),
      })
    )

    expect(response.status).toBe(201)
    expect(db.customer.findFirst).toHaveBeenCalledWith({
      where: { phone: { in: ['+81312345678', '0312345678', '81312345678'] } },
    })
    expect(db.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phone: '+81312345678' }),
      })
    )
  })

  it.each([
    '123',
    '090abc12345',
    '090-123-4567',
    '050-123-4567',
    '03-1234-56789',
    '0120-1234-567',
    '0570-1234-567',
    '0800-123-456',
  ])('rejects invalid phone input %s before persistence', async (phone) => {
    const response = await POST(
      new NextRequest('http://localhost/api/admin/customers?storeId=legacy-store-ikebukuro', {
        method: 'POST',
        body: JSON.stringify({ ...validBody, phone }),
      })
    )

    expect(response.status).toBe(400)
    expect(db.customer.findFirst).not.toHaveBeenCalled()
  })

  it('rejects unknown fields instead of silently discarding store ownership input', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/admin/customers?storeId=legacy-store-ikebukuro', {
        method: 'POST',
        body: JSON.stringify({ ...validBody, storeId: 'ginza' }),
      })
    )

    expect(response.status).toBe(400)
    expect(db.customer.create).not.toHaveBeenCalled()
  })
})

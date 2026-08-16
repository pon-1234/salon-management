/**
 * @design_doc   Designation-fee RBAC and store boundary
 * @related_to   designation-fee route and pricing permissions
 * @known_issues None currently
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/utils'
import { DELETE, GET, POST, PUT } from './route'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth/config', () => ({ authOptions: {} }))
vi.mock('@/lib/config/env', () => ({
  env: { featureFlags: { useMockFallbacks: false } },
}))
vi.mock('@/lib/auth/utils', () => ({ requireAdmin: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: {
    store: { findUnique: vi.fn() },
    designationFee: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))
vi.mock('@/lib/logger', () => ({ default: { error: vi.fn() } }))

describe('designation-fee mutation authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.store.findUnique).mockResolvedValue({ id: 'store-a' } as never)
    vi.mocked(requireAdmin).mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    )
  })

  it.each([
    {
      method: 'POST',
      permission: 'pricing:create',
      invoke: () =>
        POST(
          new NextRequest('http://localhost/api/designation-fee?storeId=store-a', {
            method: 'POST',
            body: JSON.stringify({ name: '本指名', price: 1000 }),
          })
        ),
    },
    {
      method: 'PUT',
      permission: 'pricing:update',
      invoke: () =>
        PUT(
          new NextRequest('http://localhost/api/designation-fee?storeId=store-a', {
            method: 'PUT',
            body: JSON.stringify({ id: 'fee-1', price: 1200 }),
          })
        ),
    },
    {
      method: 'DELETE',
      permission: 'pricing:delete',
      invoke: () =>
        DELETE(
          new NextRequest('http://localhost/api/designation-fee?id=fee-1&storeId=store-a', {
            method: 'DELETE',
          })
        ),
    },
  ])('rejects $method before database mutation', async ({ permission, invoke }) => {
    const response = await invoke()

    expect(response.status).toBe(403)
    expect(requireAdmin).toHaveBeenCalledWith({ permissions: permission, storeId: 'store-a' })
    expect(db.designationFee.create).not.toHaveBeenCalled()
    expect(db.designationFee.update).not.toHaveBeenCalled()
    expect(db.designationFee.delete).not.toHaveBeenCalled()
  })
})

describe('designation-fee production reads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.store.findUnique).mockResolvedValue({ id: 'store-a' } as never)
    vi.mocked(getServerSession).mockResolvedValue({ user: { role: 'admin' } } as never)
    vi.mocked(requireAdmin).mockResolvedValue(null)
  })

  it('returns a JSON 404 when the requested store does not exist', async () => {
    vi.mocked(db.store.findUnique).mockResolvedValueOnce(null).mockResolvedValueOnce(null)

    const response = await GET(
      new NextRequest('http://localhost/api/designation-fee?storeId=unknown-store')
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Unknown store' })
  })

  it('returns a JSON 500 when DELETE store resolution fails', async () => {
    vi.mocked(db.store.findUnique).mockRejectedValueOnce(new Error('database unavailable'))

    const response = await DELETE(
      new NextRequest('http://localhost/api/designation-fee?id=fee-1&storeId=broken-store', {
        method: 'DELETE',
      })
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Internal server error' })
  })

  it('returns an empty list instead of fabricated fees when no rows exist', async () => {
    vi.mocked(db.designationFee.findMany).mockResolvedValue([])

    const response = await GET(
      new NextRequest('http://localhost/api/designation-fee?storeId=store-a')
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([])
  })

  it('returns 500 instead of fabricated fees when the database fails', async () => {
    vi.mocked(db.designationFee.findMany).mockRejectedValue(new Error('database unavailable'))

    const response = await GET(
      new NextRequest('http://localhost/api/designation-fee?storeId=store-a')
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Internal server error' })
  })

  it('removes internal revenue shares from customer responses', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'customer-1', role: 'customer' },
    } as never)
    vi.mocked(db.designationFee.findMany).mockResolvedValue([
      {
        id: 'fee-1',
        storeId: 'store-a',
        name: '本指名',
        price: 2000,
        description: 'desc',
        sortOrder: 1,
        isActive: true,
        storeShare: 800,
        castShare: 1200,
      },
    ] as never)

    const response = await GET(
      new NextRequest('http://localhost/api/designation-fee?storeId=store-a')
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([
      {
        id: 'fee-1',
        name: '本指名',
        price: 2000,
        description: 'desc',
        sortOrder: 1,
      },
    ])
  })

  it('requires pricing read permission for administrators before returning internal shares', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin-1', role: 'admin' },
    } as never)
    vi.mocked(requireAdmin).mockResolvedValueOnce(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    )

    const response = await GET(
      new NextRequest('http://localhost/api/designation-fee?storeId=store-a&includeInactive=true')
    )

    expect(response.status).toBe(403)
    expect(requireAdmin).toHaveBeenCalledWith({ permissions: 'pricing:read', storeId: 'store-a' })
    expect(db.designationFee.findMany).not.toHaveBeenCalled()
  })
})

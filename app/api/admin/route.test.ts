/**
 * @design_doc   Multi-store administrator account management
 * @related_to   AdminStoreAssignment, auth/config.ts, contexts/store-context.tsx
 * @known_issues None
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import logger from '@/lib/logger'
import { DELETE, GET, POST, PUT } from './route'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth/config', () => ({ authOptions: {} }))
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn() } }))
vi.mock('@/lib/logger', () => ({ default: { error: vi.fn() } }))
vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn(),
    store: {
      count: vi.fn(),
    },
    admin: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

const timestamps = {
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  lastLogin: null,
}

describe('/api/admin store assignments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'super-1', role: 'admin', adminRole: 'super_admin', permissions: ['*'] },
    } as any)
    vi.mocked(db.store.count).mockImplementation((({ where }: any) =>
      Promise.resolve(where.id.in.length)) as any)
    vi.mocked(db.$transaction).mockImplementation((async (operation: any) => operation(db)) as any)
  })

  it('returns assigned store IDs with each administrator', async () => {
    vi.mocked(db.admin.findMany).mockResolvedValue([
      {
        id: 'manager-1',
        email: 'manager@example.com',
        name: 'Manager',
        role: 'manager',
        permissions: ['reservation:*'],
        isActive: true,
        storeAssignments: [{ storeId: 'ginza' }],
        ...timestamps,
      },
    ] as any)

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.admins[0].storeIds).toEqual(['ginza'])
    expect(db.admin.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: expect.any(Object) })
    )
  })

  it('rejects a non-super administrator without a store assignment', async () => {
    const request = new NextRequest('http://localhost/api/admin', {
      method: 'POST',
      body: JSON.stringify({
        email: 'manager@example.com',
        name: 'Manager',
        password: 'password123',
        role: 'manager',
        storeIds: [],
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(db.admin.create).not.toHaveBeenCalled()
  })

  it('rejects a new administrator password shorter than 16 characters', async () => {
    const request = new NextRequest('http://localhost/api/admin', {
      method: 'POST',
      body: JSON.stringify({
        email: 'manager@example.com',
        name: 'Manager',
        password: 'only-15-chars!!',
        role: 'manager',
        storeIds: ['ginza'],
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(bcrypt.hash).not.toHaveBeenCalled()
    expect(db.admin.create).not.toHaveBeenCalled()
  })

  it('creates explicit store assignments for a non-super administrator', async () => {
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed' as never)
    vi.mocked(db.admin.create).mockImplementation((async ({ data }: any) => ({
      id: 'manager-1',
      email: data.email,
      name: data.name,
      role: data.role,
      permissions: data.permissions,
      isActive: data.isActive,
      storeAssignments: [{ storeId: 'ginza' }],
      ...timestamps,
    })) as any)
    const request = new NextRequest('http://localhost/api/admin', {
      method: 'POST',
      body: JSON.stringify({
        email: 'manager@example.com',
        name: 'Manager',
        password: 'strong-password-123',
        role: 'manager',
        storeIds: ['ginza'],
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload.admin.storeIds).toEqual(['ginza'])
    expect(db.admin.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        permissions: expect.stringContaining('pricing:*'),
        storeAssignments: { create: [{ storeId: 'ginza' }] },
      }),
      include: expect.any(Object),
    })
  })

  it('rejects assignments to an unknown or inactive store', async () => {
    vi.mocked(db.store.count).mockResolvedValue(0)
    const request = new NextRequest('http://localhost/api/admin', {
      method: 'POST',
      body: JSON.stringify({
        email: 'manager@example.com',
        name: 'Manager',
        password: 'password123',
        role: 'manager',
        storeIds: ['missing-store'],
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(db.admin.create).not.toHaveBeenCalled()
  })

  it('replaces store assignments during administrator update', async () => {
    vi.mocked(db.admin.findUnique).mockResolvedValue({
      id: 'manager-1',
      email: 'manager@example.com',
      name: 'Manager',
      role: 'manager',
      permissions: ['reservation:*'],
      isActive: true,
      storeAssignments: [{ storeId: 'ginza' }],
      ...timestamps,
    } as any)
    vi.mocked(db.admin.update).mockImplementation((async ({ data }: any) => ({
      id: 'manager-1',
      email: 'manager@example.com',
      name: 'Manager',
      role: 'manager',
      permissions: ['reservation:*'],
      isActive: true,
      storeAssignments: data.storeAssignments.create,
      ...timestamps,
    })) as any)
    const request = new NextRequest('http://localhost/api/admin', {
      method: 'PUT',
      body: JSON.stringify({ id: 'manager-1', storeIds: ['shinjuku'] }),
    })

    const response = await PUT(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.admin.storeIds).toEqual(['shinjuku'])
    expect(db.admin.update).toHaveBeenCalledWith({
      where: { id: 'manager-1' },
      data: {
        storeAssignments: {
          deleteMany: {},
          create: [{ storeId: 'shinjuku' }],
        },
      },
      include: expect.any(Object),
    })
  })

  it('rejects an updated administrator password shorter than 16 characters', async () => {
    const request = new NextRequest('http://localhost/api/admin', {
      method: 'PUT',
      body: JSON.stringify({ id: 'manager-1', password: 'only-15-chars!!' }),
    })

    const response = await PUT(request)

    expect(response.status).toBe(400)
    expect(bcrypt.hash).not.toHaveBeenCalled()
    expect(db.admin.update).not.toHaveBeenCalled()
  })

  it('does not allow PUT to deactivate the last active super administrator', async () => {
    vi.mocked(db.admin.findUnique).mockResolvedValue({
      id: 'super-2',
      email: 'second-super@example.com',
      name: 'Second Super',
      role: 'super_admin',
      permissions: ['*'],
      isActive: true,
      storeAssignments: [],
      ...timestamps,
    } as any)
    vi.mocked(db.admin.count).mockResolvedValue(0)

    const response = await PUT(
      new NextRequest('http://localhost/api/admin', {
        method: 'PUT',
        body: JSON.stringify({ id: 'super-2', isActive: false }),
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: '少なくとも1名のスーパー管理者が必要です',
    })
    expect(db.admin.update).not.toHaveBeenCalled()
  })

  it('deactivates an administrator without deleting its audit relationships', async () => {
    vi.mocked(db.admin.findUnique).mockResolvedValue({
      id: 'manager-1',
      role: 'manager',
      isActive: true,
    } as any)
    vi.mocked(db.admin.update).mockResolvedValue({ id: 'manager-1', isActive: false } as any)

    const response = await DELETE(
      new NextRequest('http://localhost/api/admin?id=manager-1', { method: 'DELETE' })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true, deactivated: true })
    expect(db.admin.update).toHaveBeenCalledWith({
      where: { id: 'manager-1' },
      data: { isActive: false },
    })
    expect(db.admin.delete).not.toHaveBeenCalled()
  })

  it('treats repeated deactivation as an idempotent no-write operation', async () => {
    vi.mocked(db.admin.findUnique).mockResolvedValue({
      id: 'manager-1',
      role: 'manager',
      isActive: false,
    } as any)

    const response = await DELETE(
      new NextRequest('http://localhost/api/admin?id=manager-1', { method: 'DELETE' })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true, deactivated: false })
    expect(db.admin.count).not.toHaveBeenCalled()
    expect(db.admin.update).not.toHaveBeenCalled()
    expect(db.admin.delete).not.toHaveBeenCalled()
  })

  it('checks and deactivates an active super administrator in one serializable transaction', async () => {
    vi.mocked(db.admin.findUnique).mockResolvedValue({
      id: 'super-2',
      role: 'super_admin',
      isActive: true,
    } as any)
    vi.mocked(db.admin.count).mockResolvedValue(1)
    vi.mocked(db.admin.update).mockResolvedValue({ id: 'super-2', isActive: false } as any)

    const response = await DELETE(
      new NextRequest('http://localhost/api/admin?id=super-2', { method: 'DELETE' })
    )

    expect(response.status).toBe(200)
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    })
  })

  it('fails safely when concurrent super administrator deactivations conflict', async () => {
    const conflict = Object.assign(new Error('query included private@example.com'), {
      code: 'P2034',
    })
    vi.mocked(db.admin.findUnique).mockResolvedValue({
      id: 'super-2',
      role: 'super_admin',
      isActive: true,
    } as any)
    vi.mocked(db.admin.count).mockResolvedValue(1)
    vi.mocked(db.admin.update).mockResolvedValue({ id: 'super-2', isActive: false } as any)
    vi.mocked(db.$transaction)
      .mockImplementationOnce((async (operation: any) => operation(db)) as any)
      .mockRejectedValueOnce(conflict)

    const responses = await Promise.all([
      DELETE(new NextRequest('http://localhost/api/admin?id=super-2', { method: 'DELETE' })),
      DELETE(new NextRequest('http://localhost/api/admin?id=super-3', { method: 'DELETE' })),
    ])

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409])
    expect(vi.mocked(logger.error).mock.calls.flat()).not.toContain(conflict)
  })

  it('does not log an exception that may contain submitted credentials', async () => {
    const sensitiveError = new Error('email=private@example.com password=secret-password-123')
    vi.mocked(db.admin.create).mockRejectedValue(sensitiveError)

    const response = await POST(
      new NextRequest('http://localhost/api/admin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'private@example.com',
          name: 'Private Admin',
          password: 'secret-password-123',
          role: 'super_admin',
          storeIds: [],
        }),
      })
    )

    expect(response.status).toBe(500)
    expect(vi.mocked(logger.error).mock.calls.flat()).not.toContain(sensitiveError)
  })
})

/**
 * @design_doc   docs/VPS_DEPLOYMENT.md
 * @related_to   scripts/setup-admin.ts - Production-safe admin bootstrap CLI
 * @known_issues None
 */
import { describe, expect, it, vi } from 'vitest'
import { bootstrapAdmin, parseAdminBootstrapConfig, type AdminBootstrapDatabase } from './bootstrap'

const strongPassword = 'Fresh-Admin-Secret-2026!'

function createDatabase(overrides?: {
  existingAdmin?: {
    id: string
    email: string
    name: string
    password: string
    role: string
    permissions: unknown
    isActive: boolean
    storeAssignments: Array<{ storeId: string }>
  } | null
  existingStoreIds?: string[]
}) {
  const transaction = {
    store: {
      findMany: vi
        .fn()
        .mockResolvedValue((overrides?.existingStoreIds ?? ['store-1']).map((id) => ({ id }))),
    },
    admin: {
      findUnique: vi.fn().mockResolvedValue(overrides?.existingAdmin ?? null),
      create: vi.fn().mockResolvedValue({ id: 'admin-created' }),
      update: vi.fn().mockResolvedValue({ id: overrides?.existingAdmin?.id ?? 'admin-existing' }),
    },
    adminStoreAssignment: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  }

  const database = {
    $transaction: vi.fn(async (operation) => operation(transaction)),
  } as unknown as AdminBootstrapDatabase

  return { database, transaction }
}

describe('parseAdminBootstrapConfig', () => {
  it('derives a super administrator with only the global permission', () => {
    const config = parseAdminBootstrapConfig([], {
      ADMIN_BOOTSTRAP_EMAIL: ' OWNER@EXAMPLE.COM ',
      ADMIN_BOOTSTRAP_NAME: ' Production Owner ',
      ADMIN_BOOTSTRAP_PASSWORD: strongPassword,
      ADMIN_BOOTSTRAP_ROLE: 'super_admin',
    })

    expect(config).toEqual({
      email: 'owner@example.com',
      name: 'Production Owner',
      password: strongPassword,
      role: 'super_admin',
      permissions: ['*'],
      storeIds: [],
      allowExistingUpdate: false,
    })
  })

  it('accepts an explicit manager permission subset and store list from arguments', () => {
    const config = parseAdminBootstrapConfig(
      [
        '--email=manager@example.com',
        '--name',
        'Store Manager',
        '--password',
        strongPassword,
        '--role=manager',
        '--permissions=reservation:read,customer:read',
        '--store-ids=store-1,store-2,store-1',
        '--allow-existing-update',
      ],
      {}
    )

    expect(config).toMatchObject({
      role: 'manager',
      permissions: ['reservation:read', 'customer:read'],
      storeIds: ['store-1', 'store-2'],
      allowExistingUpdate: true,
    })
  })

  it.each([
    [{ ADMIN_BOOTSTRAP_PASSWORD: 'too-short' }, /at least 16/i],
    [
      {
        ADMIN_BOOTSTRAP_ROLE: 'manager',
        ADMIN_BOOTSTRAP_PERMISSIONS: 'reservation:read',
      },
      /store/i,
    ],
    [
      {
        ADMIN_BOOTSTRAP_ROLE: 'manager',
        ADMIN_BOOTSTRAP_STORE_IDS: 'store-1',
        ADMIN_BOOTSTRAP_PERMISSIONS: '*',
      },
      /permission/i,
    ],
    [
      {
        ADMIN_BOOTSTRAP_ROLE: 'manager',
        ADMIN_BOOTSTRAP_STORE_IDS: 'store-1',
        ADMIN_BOOTSTRAP_PERMISSIONS: 'admin:delete',
      },
      /permission/i,
    ],
    [
      {
        ADMIN_BOOTSTRAP_ROLE: 'manager',
        ADMIN_BOOTSTRAP_STORE_IDS: 'store-1',
        ADMIN_BOOTSTRAP_PERMISSIONS: 'customer:delete',
      },
      /permission/i,
    ],
  ])('rejects unsafe input before database access', (partialEnv, expectedMessage) => {
    expect(() =>
      parseAdminBootstrapConfig([], {
        ADMIN_BOOTSTRAP_EMAIL: 'owner@example.com',
        ADMIN_BOOTSTRAP_NAME: 'Owner',
        ADMIN_BOOTSTRAP_PASSWORD: strongPassword,
        ADMIN_BOOTSTRAP_ROLE: 'super_admin',
        ...partialEnv,
      })
    ).toThrow(expectedMessage)
  })
})

describe('bootstrapAdmin', () => {
  it('revalidates malformed direct-call input before opening a transaction', async () => {
    const { database } = createDatabase()

    await expect(
      bootstrapAdmin({
        database,
        hashPassword: vi.fn(),
        verifyPassword: vi.fn(),
        config: {
          email: 'NOT-AN-EMAIL',
          name: 'Manager',
          password: strongPassword,
          role: 'manager',
          permissions: ['reservation:read'],
          storeIds: ['store-1'],
          allowExistingUpdate: false,
        },
      })
    ).rejects.toThrow(/email/i)

    expect(database.$transaction).not.toHaveBeenCalled()
  })

  it('creates a manager and its assignments atomically with the exact permissions', async () => {
    const { database, transaction } = createDatabase({
      existingStoreIds: ['store-1', 'store-2'],
    })
    const hashPassword = vi.fn().mockResolvedValue('secure-hash')

    const result = await bootstrapAdmin({
      database,
      hashPassword,
      verifyPassword: vi.fn(),
      config: {
        email: 'manager@example.com',
        name: 'Manager',
        password: strongPassword,
        role: 'manager',
        permissions: ['reservation:*', 'customer:read'],
        storeIds: ['store-1', 'store-2'],
        allowExistingUpdate: false,
      },
    })

    expect(database.$transaction).toHaveBeenCalledTimes(1)
    expect(transaction.admin.create).toHaveBeenCalledWith({
      data: {
        email: 'manager@example.com',
        name: 'Manager',
        password: 'secure-hash',
        role: 'manager',
        permissions: JSON.stringify(['reservation:*', 'customer:read']),
        isActive: true,
      },
      select: { id: true },
    })
    expect(transaction.adminStoreAssignment.createMany).toHaveBeenCalledWith({
      data: [
        { adminId: 'admin-created', storeId: 'store-1' },
        { adminId: 'admin-created', storeId: 'store-2' },
      ],
    })
    expect(result.status).toBe('created')
  })

  it('rejects an unknown or inactive store before creating the admin', async () => {
    const { database, transaction } = createDatabase({ existingStoreIds: ['store-1'] })

    await expect(
      bootstrapAdmin({
        database,
        hashPassword: vi.fn(),
        verifyPassword: vi.fn(),
        config: {
          email: 'manager@example.com',
          name: 'Manager',
          password: strongPassword,
          role: 'manager',
          permissions: ['reservation:read'],
          storeIds: ['store-1', 'missing-store'],
          allowExistingUpdate: false,
        },
      })
    ).rejects.toThrow(/missing-store/)

    expect(transaction.admin.create).not.toHaveBeenCalled()
  })

  it('is a no-write operation when an identical administrator already exists', async () => {
    const existingAdmin = {
      id: 'admin-existing',
      email: 'manager@example.com',
      name: 'Manager',
      password: 'existing-hash',
      role: 'manager',
      permissions: JSON.stringify(['reservation:read']),
      isActive: true,
      storeAssignments: [{ storeId: 'store-1' }],
    }
    const { database, transaction } = createDatabase({ existingAdmin })

    const result = await bootstrapAdmin({
      database,
      hashPassword: vi.fn(),
      verifyPassword: vi.fn().mockResolvedValue(true),
      config: {
        email: existingAdmin.email,
        name: existingAdmin.name,
        password: strongPassword,
        role: 'manager',
        permissions: ['reservation:read'],
        storeIds: ['store-1'],
        allowExistingUpdate: false,
      },
    })

    expect(result.status).toBe('unchanged')
    expect(transaction.admin.update).not.toHaveBeenCalled()
    expect(transaction.adminStoreAssignment.deleteMany).not.toHaveBeenCalled()
  })

  it('fails closed on existing-account drift without explicit acknowledgement', async () => {
    const { database, transaction } = createDatabase({
      existingAdmin: {
        id: 'admin-existing',
        email: 'owner@example.com',
        name: 'Existing Owner',
        password: 'existing-hash',
        role: 'super_admin',
        permissions: JSON.stringify(['*']),
        isActive: true,
        storeAssignments: [],
      },
    })

    await expect(
      bootstrapAdmin({
        database,
        hashPassword: vi.fn(),
        verifyPassword: vi.fn().mockResolvedValue(true),
        config: {
          email: 'owner@example.com',
          name: 'Existing Owner',
          password: strongPassword,
          role: 'manager',
          permissions: ['reservation:read'],
          storeIds: ['store-1'],
          allowExistingUpdate: false,
        },
      })
    ).rejects.toThrow(/allow-existing-update/i)

    expect(transaction.admin.update).not.toHaveBeenCalled()
    expect(transaction.adminStoreAssignment.deleteMany).not.toHaveBeenCalled()
  })

  it('updates the account and replaces assignments only with explicit acknowledgement', async () => {
    const { database, transaction } = createDatabase({
      existingAdmin: {
        id: 'admin-existing',
        email: 'manager@example.com',
        name: 'Old Manager',
        password: 'old-hash',
        role: 'manager',
        permissions: JSON.stringify(['reservation:read']),
        isActive: false,
        storeAssignments: [{ storeId: 'store-1' }],
      },
      existingStoreIds: ['store-2'],
    })
    const hashPassword = vi.fn().mockResolvedValue('new-hash')

    const result = await bootstrapAdmin({
      database,
      hashPassword,
      verifyPassword: vi.fn().mockResolvedValue(false),
      config: {
        email: 'manager@example.com',
        name: 'New Manager',
        password: strongPassword,
        role: 'manager',
        permissions: ['reservation:*'],
        storeIds: ['store-2'],
        allowExistingUpdate: true,
      },
    })

    expect(transaction.admin.update).toHaveBeenCalledWith({
      where: { id: 'admin-existing' },
      data: {
        name: 'New Manager',
        password: 'new-hash',
        role: 'manager',
        permissions: JSON.stringify(['reservation:*']),
        isActive: true,
      },
      select: { id: true },
    })
    expect(transaction.adminStoreAssignment.deleteMany).toHaveBeenCalledWith({
      where: { adminId: 'admin-existing' },
    })
    expect(transaction.adminStoreAssignment.createMany).toHaveBeenCalledWith({
      data: [{ adminId: 'admin-existing', storeId: 'store-2' }],
    })
    expect(result.status).toBe('updated')
  })
})

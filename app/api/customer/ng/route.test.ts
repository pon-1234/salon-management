/**
 * @design_doc   Store-scoped customer NG-cast authorization boundary
 * @related_to   route.ts, requireAdmin, CustomerStoreAssignment, Cast.storeId, NgCastEntry
 * @known_issues None
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  requireAdmin: vi.fn(),
  resolveStoreId: vi.fn(),
  ensureStoreId: vi.fn(),
  customerStoreAssignmentFindUnique: vi.fn(),
  castFindFirst: vi.fn(),
  ngFindMany: vi.fn(),
  ngUpsert: vi.fn(),
  ngDelete: vi.fn(),
  ngDeleteMany: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('next-auth', () => ({ getServerSession: mocks.getServerSession }))
vi.mock('@/lib/auth/utils', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/store/server', () => ({
  resolveStoreId: mocks.resolveStoreId,
  ensureStoreId: mocks.ensureStoreId,
}))
vi.mock('@/lib/db', () => ({
  db: {
    customerStoreAssignment: { findUnique: mocks.customerStoreAssignmentFindUnique },
    cast: { findFirst: mocks.castFindFirst },
    ngCastEntry: {
      findMany: mocks.ngFindMany,
      upsert: mocks.ngUpsert,
      delete: mocks.ngDelete,
      deleteMany: mocks.ngDeleteMany,
    },
  },
}))
vi.mock('@/lib/logger', () => ({ default: { error: mocks.loggerError } }))

import * as route from './route'

const forbidden = () =>
  NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })

function postRequest() {
  return new NextRequest('http://localhost/api/customer/ng?storeId=ikebukuro', {
    method: 'POST',
    body: JSON.stringify({ customerId: 'customer-1', castId: 'cast-1' }),
  })
}

function deleteRequest() {
  return new NextRequest(
    'http://localhost/api/customer/ng?storeId=ikebukuro&customerId=customer-1&castId=cast-1',
    { method: 'DELETE' }
  )
}

function getRequest() {
  return new NextRequest('http://localhost/api/customer/ng?storeId=ikebukuro&customerId=customer-1')
}

describe('customer NG-cast mutation authorization', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.getServerSession.mockResolvedValue({
      user: {
        role: 'admin',
        adminRole: 'staff',
        permissions: ['customer:read'],
        storeIds: ['store-ikebukuro'],
      },
    })
    mocks.requireAdmin.mockResolvedValue(forbidden())
    mocks.ngUpsert.mockResolvedValue({
      customerId: 'customer-1',
      castId: 'cast-1',
      assignedAt: new Date('2026-08-15T00:00:00.000Z'),
      notes: null,
      assignedBy: 'staff',
    })
    mocks.ngDelete.mockResolvedValue({ customerId: 'customer-1', castId: 'cast-1' })
  })

  it.each([
    ['adds', () => route.POST(postRequest()), [mocks.ngUpsert]],
    ['removes', () => route.DELETE(deleteRequest()), [mocks.ngDelete, mocks.ngDeleteMany]],
  ])(
    'rejects a standard staff member who only has customer:read when it %s an NG entry',
    async (_operation, invoke, mutations) => {
      const response = await invoke()

      expect(response.status).toBe(403)
      expect(mocks.requireAdmin).toHaveBeenCalledWith({ permissions: 'customer:update' })
      expect(mocks.resolveStoreId).not.toHaveBeenCalled()
      mutations.forEach((mutation) => expect(mutation).not.toHaveBeenCalled())
    }
  )
})

describe('customer NG-cast store isolation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.requireAdmin.mockResolvedValue(null)
    mocks.resolveStoreId.mockResolvedValue('ikebukuro')
    mocks.ensureStoreId.mockResolvedValue('store-ikebukuro')
    mocks.castFindFirst.mockResolvedValue({ id: 'cast-1' })
    mocks.customerStoreAssignmentFindUnique.mockResolvedValue({ customerId: 'customer-1' })
    mocks.ngFindMany.mockResolvedValue([])
    mocks.ngUpsert.mockResolvedValue({
      customerId: 'customer-1',
      castId: 'cast-1',
      assignedAt: new Date('2026-08-15T00:00:00.000Z'),
      notes: null,
      assignedBy: 'staff',
    })
    mocks.ngDeleteMany.mockResolvedValue({ count: 1 })
  })

  it('provides a customer:read GET scoped to casts in the authorized canonical store', async () => {
    const response = await route.GET(getRequest())

    expect(response.status).toBe(200)
    expect(mocks.requireAdmin).toHaveBeenNthCalledWith(1, { permissions: 'customer:read' })
    expect(mocks.requireAdmin).toHaveBeenNthCalledWith(2, {
      permissions: 'customer:read',
      storeId: 'store-ikebukuro',
    })
    expect(mocks.ngFindMany).toHaveBeenCalledWith({
      where: { customerId: 'customer-1', cast: { storeId: 'store-ikebukuro' } },
      orderBy: { assignedAt: 'desc' },
      select: {
        customerId: true,
        castId: true,
        assignedAt: true,
        notes: true,
        assignedBy: true,
      },
    })
  })

  it('rejects GET access outside the assigned store before reading NG entries', async () => {
    mocks.requireAdmin
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
      )

    const response = await route.GET(getRequest())

    expect(response.status).toBe(403)
    expect(mocks.ngFindMany).not.toHaveBeenCalled()
  })

  it.each([
    ['GET', () => route.GET(getRequest()), mocks.ngFindMany],
    ['POST', () => route.POST(postRequest()), mocks.ngUpsert],
    ['DELETE', () => route.DELETE(deleteRequest()), mocks.ngDeleteMany],
  ])(
    'rejects %s when the customer is not assigned to the requested store',
    async (_method, invoke, operation) => {
      mocks.customerStoreAssignmentFindUnique.mockResolvedValueOnce(null)

      const response = await invoke()

      expect(response.status).toBe(404)
      expect(mocks.customerStoreAssignmentFindUnique).toHaveBeenCalledWith({
        where: {
          customerId_storeId: {
            customerId: 'customer-1',
            storeId: 'store-ikebukuro',
          },
        },
        select: { customerId: true },
      })
      expect(operation).not.toHaveBeenCalled()
    }
  )

  it.each([
    ['POST', () => route.POST(postRequest()), mocks.ngUpsert],
    ['DELETE', () => route.DELETE(deleteRequest()), mocks.ngDeleteMany],
  ])(
    'checks customer:update store access before %s mutation',
    async (_method, invoke, mutation) => {
      mocks.requireAdmin
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(
          NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
        )

      const response = await invoke()

      expect(response.status).toBe(403)
      expect(mocks.requireAdmin).toHaveBeenNthCalledWith(1, { permissions: 'customer:update' })
      expect(mocks.requireAdmin).toHaveBeenNthCalledWith(2, {
        permissions: 'customer:update',
        storeId: 'store-ikebukuro',
      })
      expect(mutation).not.toHaveBeenCalled()
    }
  )

  it('does not add an NG entry when the cast belongs to another store', async () => {
    mocks.castFindFirst.mockResolvedValueOnce(null)

    const response = await route.POST(postRequest())

    expect(response.status).toBe(404)
    expect(mocks.castFindFirst).toHaveBeenCalledWith({
      where: { id: 'cast-1', storeId: 'store-ikebukuro' },
      select: { id: true },
    })
    expect(mocks.ngUpsert).not.toHaveBeenCalled()
  })

  it('adds an NG entry only after authorizing and locating the cast in the requested store', async () => {
    const response = await route.POST(postRequest())

    expect(response.status).toBe(200)
    expect(mocks.castFindFirst).toHaveBeenCalledWith({
      where: { id: 'cast-1', storeId: 'store-ikebukuro' },
      select: { id: true },
    })
    expect(mocks.ngUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customerId_castId: { customerId: 'customer-1', castId: 'cast-1' } },
      })
    )
  })

  it('cannot delete an NG entry through a different store scope', async () => {
    mocks.ngDeleteMany.mockResolvedValueOnce({ count: 0 })

    const response = await route.DELETE(deleteRequest())

    expect(response.status).toBe(404)
    expect(mocks.ngDeleteMany).toHaveBeenCalledWith({
      where: {
        customerId: 'customer-1',
        castId: 'cast-1',
        cast: { storeId: 'store-ikebukuro' },
      },
    })
    expect(mocks.ngDelete).not.toHaveBeenCalled()
  })

  it('deletes an NG entry atomically inside the authorized store scope', async () => {
    const response = await route.DELETE(deleteRequest())

    expect(response.status).toBe(200)
    expect(mocks.ngDeleteMany).toHaveBeenCalledWith({
      where: {
        customerId: 'customer-1',
        castId: 'cast-1',
        cast: { storeId: 'store-ikebukuro' },
      },
    })
  })
})

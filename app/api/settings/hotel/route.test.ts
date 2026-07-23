/**
 * @design_doc   docs/HOTEL_DATA_MODEL.md
 * @related_to   route.ts; HotelSettings; HotelServiceArea; HotelRate
 * @known_issues Nested service-area and rate mutation is intentionally handled by later dedicated endpoints
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  resolveStoreId: vi.fn(),
  ensureStoreId: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
}))

vi.mock('@/lib/auth/utils', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/store/server', () => ({
  resolveStoreId: mocks.resolveStoreId,
  ensureStoreId: mocks.ensureStoreId,
}))
vi.mock('@/lib/db', () => ({
  db: {
    hotelSettings: {
      findMany: mocks.findMany,
      findFirst: mocks.findFirst,
      create: mocks.create,
      update: mocks.update,
      updateMany: mocks.updateMany,
    },
  },
}))

import { DELETE, GET, POST, PUT } from './route'

function request(method: 'GET' | 'POST' | 'PUT' | 'DELETE', body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/settings/hotel?storeId=store-a&id=hotel-a', {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }),
  })
}

describe('hotel settings route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveStoreId.mockResolvedValue('store-a')
    mocks.ensureStoreId.mockResolvedValue('store-a')
    mocks.requireAdmin.mockResolvedValue(null)
    mocks.findMany.mockResolvedValue([])
    mocks.create.mockResolvedValue({ id: 'hotel-a', storeId: 'store-a', hotelName: 'Hotel A' })
    mocks.update.mockResolvedValue({ id: 'hotel-a', storeId: 'store-a', hotelName: 'Hotel A' })
    mocks.updateMany.mockResolvedValue({ count: 1 })
  })

  it('reads only active hotels owned by the authorized store', async () => {
    const response = await GET(request('GET'))

    expect(response.status).toBe(200)
    expect(mocks.requireAdmin).toHaveBeenCalledWith({
      permissions: 'settings:read',
      storeId: 'store-a',
    })
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { storeId: 'store-a', isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { hotelName: 'asc' }],
      include: {
        serviceAreas: {
          where: { isActive: true },
          include: { area: true },
          orderBy: { displayOrder: 'asc' },
        },
        rates: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    })
  })

  it('creates a nullable hotel record under the resolved store, never a client supplied store', async () => {
    const response = await POST(
      request('POST', {
        storeId: 'foreign-store',
        hotelName: '  Hotel A  ',
      })
    )

    expect(response.status).toBe(201)
    expect(mocks.requireAdmin).toHaveBeenCalledWith({
      permissions: 'settings:update',
      storeId: 'store-a',
    })
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        storeId: 'store-a',
        hotelName: 'Hotel A',
        legacyId: null,
        area: null,
        station: null,
        roomCount: null,
        hourlyRate: null,
        address: null,
        phone: null,
        checkInTime: null,
        checkOutTime: null,
        amenities: [],
        notes: null,
        rawText: null,
        displayOrder: 0,
        isActive: true,
      },
      include: {
        serviceAreas: { include: { area: true } },
        rates: true,
      },
    })
  })

  it('does not update a hotel belonging to another store', async () => {
    mocks.findFirst.mockResolvedValue(null)

    const response = await PUT(
      request('PUT', {
        id: 'hotel-a',
        hotelName: 'Hotel A',
      })
    )

    expect(response.status).toBe(404)
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { id: 'hotel-a', storeId: 'store-a' },
      select: { id: true },
    })
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('logically deletes only an active hotel owned by the authorized store', async () => {
    const response = await DELETE(request('DELETE'))

    expect(response.status).toBe(200)
    expect(mocks.requireAdmin).toHaveBeenCalledWith({
      permissions: 'settings:update',
      storeId: 'store-a',
    })
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: 'hotel-a', storeId: 'store-a', isActive: true },
      data: { isActive: false },
    })
  })

  it('returns not found when no active hotel in the store can be deleted', async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 })

    const response = await DELETE(request('DELETE'))

    expect(response.status).toBe(404)
  })

  it('rejects negative legacy-compatible numeric values', async () => {
    const response = await POST(
      request('POST', {
        hotelName: 'Hotel A',
        hourlyRate: -1,
      })
    )

    expect(response.status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})

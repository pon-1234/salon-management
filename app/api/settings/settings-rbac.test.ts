/**
 * @design_doc   Settings API authorization and tenant-isolation contract
 * @related_to   Area, station, store, and point settings routes
 * @known_issues None currently
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  resolveStoreId: vi.fn(),
  ensureStoreId: vi.fn(),
  shouldUseMockFallbacks: vi.fn(() => false),
  areaFindMany: vi.fn(),
  areaCreateMany: vi.fn(),
  areaFindFirst: vi.fn(),
  areaUpdate: vi.fn(),
  areaUpdateMany: vi.fn(),
  areaDeleteMany: vi.fn(),
  stationFindMany: vi.fn(),
  stationCreateMany: vi.fn(),
  stationFindFirst: vi.fn(),
  stationUpdate: vi.fn(),
  stationUpdateMany: vi.fn(),
  stationDeleteMany: vi.fn(),
  storeSettingsFindUnique: vi.fn(),
  storeSettingsCreate: vi.fn(),
  storeSettingsUpdate: vi.fn(),
  hotelFindMany: vi.fn(),
  hotelCreate: vi.fn(),
}))

vi.mock('@/lib/auth/utils', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/store/server', () => ({
  resolveStoreId: mocks.resolveStoreId,
  ensureStoreId: mocks.ensureStoreId,
}))
vi.mock('@/lib/config/feature-flags', () => ({
  shouldUseMockFallbacks: mocks.shouldUseMockFallbacks,
}))
vi.mock('@/lib/db', () => ({
  db: {
    areaInfo: {
      findMany: mocks.areaFindMany,
      createMany: mocks.areaCreateMany,
      findFirst: mocks.areaFindFirst,
      update: mocks.areaUpdate,
      updateMany: mocks.areaUpdateMany,
      deleteMany: mocks.areaDeleteMany,
    },
    stationInfo: {
      findMany: mocks.stationFindMany,
      createMany: mocks.stationCreateMany,
      findFirst: mocks.stationFindFirst,
      update: mocks.stationUpdate,
      updateMany: mocks.stationUpdateMany,
      deleteMany: mocks.stationDeleteMany,
    },
    storeSettings: {
      findUnique: mocks.storeSettingsFindUnique,
      create: mocks.storeSettingsCreate,
      update: mocks.storeSettingsUpdate,
    },
    hotelSettings: {
      findMany: mocks.hotelFindMany,
      create: mocks.hotelCreate,
    },
  },
}))

import {
  DELETE as deleteArea,
  GET as getAreas,
  POST as createArea,
  PUT as updateArea,
} from './area/route'
import {
  DELETE as deleteStation,
  GET as getStations,
  POST as createStation,
  PUT as updateStation,
} from './station/route'
import { GET as getStore, PUT as updateStore } from './store/route'
import { GET as getPoints, PUT as updatePoints } from './points/route'
import { GET as getHotels } from './hotel/route'

function request(method: string): NextRequest {
  return new NextRequest('http://localhost/api/settings/resource?storeId=store-a&id=resource-a', {
    method,
    headers: { 'content-type': 'application/json' },
    body: method === 'GET' || method === 'DELETE' ? undefined : JSON.stringify({}),
  })
}

function jsonRequest(path: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('settings route authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveStoreId.mockResolvedValue('store-a')
    mocks.ensureStoreId.mockResolvedValue('store-a')
    mocks.requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
    )
    mocks.shouldUseMockFallbacks.mockReturnValue(false)
  })

  it.each([
    ['area GET', 'settings:read', () => getAreas(request('GET'))],
    ['area POST', 'settings:update', () => createArea(request('POST'))],
    ['area PUT', 'settings:update', () => updateArea(request('PUT'))],
    ['area DELETE', 'settings:update', () => deleteArea(request('DELETE'))],
    ['station GET', 'settings:read', () => getStations(request('GET'))],
    ['station POST', 'settings:update', () => createStation(request('POST'))],
    ['station PUT', 'settings:update', () => updateStation(request('PUT'))],
    ['station DELETE', 'settings:update', () => deleteStation(request('DELETE'))],
    ['store GET', 'settings:read', () => getStore(request('GET'))],
    ['store PUT', 'settings:update', () => updateStore(request('PUT'))],
    ['points GET', 'settings:read', () => getPoints(request('GET'))],
    ['points PUT', 'settings:update', () => updatePoints(request('PUT'))],
  ])(
    '%s requires the expected permission for the resolved store',
    async (_name, permission, call) => {
      const response = await call()

      expect(response.status).toBe(403)
      expect(mocks.resolveStoreId).toHaveBeenCalledTimes(1)
      expect(mocks.ensureStoreId).toHaveBeenCalledWith('store-a')
      expect(mocks.requireAdmin).toHaveBeenCalledWith({
        permissions: permission,
        storeId: 'store-a',
      })
    }
  )

  it('keeps area updates tenant-scoped and deactivates instead of deleting', async () => {
    mocks.requireAdmin.mockResolvedValue(null)
    mocks.areaFindFirst.mockResolvedValue({ id: 'area-a', storeId: 'store-a' })
    mocks.areaUpdate.mockResolvedValue({ id: 'area-a', storeId: 'store-a', name: 'Area A' })
    mocks.areaUpdateMany.mockResolvedValue({ count: 1 })

    await updateArea(
      jsonRequest('/api/settings/area?storeId=store-a', {
        id: 'area-a',
        name: 'Area A',
      })
    )
    await deleteArea(
      new NextRequest('http://localhost/api/settings/area?storeId=store-a&id=area-a', {
        method: 'DELETE',
      })
    )

    expect(mocks.areaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'area-a', storeId: 'store-a' } })
    )
    expect(mocks.areaUpdateMany).toHaveBeenCalledWith({
      where: { id: 'area-a', storeId: 'store-a' },
      data: { isActive: false },
    })
    expect(mocks.areaDeleteMany).not.toHaveBeenCalled()
  })

  it('keeps station updates tenant-scoped and deactivates instead of deleting', async () => {
    mocks.requireAdmin.mockResolvedValue(null)
    mocks.stationFindFirst.mockResolvedValue({ id: 'station-a', storeId: 'store-a' })
    mocks.stationUpdate.mockResolvedValue({
      id: 'station-a',
      storeId: 'store-a',
      name: 'Station A',
    })
    mocks.stationUpdateMany.mockResolvedValue({ count: 1 })

    await updateStation(
      jsonRequest('/api/settings/station?storeId=store-a', {
        id: 'station-a',
        name: 'Station A',
      })
    )
    await deleteStation(
      new NextRequest('http://localhost/api/settings/station?storeId=store-a&id=station-a', {
        method: 'DELETE',
      })
    )

    expect(mocks.stationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'station-a', storeId: 'store-a' } })
    )
    expect(mocks.stationUpdateMany).toHaveBeenCalledWith({
      where: { id: 'station-a', storeId: 'store-a' },
      data: { isActive: false },
    })
    expect(mocks.stationDeleteMany).not.toHaveBeenCalled()
  })

  it('only allows a station to reference an active area in the authorized store', async () => {
    mocks.requireAdmin.mockResolvedValue(null)
    mocks.stationFindFirst.mockResolvedValue({ id: 'station-a', storeId: 'store-a' })
    mocks.areaFindFirst.mockResolvedValue({ id: 'area-a' })
    mocks.stationUpdate.mockResolvedValue({
      id: 'station-a',
      storeId: 'store-a',
      areaId: 'area-a',
      name: 'Station A',
    })

    const response = await updateStation(
      jsonRequest('/api/settings/station?storeId=store-a', {
        id: 'station-a',
        name: 'Station A',
        areaId: 'area-a',
      })
    )

    expect(response.status).toBe(200)
    expect(mocks.areaFindFirst).toHaveBeenCalledWith({
      where: { id: 'area-a', storeId: 'store-a', isActive: true },
      select: { id: true },
    })
  })

  it('updates store and point settings by record ID and authorized store', async () => {
    mocks.requireAdmin.mockResolvedValue(null)
    mocks.storeSettingsFindUnique.mockResolvedValue({
      id: 'settings-a',
      storeId: 'store-a',
    })
    mocks.storeSettingsUpdate.mockResolvedValue({
      id: 'settings-a',
      storeId: 'store-a',
      welfareExpenseRate: 10,
      marketingChannels: ['WEB'],
      pointEarnRate: 1,
      pointExpirationMonths: 12,
      pointMinUsage: 100,
    })

    await updateStore(
      jsonRequest('/api/settings/store?storeId=store-a', {
        storeName: 'Store A',
        address: 'Tokyo',
        phone: '03-0000-0000',
        email: 'store-a@example.com',
        businessHours: '10:00-20:00',
        description: 'Store A',
        zipCode: '100-0001',
        prefecture: 'Tokyo',
        city: 'Chiyoda',
        businessDays: 'Every day',
        lastOrder: '19:00',
      })
    )
    await updatePoints(
      jsonRequest('/api/settings/points?storeId=store-a', {
        pointEarnRate: 2,
        pointExpirationMonths: 12,
        pointMinUsage: 100,
      })
    )

    expect(mocks.storeSettingsUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { id: 'settings-a', storeId: 'store-a' } })
    )
    expect(mocks.storeSettingsUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: { id: 'settings-a', storeId: 'store-a' } })
    )
  })

  it('updates the marketing catalog without requiring legacy blank contact fields', async () => {
    mocks.requireAdmin.mockResolvedValue(null)
    mocks.storeSettingsFindUnique.mockResolvedValue({
      id: 'settings-a',
      storeId: 'store-a',
      storeName: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      businessHours: '',
      description: '',
      zipCode: '',
      prefecture: '',
      city: '',
      building: '',
      businessDays: '',
      lastOrder: '',
      parkingInfo: '',
      marketingChannels: ['電話'],
      welfareExpenseRate: 10,
      creditCardFeeRate: 10,
      mediaCommentOverwrite: false,
      mediaAccounts: [],
    } as any)
    mocks.storeSettingsUpdate.mockResolvedValue({
      id: 'settings-a',
      storeId: 'store-a',
      marketingChannels: ['電話', 'Heaven'],
      mediaAccounts: [],
    } as any)

    const response = await updateStore(
      jsonRequest('/api/settings/store?storeId=store-a', {
        marketingChannels: ['電話', 'Heaven'],
      })
    )

    expect(response.status).toBe(200)
    expect(mocks.storeSettingsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'settings-a', storeId: 'store-a' },
        data: expect.objectContaining({ marketingChannels: ['電話', 'Heaven'] }),
      })
    )
  })

  it('does not write demo settings when production fallbacks are disabled', async () => {
    mocks.requireAdmin.mockResolvedValue(null)
    mocks.areaFindMany.mockResolvedValue([])
    mocks.stationFindMany.mockResolvedValue([])
    mocks.storeSettingsFindUnique.mockResolvedValue(null)
    mocks.storeSettingsCreate.mockResolvedValue({ id: 'demo-settings' })
    mocks.hotelFindMany.mockResolvedValue([])

    const [areasResponse, stationsResponse, storeResponse, hotelsResponse] = await Promise.all([
      getAreas(request('GET')),
      getStations(request('GET')),
      getStore(request('GET')),
      getHotels(request('GET')),
    ])

    expect(areasResponse.status).toBe(200)
    expect(stationsResponse.status).toBe(200)
    expect(storeResponse.status).toBe(404)
    expect(hotelsResponse.status).toBe(200)
    expect(mocks.areaCreateMany).not.toHaveBeenCalled()
    expect(mocks.stationCreateMany).not.toHaveBeenCalled()
    expect(mocks.storeSettingsCreate).not.toHaveBeenCalled()
    expect(mocks.hotelCreate).not.toHaveBeenCalled()
  })
})

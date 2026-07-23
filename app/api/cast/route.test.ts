/**
 * @design_doc   Not available
 * @related_to   Cast domain API endpoints
 * @known_issues Not available
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST, PUT, DELETE } from './route'
import { NextRequest, NextResponse } from 'next/server'

// Import the mocked db
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/utils'

// Mock auth utils
vi.mock('@/lib/auth/utils', () => ({
  requireAdmin: vi.fn().mockResolvedValue(null),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

// Type assertion for mocked functions
const mockedDb = db as any

describe('Cast API endpoints', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    vi.mocked(requireAdmin).mockResolvedValue(null)
  })

  describe('GET /api/cast', () => {
    it('should return all cast members', async () => {
      const mockCasts = [
        {
          id: '1',
          name: 'Test Cast 1',
          schedules: [],
          passwordHash: 'cast-list-secret',
          reservations: [
            {
              customer: {
                id: 'customer-1',
                password: 'customer-list-secret',
                emailVerificationToken: 'verification-secret',
              },
            },
          ],
          age: 25,
          height: 170,
          bust: 'B',
          waist: 60,
          hip: 90,
          type: 'standard',
          image: 'https://example.com/image1.jpg',
          images: [],
          description: 'Test description',
          netReservation: true,
          specialDesignationFee: null,
          regularDesignationFee: null,
          panelDesignationRank: 1,
          regularDesignationRank: 1,
          workStatus: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'Test Cast 2',
          schedules: [],
          reservations: [],
          age: 28,
          height: 165,
          bust: 'C',
          waist: 58,
          hip: 88,
          type: 'standard',
          image: 'https://example.com/image2.jpg',
          images: [],
          description: 'Test description 2',
          netReservation: true,
          specialDesignationFee: null,
          regularDesignationFee: null,
          panelDesignationRank: 2,
          regularDesignationRank: 2,
          workStatus: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockedDb.cast.findMany.mockResolvedValue(mockCasts)

      const request = new NextRequest('http://localhost:3000/api/cast')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(2)
      expect(data[0]).toMatchObject({
        id: '1',
        name: 'Test Cast 1',
        nameKana: 'Test Cast 1',
        availableOptions: [],
        appointments: [],
      })
      expect(data[1]).toMatchObject({
        id: '2',
        name: 'Test Cast 2',
        nameKana: 'Test Cast 2',
        availableOptions: [],
        appointments: [],
      })
      expect(JSON.stringify(data)).not.toMatch(
        /cast-list-secret|customer-list-secret|verification-secret/
      )
      expect(mockedDb.cast.findMany).toHaveBeenCalledWith({
        where: { storeId: 'ikebukuro' },
        include: {
          schedules: true,
          castOptionSettings: true,
          reservations: {
            include: {
              customer: true,
              course: true,
            },
          },
        },
      })
      expect(requireAdmin).toHaveBeenCalledWith({
        permissions: 'cast:read',
        storeId: 'ikebukuro',
      })
    })

    it('should reject a user without cast read access before querying data', async () => {
      vi.mocked(requireAdmin).mockResolvedValueOnce(
        NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      )

      const response = await GET(new NextRequest('http://localhost:3000/api/cast'))

      expect(response.status).toBe(403)
      expect(mockedDb.cast.findMany).not.toHaveBeenCalled()
    })

    it('should return a cast member by id', async () => {
      const mockCast = {
        id: 'test-id',
        name: 'Test Cast',
        nameKana: 'てすと きゃすと',
        passwordHash: 'single-cast-secret',
        publicProfile: {
          legacyGirlNo: 56229,
          bustCup: 3,
          snapshotCutoff: '2026-07-20T04:00:00.000Z',
        },
        schedules: [],
        reservations: [],
      }

      mockedDb.cast.findFirst.mockResolvedValue(mockCast)

      const request = new NextRequest('http://localhost:3000/api/cast?id=test-id')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('id', 'test-id')
      expect(data).toHaveProperty('nameKana', 'てすと きゃすと')
      expect(data).toHaveProperty('publicProfile', null)
      expect(JSON.stringify(data)).not.toContain('single-cast-secret')
      expect(JSON.stringify(data)).not.toContain('legacyGirlNo')
      expect(JSON.stringify(data)).not.toContain('snapshotCutoff')
      expect(mockedDb.cast.findFirst).toHaveBeenCalledWith({
        where: { id: 'test-id', storeId: 'ikebukuro' },
        include: {
          schedules: true,
          castOptionSettings: true,
          reservations: {
            include: {
              customer: true,
              course: true,
              options: {
                include: {
                  option: true,
                },
              },
            },
          },
        },
      })
    })

    it('should return 404 when cast member not found', async () => {
      mockedDb.cast.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/cast?id=non-existent')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Cast not found' })
    })
  })

  describe('POST /api/cast', () => {
    it('rejects direct LINE user ID assignment', async () => {
      const response = await POST(
        new NextRequest('http://localhost:3000/api/cast', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test Cast',
            age: 25,
            height: 165,
            bust: 'B',
            waist: 58,
            hip: 85,
            type: 'カワイイ系',
            image: 'https://example.com/test-cast.jpg',
            lineUserId: 'attacker-controlled-line-id',
          }),
        })
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'LINE user ID is managed by the secure linking flow' })
      expect(mockedDb.cast.create).not.toHaveBeenCalled()
    })

    it('should create a new cast member', async () => {
      const castData = {
        name: 'Test Cast',
        nameKana: 'てすと きゃすと',
        age: 25,
        height: 165,
        bust: 'B',
        waist: 58,
        hip: 85,
        type: 'カワイイ系',
        image: 'https://example.com/test-cast.jpg',
        images: [],
        description: '',
        netReservation: true,
        specialDesignationFee: 2000,
        regularDesignationFee: 1000,
        workStatus: '出勤',
        panelDesignationRank: 1,
        regularDesignationRank: 1,
        availableOptions: ['kaishun-plus', '10'],
      }

      const mockCreatedCast = {
        id: 'new-id',
        ...castData,
        availableOptions: ['6', '10'],
        createdAt: new Date(),
        updatedAt: new Date(),
        schedules: [],
        reservations: [],
      }

      mockedDb.optionPrice.findMany.mockResolvedValueOnce([{ id: '6' }, { id: '10' }])
      mockedDb.cast.create.mockResolvedValue(mockCreatedCast)

      const request = new NextRequest('http://localhost:3000/api/cast', {
        method: 'POST',
        body: JSON.stringify(castData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toMatchObject({
        ...castData,
        availableOptions: ['6', '10'],
      })
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('createdAt')
      expect(data).toHaveProperty('updatedAt')
      expect(mockedDb.cast.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nameKana: 'てすと きゃすと',
          availableOptions: ['6', '10'],
          storeId: 'ikebukuro',
        }),
        include: { castOptionSettings: true },
      })
      expect(requireAdmin).toHaveBeenCalledWith({
        permissions: 'cast:create',
        storeId: 'ikebukuro',
      })
    })

    it('rejects option IDs that do not belong to the target store before creating a cast', async () => {
      mockedDb.optionPrice.findMany.mockResolvedValueOnce([{ id: 'option-in-store' }])

      const response = await POST(
        new NextRequest('http://localhost:3000/api/cast?storeId=store-a', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test Cast',
            age: 25,
            height: 165,
            bust: 'B',
            waist: 58,
            hip: 85,
            type: 'カワイイ系',
            image: 'https://example.com/test-cast.jpg',
            availableOptions: ['option-in-store', 'option-from-store-b'],
          }),
        })
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'One or more options are unavailable for this store' })
      expect(mockedDb.optionPrice.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['option-in-store', 'option-from-store-b'] },
          storeId: 'store-a',
        },
        select: { id: true },
      })
      expect(mockedDb.cast.create).not.toHaveBeenCalled()
    })
  })

  describe('PUT /api/cast', () => {
    it('rejects direct LINE user ID changes', async () => {
      const response = await PUT(
        new NextRequest('http://localhost:3000/api/cast', {
          method: 'PUT',
          body: JSON.stringify({
            id: 'test-id',
            lineUserId: 'attacker-controlled-line-id',
          }),
        })
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'LINE user ID is managed by the secure linking flow' })
      expect(mockedDb.cast.findFirst).not.toHaveBeenCalled()
      expect(mockedDb.cast.update).not.toHaveBeenCalled()
    })

    it('should update an existing cast member', async () => {
      const updateData = {
        id: 'test-id',
        name: 'Updated Cast',
        nameKana: 'あっぷでーと きゃすと',
        age: 26,
        availableOptions: ['healing-knee', '1'],
      }

      const mockUpdatedCast = {
        ...updateData,
        availableOptions: ['1'],
        updatedAt: new Date(),
        schedules: [],
        reservations: [],
      }

      mockedDb.optionPrice.findMany.mockResolvedValueOnce([{ id: '1' }])
      // Mock findFirst to return existing cast
      mockedDb.cast.findFirst.mockResolvedValue({ id: 'test-id', name: 'Old Cast' })
      mockedDb.cast.update.mockResolvedValue(mockUpdatedCast)
      mockedDb.cast.findFirst
        .mockResolvedValueOnce({ id: 'test-id', name: 'Old Cast' })
        .mockResolvedValueOnce(mockUpdatedCast)

      const request = new NextRequest('http://localhost:3000/api/cast', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        ...updateData,
        availableOptions: ['1'],
      })
      expect(data).toHaveProperty('updatedAt')
      expect(mockedDb.cast.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: expect.objectContaining({
          name: 'Updated Cast',
          nameKana: 'あっぷでーと きゃすと',
          age: 26,
          availableOptions: ['1'],
        }),
        include: { castOptionSettings: true },
      })
      expect(requireAdmin).toHaveBeenCalledWith({
        permissions: 'cast:update',
        storeId: 'ikebukuro',
      })
    })

    it('rejects option settings from another store before updating assignments', async () => {
      mockedDb.cast.findFirst.mockResolvedValue({ id: 'test-id', storeId: 'store-a' })
      mockedDb.optionPrice.findMany.mockResolvedValueOnce([{ id: 'option-in-store' }])

      const response = await PUT(
        new NextRequest('http://localhost:3000/api/cast?storeId=store-a', {
          method: 'PUT',
          body: JSON.stringify({
            id: 'test-id',
            availableOptionSettings: [
              { optionId: 'option-in-store', visibility: 'public' },
              { optionId: 'option-from-store-b', visibility: 'internal' },
            ],
          }),
        })
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'One or more options are unavailable for this store' })
      expect(mockedDb.optionPrice.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['option-in-store', 'option-from-store-b'] },
          storeId: 'store-a',
        },
        select: { id: true },
      })
      expect(mockedDb.cast.update).not.toHaveBeenCalled()
      expect(mockedDb.castOptionSetting.deleteMany).not.toHaveBeenCalled()
      expect(mockedDb.castOptionSetting.createMany).not.toHaveBeenCalled()
    })

    it('should return 404 for non-existent cast member', async () => {
      const updateData = {
        id: 'non-existent-id',
        name: 'Updated Cast',
      }

      // Mock findFirst to return null (not found)
      mockedDb.cast.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/cast', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })

      const response = await PUT(request)

      expect(response.status).toBe(404)
    })

    it('should coerce numeric fields provided as strings', async () => {
      const updateData = {
        id: 'test-id',
        age: '27',
        height: '172',
        waist: '60',
        hip: '88',
        panelDesignationRank: '2',
        regularDesignationRank: '3',
        specialDesignationFee: '5000',
        regularDesignationFee: null,
      }

      const coercedResult = {
        id: 'test-id',
        age: 27,
        height: 172,
        waist: 60,
        hip: 88,
        panelDesignationRank: 2,
        regularDesignationRank: 3,
        specialDesignationFee: 5000,
        regularDesignationFee: null,
        updatedAt: new Date(),
        schedules: [],
        reservations: [],
      }

      mockedDb.cast.findFirst.mockResolvedValue({ id: 'test-id' })
      mockedDb.cast.update.mockResolvedValue(coercedResult)

      const request = new NextRequest('http://localhost:3000/api/cast', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockedDb.cast.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: expect.objectContaining({
          age: 27,
          height: 172,
          waist: 60,
          hip: 88,
          panelDesignationRank: 2,
          regularDesignationRank: 3,
          specialDesignationFee: 5000,
          regularDesignationFee: null,
        }),
        include: { castOptionSettings: true },
      })
      expect(data).toMatchObject({
        id: 'test-id',
        age: 27,
        height: 172,
        waist: 60,
        hip: 88,
        panelDesignationRank: 2,
        regularDesignationRank: 3,
        specialDesignationFee: 5000,
        regularDesignationFee: null,
      })
    })

    it('should accept relative image paths when updating', async () => {
      const updateData = {
        id: 'test-id',
        image: '/images/cast/emiri-main.jpg',
        images: ['/images/cast/emiri-main.jpg', 'https://example.com/backup.jpg'],
      }

      mockedDb.cast.findFirst.mockResolvedValue({ id: 'test-id' })
      mockedDb.cast.update.mockResolvedValue({
        ...updateData,
        updatedAt: new Date(),
        schedules: [],
        reservations: [],
      })

      const request = new NextRequest('http://localhost:3000/api/cast', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })

      const response = await PUT(request)

      expect(response.status).toBe(200)
      expect(mockedDb.cast.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: expect.objectContaining({
          image: '/images/cast/emiri-main.jpg',
          images: updateData.images,
        }),
        include: { castOptionSettings: true },
      })
    })

    it('should reject invalid image strings', async () => {
      const updateData = {
        id: 'test-id',
        image: 'invalid-image',
      }

      const request = new NextRequest('http://localhost:3000/api/cast', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })

      const response = await PUT(request)
      const payload = await response.json()

      expect(response.status).toBe(400)
      expect(payload).toMatchObject({
        error: 'Validation error',
      })
      expect(payload.details?.[0]?.path).toEqual(['image'])
    })
  })

  describe('DELETE /api/cast', () => {
    it('should delete an existing cast member', async () => {
      // Mock findFirst to return existing cast
      mockedDb.cast.findFirst.mockResolvedValue({ id: 'test-id', name: 'Cast to Delete' })
      mockedDb.cast.delete.mockResolvedValue({})

      const request = new NextRequest('http://localhost:3000/api/cast?id=test-id', {
        method: 'DELETE',
      })

      const response = await DELETE(request)

      expect(response.status).toBe(200)
      expect(mockedDb.cast.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      })
      expect(requireAdmin).toHaveBeenCalledWith({
        permissions: 'cast:delete',
        storeId: 'ikebukuro',
      })
    })

    it('should return 404 for non-existent cast member', async () => {
      // Mock findFirst to return null (not found)
      mockedDb.cast.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/cast?id=non-existent-id', {
        method: 'DELETE',
      })

      const response = await DELETE(request)

      expect(response.status).toBe(404)
    })
  })
})

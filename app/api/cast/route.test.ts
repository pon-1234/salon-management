/**
 * @design_doc   Not available
 * @related_to   Cast domain API endpoints
 * @known_issues Not available
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST, PUT, DELETE } from './route'
import { NextRequest } from 'next/server'

// Import the mocked db
import { db } from '@/lib/db'

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
  })

  describe('GET /api/cast', () => {
    it('should return all cast members', async () => {
      const mockCasts = [
        {
          id: '1',
          name: 'Test Cast 1',
          schedules: [],
          reservations: [],
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
      expect(mockedDb.cast.findMany).toHaveBeenCalledWith({
        include: {
          schedules: true,
          reservations: {
            include: {
              customer: true,
              course: true,
            },
          },
        },
      })
    })

    it('should return a cast member by id', async () => {
      const mockCast = {
        id: 'test-id',
        name: 'Test Cast',
        schedules: [],
        reservations: [],
      }

      mockedDb.cast.findUnique.mockResolvedValue(mockCast)

      const request = new NextRequest('http://localhost:3000/api/cast?id=test-id')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('id', 'test-id')
      expect(mockedDb.cast.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        include: {
          schedules: true,
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
      mockedDb.cast.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/cast?id=non-existent')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Cast not found' })
    })
  })

  describe('POST /api/cast', () => {
    it('should create a new cast member', async () => {
      const castData = {
        name: 'Test Cast',
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
      }

      const mockCreatedCast = {
        id: 'new-id',
        ...castData,
        createdAt: new Date(),
        updatedAt: new Date(),
        schedules: [],
        reservations: [],
      }

      mockedDb.cast.create.mockResolvedValue(mockCreatedCast)

      const request = new NextRequest('http://localhost:3000/api/cast', {
        method: 'POST',
        body: JSON.stringify(castData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toMatchObject(castData)
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('createdAt')
      expect(data).toHaveProperty('updatedAt')
    })
  })

  describe('PUT /api/cast', () => {
    it('should update an existing cast member', async () => {
      const updateData = {
        id: 'test-id',
        name: 'Updated Cast',
        age: 26,
      }

      const mockUpdatedCast = {
        ...updateData,
        updatedAt: new Date(),
        schedules: [],
        reservations: [],
      }

      // Mock findUnique to return existing cast
      mockedDb.cast.findUnique.mockResolvedValue({ id: 'test-id', name: 'Old Cast' })
      mockedDb.cast.update.mockResolvedValue(mockUpdatedCast)

      const request = new NextRequest('http://localhost:3000/api/cast', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject(updateData)
      expect(data).toHaveProperty('updatedAt')
    })

    it('should return 404 for non-existent cast member', async () => {
      const updateData = {
        id: 'non-existent-id',
        name: 'Updated Cast',
      }

      // Mock findUnique to return null (not found)
      mockedDb.cast.findUnique.mockResolvedValue(null)

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

      mockedDb.cast.findUnique.mockResolvedValue({ id: 'test-id' })
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

      mockedDb.cast.findUnique.mockResolvedValue({ id: 'test-id' })
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
      // Mock findUnique to return existing cast
      mockedDb.cast.findUnique.mockResolvedValue({ id: 'test-id', name: 'Cast to Delete' })
      mockedDb.cast.delete.mockResolvedValue({})

      const request = new NextRequest('http://localhost:3000/api/cast?id=test-id', {
        method: 'DELETE',
      })

      const response = await DELETE(request)

      expect(response.status).toBe(200)
      expect(mockedDb.cast.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      })
    })

    it('should return 404 for non-existent cast member', async () => {
      // Mock findUnique to return null (not found)
      mockedDb.cast.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/cast?id=non-existent-id', {
        method: 'DELETE',
      })

      const response = await DELETE(request)

      expect(response.status).toBe(404)
    })
  })
})

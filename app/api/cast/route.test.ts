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
        },
        {
          id: '2',
          name: 'Test Cast 2',
          schedules: [],
          reservations: [],
        },
      ]

      mockedDb.cast.findMany.mockResolvedValue(mockCasts)

      const request = new NextRequest('http://localhost:3000/api/cast')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toEqual(mockCasts)
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
        image: '',
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

      // Mock Prisma error for record not found
      const prismaError = new Error('Record not found')
      ;(prismaError as any).code = 'P2025'
      mockedDb.cast.update.mockRejectedValue(prismaError)

      const request = new NextRequest('http://localhost:3000/api/cast', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })

      const response = await PUT(request)

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/cast', () => {
    it('should delete an existing cast member', async () => {
      mockedDb.cast.delete.mockResolvedValue({})

      const request = new NextRequest('http://localhost:3000/api/cast?id=test-id', {
        method: 'DELETE',
      })

      const response = await DELETE(request)

      expect(response.status).toBe(204)
      expect(mockedDb.cast.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      })
    })

    it('should return 404 for non-existent cast member', async () => {
      // Mock Prisma error for record not found
      const prismaError = new Error('Record not found')
      ;(prismaError as any).code = 'P2025'
      mockedDb.cast.delete.mockRejectedValue(prismaError)

      const request = new NextRequest('http://localhost:3000/api/cast?id=non-existent-id', {
        method: 'DELETE',
      })

      const response = await DELETE(request)

      expect(response.status).toBe(404)
    })
  })
})

/**
 * @design_doc   Not available
 * @related_to   Cast domain API endpoints
 * @known_issues Not available
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { GET, POST, PUT, DELETE } from './route'
import { NextRequest } from 'next/server'

describe('Cast API endpoints', () => {
  describe('GET /api/cast', () => {
    it('should return all cast members', async () => {
      const request = new NextRequest('http://localhost:3000/api/cast')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
    })

    it('should return a cast member by id', async () => {
      const request = new NextRequest('http://localhost:3000/api/cast?id=test-id')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('id', 'test-id')
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
        isActive: true,
        workStart: '10:00',
        workEnd: '22:00',
        specialDesignationFee: 2000,
        regularDesignationFee: 1000,
        availableOptions: ['option1'],
      }

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
      const request = new NextRequest('http://localhost:3000/api/cast?id=test-id', {
        method: 'DELETE',
      })

      const response = await DELETE(request)

      expect(response.status).toBe(204)
    })

    it('should return 404 for non-existent cast member', async () => {
      const request = new NextRequest('http://localhost:3000/api/cast?id=non-existent-id', {
        method: 'DELETE',
      })

      const response = await DELETE(request)

      expect(response.status).toBe(404)
    })
  })
})

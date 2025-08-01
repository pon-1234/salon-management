/**
 * @design_doc   Test for chat API with database persistence
 * @related_to   Chat API route.ts, Prisma Message model
 * @known_issues Initial failing tests for TDD implementation
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT } from './route'
import { db as prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock prisma
vi.mock('@/lib/db', () => ({
  db: {
    message: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

describe('Chat API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/chat', () => {
    it('should fetch messages for a specific customer from database', async () => {
      const mockSession = { user: { role: 'admin' } }
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const mockMessages = [
        {
          id: '1',
          customerId: 'customer1',
          sender: 'customer',
          content: 'Hello',
          timestamp: '2024-01-01T10:00:00.000Z',
          readStatus: '既読',
          isReservationInfo: false,
          reservationInfo: undefined,
          createdAt: '2024-01-01T10:00:00.000Z',
          updatedAt: '2024-01-01T10:00:00.000Z',
        },
      ]

      vi.mocked(prisma.message.findMany).mockResolvedValue(mockMessages)

      const request = new NextRequest('http://localhost/api/chat?customerId=customer1')
      const response = await GET(request)
      const data = await response.json()

      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: { customerId: 'customer1' },
        orderBy: { timestamp: 'asc' },
      })
      expect(data).toEqual(mockMessages)
    })

    it('should fetch all messages grouped by customer when no customerId provided', async () => {
      const mockSession = { user: { role: 'admin' } }
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const mockMessages = [
        {
          id: '1',
          customerId: 'customer1',
          sender: 'customer',
          content: 'Hello',
          timestamp: '2024-01-01T10:00:00.000Z',
          readStatus: '既読',
          isReservationInfo: false,
          reservationInfo: undefined,
          createdAt: '2024-01-01T10:00:00.000Z',
          updatedAt: '2024-01-01T10:00:00.000Z',
        },
        {
          id: '2',
          customerId: 'customer2',
          sender: 'customer',
          content: 'Hi',
          timestamp: '2024-01-01T11:00:00.000Z',
          readStatus: '未読',
          isReservationInfo: false,
          reservationInfo: undefined,
          createdAt: '2024-01-01T11:00:00.000Z',
          updatedAt: '2024-01-01T11:00:00.000Z',
        },
      ]

      vi.mocked(prisma.message.findMany).mockResolvedValue(mockMessages)

      const request = new NextRequest('http://localhost/api/chat')
      const response = await GET(request)
      const data = await response.json()

      expect(prisma.message.findMany).toHaveBeenCalledWith({
        orderBy: { timestamp: 'asc' },
      })
      expect(data).toEqual({
        customer1: [mockMessages[0]],
        customer2: [mockMessages[1]],
      })
    })

    it('should return 401 if not authenticated as admin', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/chat')
      const response = await GET(request)

      expect(response.status).toBe(401)
      expect(await response.json()).toEqual({ error: 'Unauthorized' })
    })
  })

  describe('POST /api/chat', () => {
    it('should create a new message in database', async () => {
      const mockSession = { user: { role: 'admin' } }
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const newMessage = {
        customerId: 'customer1',
        sender: 'staff' as const,
        content: 'How can I help you?',
      }

      const createdMessage = {
        id: 'msg123',
        ...newMessage,
        timestamp: '2024-01-01T12:00:00.000Z',
        readStatus: '未読',
        isReservationInfo: false,
        reservationInfo: null,
        createdAt: '2024-01-01T12:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z',
      }

      vi.mocked(prisma.message.create).mockResolvedValue(createdMessage)

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify(newMessage),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          customerId: 'customer1',
          sender: 'staff',
          content: 'How can I help you?',
          timestamp: expect.any(Date),
          readStatus: '未読',
          isReservationInfo: false,
          reservationInfo: undefined,
        },
      })
      expect(data).toMatchObject({
        id: 'msg123',
        customerId: 'customer1',
        sender: 'staff',
        content: 'How can I help you?',
      })
    })

    it('should create message with reservation info when provided', async () => {
      const mockSession = { user: { role: 'admin' } }
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const newMessage = {
        customerId: 'customer1',
        sender: 'staff' as const,
        content: 'Reservation confirmed',
        isReservationInfo: true,
        reservationInfo: {
          date: '2024-01-10',
          time: '14:00',
          confirmedDate: '2024-01-01',
        },
      }

      const createdMessage = {
        id: 'msg124',
        ...newMessage,
        timestamp: '2024-01-01T12:00:00.000Z',
        readStatus: '未読',
        createdAt: '2024-01-01T12:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z',
      }

      vi.mocked(prisma.message.create).mockResolvedValue(createdMessage)

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify(newMessage),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isReservationInfo: true,
          reservationInfo: newMessage.reservationInfo,
        }),
      })
    })

    it('should return 400 for invalid request body', async () => {
      const mockSession = { user: { role: 'admin' } }
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const invalidMessage = {
        customerId: 'customer1',
        // Missing required fields
      }

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify(invalidMessage),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error', 'Validation error')
    })
  })

  describe('PUT /api/chat', () => {
    it('should update message read status in database', async () => {
      const mockSession = { user: { role: 'admin' } }
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const updatedMessage = {
        id: 'msg123',
        customerId: 'customer1',
        sender: 'customer',
        content: 'Hello',
        timestamp: '2024-01-01T10:00:00.000Z',
        readStatus: '既読',
        isReservationInfo: false,
        reservationInfo: null,
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z',
      }

      vi.mocked(prisma.message.update).mockResolvedValue(updatedMessage)

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'PUT',
        body: JSON.stringify({ id: 'msg123', readStatus: '既読' }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: 'msg123' },
        data: { readStatus: '既読' },
      })
      expect(data).toEqual(updatedMessage)
    })

    it('should return 404 if message not found', async () => {
      const mockSession = { user: { role: 'admin' } }
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      vi.mocked(prisma.message.update).mockRejectedValue(new Error('Record to update not found.'))

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'PUT',
        body: JSON.stringify({ id: 'nonexistent', readStatus: '既読' }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Message not found' })
    })
  })
})

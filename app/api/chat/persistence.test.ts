/**
 * @design_doc   Test to verify chat messages persist across page refreshes
 * @related_to   Chat API, Message model persistence
 * @known_issues None
 */
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'
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
    },
  },
}))

describe('Chat Message Persistence', () => {
  it('should persist messages and retrieve them on subsequent requests', async () => {
    const mockSession = { user: { role: 'admin' } }
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    // Step 1: Create a new message
    const newMessage = {
      customerId: 'test-customer-1',
      sender: 'staff' as const,
      content: 'This message should persist across page refreshes',
    }

    const createdMessage = {
      id: 'persisted-msg-1',
      ...newMessage,
      timestamp: new Date().toISOString(),
      readStatus: '未読',
      isReservationInfo: false,
      reservationInfo: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    vi.mocked(prisma.message.create).mockResolvedValue(createdMessage)

    const createRequest = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify(newMessage),
    })

    const createResponse = await POST(createRequest)
    expect(createResponse.status).toBe(201)

    // Step 2: Simulate page refresh by fetching messages again
    vi.mocked(prisma.message.findMany).mockResolvedValue([createdMessage])

    const getRequest = new NextRequest('http://localhost/api/chat?customerId=test-customer-1')
    const getResponse = await GET(getRequest)
    expect(getResponse.status).toBe(200)

    const retrievedMessages = await getResponse.json()
    expect(retrievedMessages).toHaveLength(1)
    expect(retrievedMessages[0]).toMatchObject({
      id: 'persisted-msg-1',
      content: 'This message should persist across page refreshes',
      customerId: 'test-customer-1',
      sender: 'staff',
    })

    // Verify database methods were called correctly
    expect(prisma.message.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerId: 'test-customer-1',
        sender: 'staff',
        content: 'This message should persist across page refreshes',
      }),
    })

    expect(prisma.message.findMany).toHaveBeenCalledWith({
      where: { customerId: 'test-customer-1' },
      orderBy: { timestamp: 'asc' },
    })
  })

  it('should handle multiple messages from different senders persistently', async () => {
    const mockSession = { user: { role: 'admin' } }
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    // Mock multiple messages in database
    const persistedMessages = [
      {
        id: 'msg-1',
        customerId: 'customer-1',
        sender: 'customer',
        content: 'Initial customer message',
        timestamp: new Date('2024-01-01T10:00:00Z').toISOString(),
        readStatus: '既読',
        isReservationInfo: false,
        reservationInfo: null,
        createdAt: new Date('2024-01-01T10:00:00Z').toISOString(),
        updatedAt: new Date('2024-01-01T10:00:00Z').toISOString(),
      },
      {
        id: 'msg-2',
        customerId: 'customer-1',
        sender: 'staff',
        content: 'Staff response',
        timestamp: new Date('2024-01-01T10:05:00Z').toISOString(),
        readStatus: '既読',
        isReservationInfo: false,
        reservationInfo: null,
        createdAt: new Date('2024-01-01T10:05:00Z').toISOString(),
        updatedAt: new Date('2024-01-01T10:05:00Z').toISOString(),
      },
      {
        id: 'msg-3',
        customerId: 'customer-1',
        sender: 'customer',
        content: 'Follow-up question',
        timestamp: new Date('2024-01-01T10:10:00Z').toISOString(),
        readStatus: '未読',
        isReservationInfo: false,
        reservationInfo: null,
        createdAt: new Date('2024-01-01T10:10:00Z').toISOString(),
        updatedAt: new Date('2024-01-01T10:10:00Z').toISOString(),
      },
    ]

    vi.mocked(prisma.message.findMany).mockResolvedValue(persistedMessages)

    // Fetch messages after "page refresh"
    const request = new NextRequest('http://localhost/api/chat?customerId=customer-1')
    const response = await GET(request)
    expect(response.status).toBe(200)

    const messages = await response.json()
    expect(messages).toHaveLength(3)

    // Verify messages are in correct order (oldest first)
    expect(messages[0].content).toBe('Initial customer message')
    expect(messages[1].content).toBe('Staff response')
    expect(messages[2].content).toBe('Follow-up question')

    // Verify read status persists
    expect(messages[0].readStatus).toBe('既読')
    expect(messages[1].readStatus).toBe('既読')
    expect(messages[2].readStatus).toBe('未読')
  })
})

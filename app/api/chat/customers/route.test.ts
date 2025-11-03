/**
 * @design_doc   Test for chat customers API with database integration
 * @related_to   Chat customers route.ts, Customer model, Message model
 * @known_issues Initial failing tests for TDD implementation
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { db as prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock prisma
vi.mock('@/lib/db', () => ({
  db: {
    customer: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
  },
}))

describe('Chat Customers API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/chat/customers', () => {
    it('should fetch all customers with last message info from database', async () => {
      const mockSession = { user: { role: 'admin' } }
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const mockCustomers = [
        {
          id: '1',
          name: '山田 太郎',
          nameKana: 'ヤマダ タロウ',
          email: 'yamada@example.com',
          phone: '090-1234-5678',
          password: 'hashed',
          birthDate: new Date('1990-01-01'),
          memberType: 'regular',
          points: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
          resetToken: null,
          resetTokenExpiry: null,
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiry: null,
        },
        {
          id: '2',
          name: '佐藤 花子',
          nameKana: 'サトウ ハナコ',
          email: 'sato@example.com',
          phone: '090-8765-4321',
          password: 'hashed',
          birthDate: new Date('1985-05-15'),
          memberType: 'vip',
          points: 500,
          createdAt: new Date(),
          updatedAt: new Date(),
          resetToken: null,
          resetTokenExpiry: null,
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiry: null,
        },
      ]

      // Use recent timestamps for proper formatting
      const now = new Date()
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000)
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000)

      const mockMessages = [
        {
          id: 'msg1',
          castId: null,
          customerId: '1',
          content: 'お問い合わせありがとうございます。どのような内容でしょうか？',
          sender: 'staff',
          timestamp: tenMinutesAgo,
          readStatus: '既読',
          isReservationInfo: false,
          reservationInfo: null,
          createdAt: tenMinutesAgo,
          updatedAt: tenMinutesAgo,
        },
        {
          id: 'msg2',
          castId: null,
          customerId: '2',
          content: '明日の予約を変更したいのですが可能でしょうか？',
          sender: 'customer',
          timestamp: threeHoursAgo,
          readStatus: '未読',
          isReservationInfo: false,
          reservationInfo: null,
          createdAt: threeHoursAgo,
          updatedAt: threeHoursAgo,
        },
      ]

      vi.mocked(prisma.customer.findMany).mockResolvedValue(mockCustomers)
      vi.mocked(prisma.message.findMany).mockResolvedValue(mockMessages)

      const request = new NextRequest('http://localhost/api/chat/customers')
      const response = await GET(request)
      const data = await response.json()

      expect(prisma.customer.findMany).toHaveBeenCalled()
      expect(prisma.message.findMany).toHaveBeenCalled()

      expect(data.data).toHaveLength(2)
      // Check that we got 2 customers sorted by last message time
      expect(data.data[0]).toMatchObject({
        id: '1',
        name: '山田 太郎',
        lastMessage: 'お問い合わせありがとうございます。どのような内容でしょうか？',
        hasUnread: false,
        unreadCount: 0,
        memberType: 'regular',
      })
      // Validate timestamp format is HH:MM for recent messages
      expect(data.data[0].lastMessageTime).toMatch(/^\d{1,2}:\d{2}$/)

      expect(data.data[1]).toMatchObject({
        id: '2',
        name: '佐藤 花子',
        lastMessage: '明日の予約を変更したいのですが可能でしょうか？',
        hasUnread: true,
        unreadCount: 1,
        memberType: 'vip',
      })
      expect(data.data[1].lastMessageTime).toMatch(/^\d{1,2}:\d{2}$/)
    })

    it('should fetch specific customer by id', async () => {
      const mockSession = { user: { role: 'admin' } }
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const mockCustomer = {
        id: '1',
        name: '山田 太郎',
        nameKana: 'ヤマダ タロウ',
        email: 'yamada@example.com',
        phone: '090-1234-5678',
        password: 'hashed',
        birthDate: new Date('1990-01-01'),
        memberType: 'regular',
        points: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        resetToken: null,
        resetTokenExpiry: null,
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      }

      const now = new Date()
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000)

      const mockLastMessage = {
        id: 'msg1',
        castId: null,
        customerId: '1',
        content: 'お問い合わせありがとうございます。どのような内容でしょうか？',
        sender: 'staff',
        timestamp: tenMinutesAgo,
        readStatus: '既読',
        isReservationInfo: false,
        reservationInfo: null,
        createdAt: tenMinutesAgo,
        updatedAt: tenMinutesAgo,
      }

      vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer)
      vi.mocked(prisma.message.findFirst).mockResolvedValue(mockLastMessage)
      vi.mocked(prisma.message.count).mockResolvedValue(0)

      const request = new NextRequest('http://localhost/api/chat/customers?id=1')
      const response = await GET(request)
      const data = await response.json()

      expect(prisma.customer.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      })
      expect(prisma.message.findFirst).toHaveBeenCalledWith({
        where: { customerId: '1' },
        orderBy: { timestamp: 'desc' },
      })
      expect(prisma.message.count).toHaveBeenCalledWith({
        where: {
          customerId: '1',
          sender: 'customer',
          readStatus: '未読',
        },
      })

      expect(data).toMatchObject({
        id: '1',
        name: '山田 太郎',
        lastMessage: 'お問い合わせありがとうございます。どのような内容でしょうか？',
        hasUnread: false,
        memberType: 'regular',
      })
      // Validate timestamp format
      expect(data.lastMessageTime).toMatch(/^\d{1,2}:\d{2}$/)
    })

    it('should return 404 if customer not found', async () => {
      const mockSession = { user: { role: 'admin' } }
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/chat/customers?id=nonexistent')
      const response = await GET(request)

      expect(response.status).toBe(404)
      expect(await response.json()).toEqual({ error: 'Customer not found' })
    })

    it('should return 401 if not authenticated as admin', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/chat/customers')
      const response = await GET(request)

      expect(response.status).toBe(401)
      expect(await response.json()).toEqual({ error: '認証が必要です' })
    })
  })
})

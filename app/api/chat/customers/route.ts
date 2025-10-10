/**
 * @design_doc   Chat customers API endpoint
 * @related_to   Chat system, Customer management, Message model
 * @known_issues None
 */
import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/utils'
import { handleApiError } from '@/lib/api/errors'
import { SuccessResponses } from '@/lib/api/responses'

// Customer type for chat
interface ChatCustomer {
  id: string
  name: string
  lastMessage: string
  lastMessageTime: string
  avatar?: string
  hasUnread: boolean
  unreadCount: number
  isOnline: boolean
  lastSeen?: string
  memberType: string
  status: 'オンライン' | 'オフライン' | '退席中'
}

// Helper function to format timestamp
function formatTimestamp(timestamp: Date | string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)

  if (diffInDays > 1) {
    return `${diffInDays}日前`
  } else if (diffInDays === 1) {
    return '昨日'
  } else if (diffInHours > 0) {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } else {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}

// GET /api/chat/customers - Get chat customer list
export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')

  try {
    if (id) {
      // Get specific customer
      const customer = await prisma.customer.findUnique({
        where: { id },
      })

      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      }

      // Get last message and unread count
      const lastMessage = await prisma.message.findFirst({
        where: { customerId: id },
        orderBy: { timestamp: 'desc' },
      })

      const unreadCount = await prisma.message.count({
        where: {
          customerId: id,
          sender: 'customer',
          readStatus: '未読',
        },
      })

      const chatCustomer: ChatCustomer = {
        id: customer.id,
        name: customer.name,
        lastMessage: lastMessage?.content || '',
        lastMessageTime: lastMessage ? formatTimestamp(lastMessage.timestamp) : '',
        avatar: `/avatars/customer${customer.id}.jpg`,
        hasUnread: unreadCount > 0,
        unreadCount,
        isOnline: false, // TODO: Implement real-time status
        lastSeen: undefined,
        memberType: customer.memberType,
        status: 'オフライン',
      }

      return NextResponse.json(chatCustomer)
    }

    // Return all chat customers
    const customers = await prisma.customer.findMany()
    const messages = await prisma.message.findMany({
      orderBy: { timestamp: 'desc' },
    })

    // Group messages by customer to get last message
    const lastMessageByCustomer = new Map<string, any>()
    const unreadCountByCustomer = new Map<string, number>()

    messages.forEach((message) => {
      if (!message.customerId) return
      if (!lastMessageByCustomer.has(message.customerId)) {
        lastMessageByCustomer.set(message.customerId, message)
      }
      if (message.sender === 'customer' && message.readStatus === '未読') {
        unreadCountByCustomer.set(
          message.customerId,
          (unreadCountByCustomer.get(message.customerId) || 0) + 1
        )
      }
    })

    const chatCustomers: ChatCustomer[] = customers.map((customer) => {
      const lastMessage = lastMessageByCustomer.get(customer.id)
      const unreadCount = unreadCountByCustomer.get(customer.id) || 0

      return {
        id: customer.id,
        name: customer.name,
        lastMessage: lastMessage?.content || '',
        lastMessageTime: lastMessage ? formatTimestamp(lastMessage.timestamp) : '',
        avatar: `/avatars/customer${customer.id}.jpg`,
        hasUnread: unreadCount > 0,
        unreadCount,
        isOnline: false, // TODO: Implement real-time status
        lastSeen: undefined,
        memberType: customer.memberType,
        status: 'オフライン',
      }
    })

    // Sort by last message time (most recent first)
    chatCustomers.sort((a, b) => {
      const aTime = lastMessageByCustomer.get(a.id)?.timestamp || new Date(0)
      const bTime = lastMessageByCustomer.get(b.id)?.timestamp || new Date(0)
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })

    return SuccessResponses.ok(chatCustomers)
  } catch (error) {
    return handleApiError(error)
  }
}

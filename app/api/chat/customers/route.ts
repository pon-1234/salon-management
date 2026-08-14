/**
 * @design_doc   Chat customers API endpoint
 * @related_to   Chat system, Customer management, Message model
 * @known_issues Multi-store customers remain unavailable until messages carry a store identity
 */
import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/utils'
import { handleApiError } from '@/lib/api/errors'
import { SuccessResponses } from '@/lib/api/responses'
import { buildChatPreview } from '@/lib/chat/attachments'
import { isActiveChatStore, resolveCustomerChatScope } from '@/lib/chat/customer-store-scope'

// Customer type for chat
interface ChatCustomer {
  id: string
  name: string
  phone: string
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
  const searchParams = request.nextUrl.searchParams
  const storeId = searchParams.get('storeId')?.trim() ?? ''
  const authError = await requireAdmin({
    permissions: 'customer:read',
    ...(storeId ? { storeId } : {}),
  })
  if (authError) return authError

  if (!storeId) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 })
  }

  if (!(await isActiveChatStore(prisma, storeId))) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }

  const id = searchParams.get('id')
  const query = searchParams.get('query')?.trim().slice(0, 100) ?? ''
  const requestedLimit = Number.parseInt(searchParams.get('limit') ?? '50', 10)
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50

  try {
    const customerStoreScope = await resolveCustomerChatScope(prisma, storeId)

    if (id) {
      const customer = await prisma.customer.findFirst({
        where: { id, ...customerStoreScope },
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
        phone: customer.phone,
        lastMessage: lastMessage
          ? buildChatPreview(lastMessage.content, lastMessage.attachments)
          : '',
        lastMessageTime: lastMessage ? formatTimestamp(lastMessage.timestamp) : '',
        avatar: undefined,
        hasUnread: unreadCount > 0,
        unreadCount,
        isOnline: false,
        lastSeen: undefined,
        memberType: customer.memberType,
        status: 'オフライン',
      }

      return NextResponse.json(chatCustomer)
    }

    const nameSearch = query
      ? {
          OR: [
            { name: { contains: query, mode: 'insensitive' as const } },
            { nameKana: { contains: query, mode: 'insensitive' as const } },
          ],
        }
      : null
    const customers = await prisma.customer.findMany({
      where: nameSearch ? { AND: [customerStoreScope, nameSearch] } : customerStoreScope,
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })
    const customerIds = customers.map((customer) => customer.id)
    const messages =
      customerIds.length > 0
        ? await prisma.message.findMany({
            where: { customerId: { in: customerIds } },
            orderBy: { timestamp: 'desc' },
          })
        : []

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
        phone: customer.phone,
        lastMessage: lastMessage
          ? buildChatPreview(lastMessage.content, lastMessage.attachments)
          : '',
        lastMessageTime: lastMessage ? formatTimestamp(lastMessage.timestamp) : '',
        avatar: undefined,
        hasUnread: unreadCount > 0,
        unreadCount,
        isOnline: false,
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

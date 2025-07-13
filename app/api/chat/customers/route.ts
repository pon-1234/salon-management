/**
 * @design_doc   Chat customers API endpoint
 * @related_to   Chat system, Customer management
 * @known_issues Customer data is using mock data
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

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
  memberType: 'regular' | 'vip'
  status: 'オンライン' | 'オフライン' | '退席中'
}

// Mock customer data for chat
const chatCustomers: ChatCustomer[] = [
  {
    id: '1',
    name: '山田 太郎',
    lastMessage: 'お問い合わせありがとうございます。どのような内容でしょうか？',
    lastMessageTime: '10:32',
    avatar: '/avatars/customer1.jpg',
    hasUnread: false,
    unreadCount: 0,
    isOnline: true,
    memberType: 'regular',
    status: 'オンライン',
  },
  {
    id: '2',
    name: '佐藤 花子',
    lastMessage: '明日の予約を変更したいのですが可能でしょうか？',
    lastMessageTime: '14:15',
    avatar: '/avatars/customer2.jpg',
    hasUnread: true,
    unreadCount: 1,
    isOnline: false,
    lastSeen: '30分前',
    memberType: 'vip',
    status: 'オフライン',
  },
  {
    id: '3',
    name: '鈴木 一郎',
    lastMessage: 'ありがとうございました。',
    lastMessageTime: '昨日',
    avatar: '/avatars/customer3.jpg',
    hasUnread: false,
    unreadCount: 0,
    isOnline: false,
    lastSeen: '昨日',
    memberType: 'regular',
    status: 'オフライン',
  },
  {
    id: '4',
    name: '田中 美咲',
    lastMessage: '了解しました。よろしくお願いします。',
    lastMessageTime: '2日前',
    avatar: '/avatars/customer4.jpg',
    hasUnread: false,
    unreadCount: 0,
    isOnline: false,
    lastSeen: '2時間前',
    memberType: 'vip',
    status: '退席中',
  },
]

async function requireAdmin() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}

// GET /api/chat/customers - Get chat customer list
export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')

  if (id) {
    // Get specific customer
    const customer = chatCustomers.find((c) => c.id === id)

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json(customer)
  }

  // Return all chat customers
  return NextResponse.json(chatCustomers)
}

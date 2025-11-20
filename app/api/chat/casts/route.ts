/**
 * @design_doc   Chat casts API endpoint
 * @related_to   Chat system, Cast management, Message model
 */
import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/utils'
import { handleApiError } from '@/lib/api/errors'
import { SuccessResponses } from '@/lib/api/responses'
import { buildChatPreview } from '@/lib/chat/attachments'

interface ChatCast {
  id: string
  name: string
  lastMessage: string
  lastMessageTime: string
  avatar?: string
  hasUnread: boolean
  unreadCount: number
  isOnline: boolean
  lastSeen?: string
  status: 'オンライン' | 'オフライン' | '退席中'
}

function formatTimestamp(timestamp: Date | string): string {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    day: '2-digit',
  })
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')

  try {
    if (id) {
      const cast = await prisma.cast.findUnique({ where: { id } })
      if (!cast) {
        return NextResponse.json({ error: 'Cast not found' }, { status: 404 })
      }

      const lastMessage = await prisma.message.findFirst({
        where: { castId: id },
        orderBy: { timestamp: 'desc' },
      })

      const unreadCount = await prisma.message.count({
        where: {
          castId: id,
          sender: 'cast',
          readStatus: '未読',
        },
      })

      const chatCast: ChatCast = {
        id: cast.id,
        name: cast.name,
        lastMessage: lastMessage
          ? buildChatPreview(lastMessage.content, lastMessage.attachments)
          : '',
        lastMessageTime: lastMessage ? formatTimestamp(lastMessage.timestamp) : '',
        avatar: cast.image || `/avatars/cast-${cast.id}.jpg`,
        hasUnread: unreadCount > 0,
        unreadCount,
        isOnline: false,
        lastSeen: undefined,
        status: 'オフライン',
      }

      return SuccessResponses.ok(chatCast)
    }

    const casts = await prisma.cast.findMany()
    const messages = await prisma.message.findMany({
      where: {
        castId: { not: null },
      },
      orderBy: { timestamp: 'desc' },
    })

    const lastMessageByCast = new Map<string, any>()
    const unreadCountByCast = new Map<string, number>()

    messages.forEach((message) => {
      if (!message.castId) return
      if (!lastMessageByCast.has(message.castId)) {
        lastMessageByCast.set(message.castId, message)
      }
      if (message.sender === 'cast' && message.readStatus === '未読') {
        unreadCountByCast.set(
          message.castId,
          (unreadCountByCast.get(message.castId) || 0) + 1
        )
      }
    })

    const chatCasts: ChatCast[] = casts.map((cast) => {
      const lastMessage = lastMessageByCast.get(cast.id)
      const unreadCount = unreadCountByCast.get(cast.id) || 0

      return {
        id: cast.id,
        name: cast.name,
        lastMessage: lastMessage
          ? buildChatPreview(lastMessage.content, lastMessage.attachments)
          : '',
        lastMessageTime: lastMessage ? formatTimestamp(lastMessage.timestamp) : '',
        avatar: cast.image || `/avatars/cast-${cast.id}.jpg`,
        hasUnread: unreadCount > 0,
        unreadCount,
        isOnline: false,
        lastSeen: undefined,
        status: 'オフライン',
      }
    })

    chatCasts.sort((a, b) => {
      const aTime = lastMessageByCast.get(a.id)?.timestamp || new Date(0)
      const bTime = lastMessageByCast.get(b.id)?.timestamp || new Date(0)
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })

    return SuccessResponses.ok(chatCasts)
  } catch (error) {
    return handleApiError(error)
  }
}

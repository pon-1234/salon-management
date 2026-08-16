/**
 * @design_doc   Chat API endpoints for admin-customer messaging
 * @related_to   Chat components, Customer type, Message model
 * @known_issues Multi-store customers remain unavailable until messages carry a store identity
 */
import { NextRequest } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/utils'
import { handleApiError, ErrorResponses } from '@/lib/api/errors'
import { SuccessResponses } from '@/lib/api/responses'
import { Message, Prisma } from '@prisma/client'
import { castNotificationService } from '@/lib/notification/cast-service'
import { normalizeChatAttachments } from '@/lib/chat/attachments'
import type { ChatAttachment } from '@/lib/types/chat'
import { chatMessageSchema } from '@/lib/chat/schema'
import { z } from 'zod'
import { isActiveChatStore, resolveCustomerChatScope } from '@/lib/chat/customer-store-scope'

type ApiChatMessage = Omit<Message, 'attachments'> & { attachments: ChatAttachment[] }

function normalizeMessage(message: Message): ApiChatMessage {
  return {
    ...message,
    attachments: normalizeChatAttachments(message.attachments as Prisma.JsonValue | null),
  }
}

async function findVisibleCustomer(customerId: string, storeId: string) {
  const customerStoreScope = await resolveCustomerChatScope(prisma, storeId)
  return prisma.customer.findFirst({
    where: { id: customerId, ...customerStoreScope },
    select: { id: true },
  })
}

// GET /api/chat - Get messages for a customer
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const storeId = searchParams.get('storeId')?.trim() ?? ''
  const customerId = searchParams.get('customerId')
  const castId = searchParams.get('castId')
  const participantPermission =
    Boolean(customerId) !== Boolean(castId)
      ? customerId
        ? 'customer:read'
        : 'cast:read'
      : undefined
  const authError = await requireAdmin({
    ...(participantPermission ? { permissions: participantPermission } : {}),
    ...(storeId ? { storeId } : {}),
  })
  if (authError) return authError

  if (!storeId) {
    return ErrorResponses.badRequest('storeId is required')
  }

  if (!(await isActiveChatStore(prisma, storeId))) {
    return ErrorResponses.notFound('店舗')
  }

  try {
    if (Boolean(customerId) === Boolean(castId)) {
      return ErrorResponses.badRequest('customerId または castId のどちらか一方が必要です')
    }

    if (customerId) {
      const customer = await findVisibleCustomer(customerId, storeId)
      if (!customer) {
        return ErrorResponses.notFound('顧客')
      }

      const messages = await prisma.message.findMany({
        where: { customerId },
        orderBy: { timestamp: 'asc' },
      })
      const normalized: ApiChatMessage[] = messages.map((message) => normalizeMessage(message))
      return SuccessResponses.ok(normalized)
    }

    if (castId) {
      const cast = await prisma.cast.findFirst({
        where: { id: castId, storeId },
        select: { id: true },
      })
      if (!cast) {
        return ErrorResponses.notFound('キャスト')
      }

      const messages = await prisma.message.findMany({
        where: { castId },
        orderBy: { timestamp: 'asc' },
      })
      return SuccessResponses.ok(
        messages.map((message) => ({
          ...message,
          attachments: normalizeChatAttachments(message.attachments as Prisma.JsonValue | null),
        }))
      )
    }

    return ErrorResponses.badRequest('participant is required')
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/chat - Send a new message
export async function POST(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const body = await request.json()

    // Validate request body
    const {
      storeId,
      customerId,
      castId,
      sender,
      content,
      attachments,
      isReservationInfo,
      reservationInfo,
    } = chatMessageSchema.parse(body)

    const storeAuthError = await requireAdmin({
      permissions: customerId ? 'customer:read' : 'cast:read',
      storeId,
    })
    if (storeAuthError) return storeAuthError

    if (!(await isActiveChatStore(prisma, storeId))) {
      return ErrorResponses.notFound('店舗')
    }

    const trimmedContent = (content ?? '').trim()

    if (customerId) {
      const customer = await findVisibleCustomer(customerId, storeId)
      if (!customer) {
        return ErrorResponses.notFound('顧客')
      }
    }

    const castForNotification = castId
      ? await prisma.cast.findFirst({
          where: { id: castId, storeId },
          select: {
            id: true,
            name: true,
            lineUserId: true,
          },
        })
      : null

    if (castId && !castForNotification) {
      return ErrorResponses.notFound('キャスト')
    }

    // Create new message in database
    const newMessage = await prisma.message.create({
      data: {
        customerId,
        castId,
        sender,
        content: trimmedContent,
        timestamp: new Date(),
        readStatus: sender === 'staff' ? '未読' : sender === 'customer' ? '既読' : '既読',
        isReservationInfo: isReservationInfo || false,
        reservationInfo: reservationInfo || Prisma.JsonNull,
        attachments: attachments && attachments.length > 0 ? attachments : Prisma.JsonNull,
      },
    })

    if (castForNotification) {
      try {
        await castNotificationService.sendChatMessageNotification({
          cast: {
            id: castForNotification.id,
            name: castForNotification.name,
            lineUserId: castForNotification.lineUserId,
          },
          message: {
            id: newMessage.id,
            sender: newMessage.sender as 'customer' | 'staff' | 'cast',
            content: newMessage.content,
            timestamp: newMessage.timestamp,
            attachments: attachments as ChatAttachment[] | undefined,
          },
        })
      } catch {
        // Error already logged inside CastNotificationService
      }
    }

    return SuccessResponses.created(
      {
        ...newMessage,
        attachments: normalizeChatAttachments(newMessage.attachments as Prisma.JsonValue | null),
      },
      'メッセージが送信されました'
    )
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/chat - Update message (mark as read)
export async function PUT(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const body = await request.json()
    const { storeId, id, readStatus } = z
      .object({
        storeId: z.string().trim().min(1).max(100),
        id: z.string().trim().min(1),
        readStatus: z.literal('既読'),
      })
      .strict()
      .parse(body)

    const storeAuthError = await requireAdmin({ storeId })
    if (storeAuthError) return storeAuthError

    if (!(await isActiveChatStore(prisma, storeId))) {
      return ErrorResponses.notFound('店舗')
    }

    const customerStoreScope = await resolveCustomerChatScope(prisma, storeId)
    const visibleMessage = await prisma.message.findFirst({
      where: {
        id,
        sender: { in: ['customer', 'cast'] },
        OR: [{ cast: { is: { storeId } } }, { customer: { is: customerStoreScope } }],
      },
      select: { id: true, customerId: true, castId: true },
    })
    if (!visibleMessage) {
      return ErrorResponses.notFound('メッセージ')
    }

    const participantPermission = visibleMessage.customerId
      ? 'customer:read'
      : visibleMessage.castId
        ? 'cast:read'
        : null
    if (!participantPermission) {
      return ErrorResponses.notFound('メッセージ')
    }

    const participantAuthError = await requireAdmin({
      permissions: participantPermission,
      storeId,
    })
    if (participantAuthError) return participantAuthError

    // Update message in database
    const updatedMessage = await prisma.message.update({
      where: { id },
      data: { readStatus },
    })

    return SuccessResponses.updated(updatedMessage)
  } catch (error) {
    return handleApiError(error)
  }
}

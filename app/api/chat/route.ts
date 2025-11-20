/**
 * @design_doc   Chat API endpoints for admin-customer messaging
 * @related_to   Chat components, Customer type, Message model
 * @known_issues None
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db as prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/utils'
import { handleApiError, ErrorResponses } from '@/lib/api/errors'
import { SuccessResponses } from '@/lib/api/responses'
import { Message, Prisma } from '@prisma/client'
import { castNotificationService } from '@/lib/notification/cast-service'
import { normalizeChatAttachments } from '@/lib/chat/attachments'
import type { ChatAttachment } from '@/lib/types/chat'

type ApiChatMessage = Omit<Message, 'attachments'> & { attachments: ChatAttachment[] }

function normalizeMessage(message: Message): ApiChatMessage {
  return {
    ...message,
    attachments: normalizeChatAttachments(message.attachments as Prisma.JsonValue | null),
  }
}

const attachmentSchema = z.object({
  type: z.literal('image'),
  url: z.string().url(),
  name: z.string().optional(),
  size: z.number().int().min(0).optional(),
  contentType: z.string().optional(),
})

// Message validation schema
const messageSchema = z
  .object({
    customerId: z.string().min(1).optional(),
    castId: z.string().min(1).optional(),
    sender: z.enum(['customer', 'staff', 'cast']),
    content: z.string().optional(),
    attachments: z.array(attachmentSchema).max(5).optional(),
    isReservationInfo: z.boolean().optional(),
    reservationInfo: z
      .object({
        date: z.string(),
        time: z.string(),
        confirmedDate: z.string(),
      })
      .optional(),
  })
  .refine((data) => data.customerId || data.castId, {
    message: 'customerId または castId のいずれかを指定してください',
  })
  .refine(
    (data) => {
      const contentLength = (data.content ?? '').trim().length
      const attachmentCount = data.attachments?.length ?? 0
      return contentLength > 0 || attachmentCount > 0
    },
    { message: 'メッセージまたは画像を入力してください' }
  )

// GET /api/chat - Get messages for a customer
export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const searchParams = request.nextUrl.searchParams
  const customerId = searchParams.get('customerId')
  const castId = searchParams.get('castId')

  try {
    if (customerId) {
      const messages = await prisma.message.findMany({
        where: { customerId },
        orderBy: { timestamp: 'asc' },
      })
      const normalized: ApiChatMessage[] = messages.map((message) => normalizeMessage(message))
      return SuccessResponses.ok(normalized)
    }

    if (castId) {
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

    // Get all messages grouped by customer
    const messages = await prisma.message.findMany({
      orderBy: { timestamp: 'asc' },
    })

    const messagesByCustomer = messages.reduce(
      (acc, msg) => {
        if (msg.customerId) {
          const normalized = normalizeMessage(msg)
          acc[msg.customerId] = acc[msg.customerId] || []
          acc[msg.customerId].push(normalized)
        }
        return acc
      },
      {} as Record<string, ApiChatMessage[]>
    )

    return SuccessResponses.ok(messagesByCustomer)
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
      customerId,
      castId,
      sender,
      content,
      attachments,
      isReservationInfo,
      reservationInfo,
    } = messageSchema.parse(body)

    const trimmedContent = (content ?? '').trim()

    const castForNotification = castId
      ? await prisma.cast.findUnique({
          where: { id: castId },
          select: {
            id: true,
            name: true,
            lineUserId: true,
          },
        })
      : null

    // Create new message in database
    const newMessage = await prisma.message.create({
      data: {
        customerId,
        castId,
        sender,
        content: trimmedContent,
        timestamp: new Date(),
        readStatus:
          sender === 'staff'
            ? '未読'
            : sender === 'customer'
              ? '既読'
              : '既読',
        isReservationInfo: isReservationInfo || false,
        reservationInfo: reservationInfo || Prisma.JsonNull,
        attachments: attachments && attachments.length > 0 ? attachments : Prisma.JsonNull,
      },
    })

    if (castForNotification && sender !== 'cast') {
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
    const { id, readStatus } = body

    if (!id) {
      return ErrorResponses.badRequest('メッセージIDが必要です')
    }

    // Update message in database
    const updatedMessage = await prisma.message.update({
      where: { id },
      data: { readStatus: readStatus || '既読' },
    })

    return SuccessResponses.updated(updatedMessage)
  } catch (error) {
    return handleApiError(error)
  }
}

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

// Message validation schema
const messageSchema = z.object({
  customerId: z.string().min(1).optional(),
  castId: z.string().min(1).optional(),
  sender: z.enum(['customer', 'staff', 'cast']),
  content: z.string().min(1),
  isReservationInfo: z.boolean().optional(),
  reservationInfo: z
    .object({
      date: z.string(),
      time: z.string(),
      confirmedDate: z.string(),
    })
    .optional(),
}).refine((data) => data.customerId || data.castId, {
  message: 'customerId または castId のいずれかを指定してください',
})

// GET /api/chat - Get messages for a customer
export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const searchParams = request.nextUrl.searchParams
  const customerId = searchParams.get('customerId')
  const castId = searchParams.get('castId')

  try {
    if (customerId) {
      // Get messages for specific customer
      const messages = await prisma.message.findMany({
        where: { customerId },
        orderBy: { timestamp: 'asc' },
      })
      return SuccessResponses.ok(messages)
    }

    if (castId) {
      const messages = await prisma.message.findMany({
        where: { castId },
        orderBy: { timestamp: 'asc' },
      })
      return SuccessResponses.ok(messages)
    }

    // Get all messages grouped by customer
    const messages = await prisma.message.findMany({
      orderBy: { timestamp: 'asc' },
    })

    const messagesByCustomer = messages.reduce(
      (acc, msg) => {
        if (msg.customerId) {
          acc[msg.customerId] = acc[msg.customerId] || []
          acc[msg.customerId].push(msg)
        }
        return acc
      },
      {} as Record<string, Message[]>
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
    const validatedData = messageSchema.parse(body)

    // Create new message in database
    const newMessage = await prisma.message.create({
      data: {
        customerId: validatedData.customerId,
        castId: validatedData.castId,
        sender: validatedData.sender,
        content: validatedData.content,
        timestamp: new Date(),
        readStatus:
          validatedData.sender === 'staff'
            ? '未読'
            : validatedData.sender === 'customer'
              ? '既読'
              : '既読',
        isReservationInfo: validatedData.isReservationInfo || false,
        reservationInfo: validatedData.reservationInfo || Prisma.JsonNull,
      },
    })

    return SuccessResponses.created(newMessage, 'メッセージが送信されました')
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

/**
 * @design_doc   Chat API endpoints for admin-customer messaging
 * @related_to   Chat components, Customer type
 * @known_issues Chat data is stored in memory (not persisted to database)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { z } from 'zod'

// Message type definition
interface Message {
  id: string
  customerId: string
  sender: 'customer' | 'staff'
  content: string
  timestamp: string
  readStatus?: '未読' | '既読'
  isReservationInfo?: boolean
  reservationInfo?: {
    date: string
    time: string
    confirmedDate: string
  }
}

// In-memory storage (should be replaced with database in production)
let messages: Message[] = [
  {
    id: '1',
    customerId: '1',
    sender: 'customer',
    content: 'こんにちは。本日の予約の件で確認したいことがあります。',
    timestamp: '10:30',
    readStatus: '既読',
  },
  {
    id: '2',
    customerId: '1',
    sender: 'staff',
    content: 'お問い合わせありがとうございます。どのような内容でしょうか？',
    timestamp: '10:32',
    readStatus: '既読',
  },
  {
    id: '3',
    customerId: '2',
    sender: 'customer',
    content: '明日の予約を変更したいのですが可能でしょうか？',
    timestamp: '14:15',
    readStatus: '未読',
  },
]

// Message validation schema
const messageSchema = z.object({
  customerId: z.string().min(1),
  sender: z.enum(['customer', 'staff']),
  content: z.string().min(1),
  isReservationInfo: z.boolean().optional(),
  reservationInfo: z
    .object({
      date: z.string(),
      time: z.string(),
      confirmedDate: z.string(),
    })
    .optional(),
})

async function requireAdmin() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}

// GET /api/chat - Get messages for a customer
export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const searchParams = request.nextUrl.searchParams
  const customerId = searchParams.get('customerId')

  if (customerId) {
    // Get messages for specific customer
    const customerMessages = messages.filter((msg) => msg.customerId === customerId)
    return NextResponse.json(customerMessages)
  }

  // Get all messages grouped by customer
  const messagesByCustomer = messages.reduce(
    (acc, msg) => {
      if (!acc[msg.customerId]) {
        acc[msg.customerId] = []
      }
      acc[msg.customerId].push(msg)
      return acc
    },
    {} as Record<string, Message[]>
  )

  return NextResponse.json(messagesByCustomer)
}

// POST /api/chat - Send a new message
export async function POST(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const body = await request.json()

    // Validate request body
    const validatedData = messageSchema.parse(body)

    // Create new message
    const newMessage: Message = {
      id: Date.now().toString(),
      ...validatedData,
      timestamp: new Date().toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      readStatus: validatedData.sender === 'staff' ? '未読' : '既読',
    }

    // Add to messages array
    messages.push(newMessage)

    return NextResponse.json(newMessage, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 })
    }

    // Find and update message
    const messageIndex = messages.findIndex((msg) => msg.id === id)

    if (messageIndex === -1) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    messages[messageIndex] = {
      ...messages[messageIndex],
      readStatus: readStatus || '既読',
    }

    return NextResponse.json(messages[messageIndex])
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

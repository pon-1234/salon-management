import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireCast } from '@/lib/auth/utils'
import { normalizeChatAttachments } from '@/lib/chat/attachments'
import logger from '@/lib/logger'

const attachmentSchema = z.object({
  type: z.literal('image'),
  url: z.string().url(),
  name: z.string().optional(),
  size: z.number().int().min(0).optional(),
  contentType: z.string().optional(),
})

const messageSchema = z
  .object({
    content: z.string().optional(),
    attachments: z.array(attachmentSchema).max(5).optional(),
  })
  .refine(
    (data) => {
      const contentLength = (data.content ?? '').trim().length
      const attachmentCount = data.attachments?.length ?? 0
      return contentLength > 0 || attachmentCount > 0
    },
    { message: 'メッセージまたは画像を入力してください' }
  )

const markReadSchema = z.object({
  messageIds: z.array(z.string()).optional(),
})

export async function GET(request: NextRequest) {
  const { error, session } = await requireCast()
  if (error || !session) {
    return error ?? NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  try {
    const messages = await db.message.findMany({
      where: {
        castId: session.user.id,
      },
      orderBy: {
        timestamp: 'asc',
      },
      take: 250,
    })

    await db.message.updateMany({
      where: {
        castId: session.user.id,
        sender: 'staff',
        readStatus: '未読',
      },
      data: {
        readStatus: '既読',
      },
    })

    return NextResponse.json(
      messages.map((message) => ({
        ...message,
        attachments: normalizeChatAttachments(message.attachments as Prisma.JsonValue | null),
      }))
    )
  } catch (err) {
    logger.error('Failed to load cast chat messages', err)
    return NextResponse.json({ error: 'メッセージの取得に失敗しました。' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireCast()
  if (error || !session) {
    return error ?? NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { content, attachments } = messageSchema.parse(body)
    const trimmedContent = (content ?? '').trim()

    const message = await db.message.create({
      data: {
        castId: session.user.id,
        sender: 'cast',
        content: trimmedContent,
        timestamp: new Date(),
        readStatus: '未読',
        attachments: attachments && attachments.length > 0 ? attachments : Prisma.JsonNull,
      },
    })

    return NextResponse.json(
      {
        ...message,
        attachments: normalizeChatAttachments(message.attachments as Prisma.JsonValue | null),
      },
      { status: 201 }
    )
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? '入力が不正です。' },
        { status: 400 }
      )
    }

    logger.error('Failed to send cast chat message', err)
    return NextResponse.json({ error: 'メッセージの送信に失敗しました。' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const { error, session } = await requireCast()
  if (error || !session) {
    return error ?? NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { messageIds } = markReadSchema.parse(body)

    if (messageIds && messageIds.length > 0) {
      await db.message.updateMany({
        where: {
          id: {
            in: messageIds,
          },
          castId: session.user.id,
          sender: 'staff',
        },
        data: {
          readStatus: '既読',
        },
      })
    } else {
      await db.message.updateMany({
        where: {
          castId: session.user.id,
          sender: 'staff',
          readStatus: '未読',
        },
        data: {
          readStatus: '既読',
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: '入力が不正です。' }, { status: 400 })
    }

    logger.error('Failed to mark cast messages as read', err)
    return NextResponse.json({ error: '既読処理に失敗しました。' }, { status: 500 })
  }
}

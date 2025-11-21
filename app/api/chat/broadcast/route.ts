import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/utils'
import { attachmentSchema } from '@/lib/chat/schema'
import { Prisma } from '@prisma/client'

const broadcastSchema = z
  .object({
    target: z.enum(['customers', 'casts']),
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

export async function POST(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const payload = await request.json()
    const { target, content, attachments } = broadcastSchema.parse(payload)
    const trimmedContent = (content ?? '').trim()

    const recipients =
      target === 'customers'
        ? await db.customer.findMany({ select: { id: true } })
        : await db.cast.findMany({ select: { id: true } })

    if (recipients.length === 0) {
      return NextResponse.json({ error: '送信対象が存在しません。' }, { status: 400 })
    }

    const timestamp = new Date()
    const chunkSize = 100
    const totalRecipients = recipients.length
    const dataEntries: Prisma.MessageCreateManyInput[] = recipients.map((recipient) => ({
      customerId: target === 'customers' ? recipient.id : null,
      castId: target === 'casts' ? recipient.id : null,
      sender: 'staff',
      content: trimmedContent,
      timestamp,
      readStatus: '未読',
      isReservationInfo: false,
      attachments: attachments && attachments.length > 0 ? attachments : Prisma.JsonNull,
    }))

    for (let i = 0; i < dataEntries.length; i += chunkSize) {
      const slice = dataEntries.slice(i, i + chunkSize)
      await db.message.createMany({
        data: slice,
      })
    }

    return NextResponse.json({
      data: {
        target,
        count: totalRecipients,
      },
    })
  } catch (error) {
    console.error('Broadcast failed:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues.map((issue) => issue.message).join(', ') },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: '一括送信に失敗しました。' }, { status: 500 })
  }
}

/**
 * @design_doc   Store-scoped administrative chat broadcast persistence
 * @related_to   ChatBroadcastDialog, Customer, Cast, and Message models
 * @known_issues Customers visiting multiple stores retain one shared chat thread
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/utils'
import { attachmentSchema } from '@/lib/chat/schema'
import logger from '@/lib/logger'
import { Prisma } from '@prisma/client'
import { isActiveChatStore, resolveCustomerChatScope } from '@/lib/chat/customer-store-scope'

const broadcastSchema = z
  .object({
    storeId: z.string().trim().min(1).max(100),
    target: z.enum(['customers', 'casts']),
    content: z.string().max(1000).optional(),
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
    const { storeId, target, content, attachments } = broadcastSchema.parse(payload)
    const storeAuthError = await requireAdmin({ storeId })
    if (storeAuthError) return storeAuthError

    if (!(await isActiveChatStore(db, storeId))) {
      return NextResponse.json({ error: '店舗が見つかりません。' }, { status: 404 })
    }

    const trimmedContent = (content ?? '').trim()

    const customerStoreScope =
      target === 'customers' ? await resolveCustomerChatScope(db, storeId) : null
    const recipients =
      target === 'customers'
        ? await db.customer.findMany({
            ...(customerStoreScope && Object.keys(customerStoreScope).length > 0
              ? { where: customerStoreScope }
              : {}),
            select: { id: true },
          })
        : await db.cast.findMany({ where: { storeId }, select: { id: true } })

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

    const writes: Array<ReturnType<typeof db.message.createMany>> = []
    for (let i = 0; i < dataEntries.length; i += chunkSize) {
      const slice = dataEntries.slice(i, i + chunkSize)
      writes.push(
        db.message.createMany({
          data: slice,
        })
      )
    }
    await db.$transaction(writes)

    return NextResponse.json({
      data: {
        target,
        count: totalRecipients,
      },
    })
  } catch (error) {
    logger.error('Broadcast failed:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues.map((issue) => issue.message).join(', ') },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: '一括送信に失敗しました。' }, { status: 500 })
  }
}

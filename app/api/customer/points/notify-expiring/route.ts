'use server'

import { NextRequest, NextResponse } from 'next/server'
import { addDays } from 'date-fns'
import { requireAdmin } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { emailClient } from '@/lib/email/client'
import logger from '@/lib/logger'

export async function POST(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const cutoff = addDays(new Date(), 30)
    const expiring = await db.customerPointHistory.findMany({
      where: {
        type: 'earned',
        isExpired: false,
        expiresAt: {
          gte: new Date(),
          lte: cutoff,
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        expiresAt: 'asc',
      },
    })

    const grouped = new Map<
      string,
      {
        customerId: string
        customerName: string
        customerEmail: string
        total: number
        earliest: Date
      }
    >()

    for (const entry of expiring) {
      if (!entry.customer || !entry.customer.email) continue
      const existing = grouped.get(entry.customerId)
      if (existing) {
        existing.total += entry.amount
        if (entry.expiresAt && entry.expiresAt < existing.earliest) {
          existing.earliest = entry.expiresAt
        }
      } else if (entry.expiresAt) {
        grouped.set(entry.customerId, {
          customerId: entry.customerId,
          customerName: entry.customer.name,
          customerEmail: entry.customer.email,
          total: entry.amount,
          earliest: entry.expiresAt,
        })
      }
    }

    let successCount = 0
    for (const [, notification] of grouped) {
      const body = `こんにちは ${notification.customerName} 様

以下のポイントがまもなく有効期限を迎えます。

・失効予定ポイント: ${notification.total.toLocaleString()} pt
・失効予定日: ${notification.earliest.toLocaleDateString('ja-JP')}

お早めのご利用をおすすめいたします。`

      const result = await emailClient.send({
        to: notification.customerEmail,
        subject: '【重要】ポイント有効期限のお知らせ',
        body,
      })

      if (!result.success) {
        logger.error(
          { customerId: notification.customerId, error: result.error },
          'Failed to send expiration warning email'
        )
      } else {
        successCount++
      }
    }

    return NextResponse.json({
      message: '通知を送信しました',
      notifiedCount: successCount,
    })
  } catch (error) {
    logger.error({ err: error }, 'Failed to process point expiration notifications')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

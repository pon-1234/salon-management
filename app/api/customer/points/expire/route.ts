'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { addPointTransaction } from '@/lib/point/utils'
import logger from '@/lib/logger'

function verifyCronAuth(request: NextRequest) {
  const header = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  // デバッグログ（本番では削除すること）
  logger.info({
    hasSecret: !!secret,
    secretPrefix: secret?.substring(0, 10),
    hasHeader: !!header,
    headerPrefix: header?.substring(0, 20),
  }, 'CRON auth debug')

  if (!secret || !header) return false

  const token = header.replace(/^Bearer\s+/i, '').trim()
  return token.length > 0 && token === secret
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const cronAuthorized = verifyCronAuth(request)

  if (!session && !cronAuthorized) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  if (session && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const now = new Date()
    const expirables = await db.customerPointHistory.findMany({
      where: {
        type: 'earned',
        isExpired: false,
        expiresAt: {
          lte: now,
        },
      },
    })

    let processedCount = 0
    const errors: Array<{ customerId: string; reason: string }> = []

    for (const history of expirables) {
      try {
        await db.$transaction(async (tx) => {
          await addPointTransaction(
            {
              customerId: history.customerId,
              type: 'expired',
              amount: -history.amount,
              description: `ポイント失効: ${history.description}`,
              relatedService: history.relatedService ?? undefined,
              sourceHistoryId: history.id,
            },
            tx
          )

          await tx.customerPointHistory.update({
            where: { id: history.id },
            data: { isExpired: true },
          })
        })
        processedCount++
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          (typeof error.meta?.target === 'string'
            ? error.meta.target.includes('sourceHistoryId')
            : Array.isArray(error.meta?.target) &&
              error.meta.target.some((target) => String(target).includes('sourceHistoryId')))
        ) {
          logger.warn(
            { pointHistoryId: history.id, customerId: history.customerId },
            'Point already expired in concurrent process'
          )
          continue
        }

        logger.error(
          { err: error, pointHistoryId: history.id, customerId: history.customerId },
          'Failed to expire points for customer'
        )
        errors.push({ customerId: history.customerId, reason: (error as Error).message })
      }
    }

    return NextResponse.json({
      message: 'ポイント失効処理が完了しました',
      processedCount,
      errorCount: errors.length,
      errors: errors.length ? errors : undefined,
    })
  } catch (error) {
    logger.error({ err: error }, 'Unexpected error when expiring points')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

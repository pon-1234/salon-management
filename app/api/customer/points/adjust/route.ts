'use server'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { addPointTransaction } from '@/lib/point/utils'
import logger from '@/lib/logger'

const adjustPointsSchema = z.object({
  customerId: z.string().min(1),
  amount: z.number().int(),
  reason: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const payload = adjustPointsSchema.parse(await request.json())
    await db.$transaction(async (tx) => {
      await addPointTransaction(
        {
          customerId: payload.customerId,
          type: 'adjusted',
          amount: payload.amount,
          description: `手動調整: ${payload.reason}`,
        },
        tx
      )
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '入力データが無効です', details: error.errors },
        { status: 400 }
      )
    }

    logger.error({ err: error }, 'Failed to adjust customer points')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

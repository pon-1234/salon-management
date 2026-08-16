/**
 * @design_doc   Authorized manual customer point adjustments
 * @related_to   Point ledger utilities and customer:update permission
 * @known_issues None
 */
'use server'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { addPointTransaction } from '@/lib/point/utils'
import logger from '@/lib/logger'
import { ensureStoreId, resolveStoreId } from '@/lib/store/server'

const adjustPointsSchema = z.object({
  customerId: z.string().min(1),
  amount: z.number().int(),
  reason: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const authError = await requireAdmin({ permissions: 'customer:update' })
  if (authError) return authError

  let storeId: string
  try {
    storeId = await ensureStoreId(await resolveStoreId(request))
  } catch {
    return NextResponse.json({ error: '店舗を確認してください' }, { status: 400 })
  }

  const storeAuthError = await requireAdmin({ permissions: 'customer:update', storeId })
  if (storeAuthError) return storeAuthError

  try {
    const payload = adjustPointsSchema.parse(await request.json())
    const assignment = await db.customerStoreAssignment.findUnique({
      where: { customerId_storeId: { customerId: payload.customerId, storeId } },
      select: { customerId: true },
    })
    if (!assignment) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

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

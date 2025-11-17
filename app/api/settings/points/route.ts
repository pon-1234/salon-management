'use server'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { resolveStoreId, ensureStoreId } from '@/lib/store/server'

const pointSettingsSchema = z.object({
  pointEarnRate: z.coerce.number().min(0).max(100),
  pointExpirationMonths: z.coerce.number().min(1).max(36),
  pointMinUsage: z.coerce.number().min(0),
})

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const storeId = await ensureStoreId(await resolveStoreId(request))
  const settings = await db.storeSettings.findUnique({ where: { storeId } })
  if (!settings) {
    return NextResponse.json({ error: '店舗情報が未設定です' }, { status: 404 })
  }

  return NextResponse.json({
    pointEarnRate: Number(settings.pointEarnRate ?? 1),
    pointExpirationMonths: Number(settings.pointExpirationMonths ?? 12),
    pointMinUsage: Number(settings.pointMinUsage ?? 100),
  })
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const storeId = await ensureStoreId(await resolveStoreId(request))
  const payload = pointSettingsSchema.parse(await request.json())
  const settings = await db.storeSettings.findUnique({ where: { storeId } })
  if (!settings) {
    return NextResponse.json({ error: '店舗情報が未設定です' }, { status: 404 })
  }

  await db.storeSettings.update({
    where: { id: settings.id },
    data: payload,
  })

  return NextResponse.json(payload)
}

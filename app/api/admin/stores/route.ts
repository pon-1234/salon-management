/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md database-backed multi-store administrator UAT
 * @related_to   contexts/store-context.tsx consumes this catalog; lib/auth/store-access.ts enforces scope
 * @known_issues Store theme and location are not persisted yet, so neutral presentation defaults are returned
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { Prisma } from '@prisma/client'

import { authOptions } from '@/lib/auth/config'
import { canAdminAccessStore, hasGlobalAdminStoreAccess } from '@/lib/auth/store-access'
import { db } from '@/lib/db'
import { DEFAULT_BUSINESS_HOURS, parseBusinessHoursString } from '@/lib/settings/business-hours'

type StoreCatalogRecord = Prisma.StoreGetPayload<{
  include: { storeSettings: true }
}>

function serializeStore(record: StoreCatalogRecord) {
  const hours = parseBusinessHoursString(
    record.storeSettings?.businessHours,
    DEFAULT_BUSINESS_HOURS
  )

  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    displayName: record.displayName,
    address: record.storeSettings?.address ?? record.address ?? '',
    phone: record.storeSettings?.phone ?? record.phone ?? '',
    email: record.storeSettings?.email ?? record.email ?? '',
    openingHours: {
      weekday: { open: hours.startLabel, close: hours.endLabel },
      weekend: { open: hours.startLabel, close: hours.endLabel },
    },
    location: { lat: 0, lng: 0 },
    features: [],
    images: { main: '', gallery: [] },
    welfareExpenseRate: Number(record.storeSettings?.welfareExpenseRate ?? 10),
    marketingChannels: record.storeSettings?.marketingChannels ?? [],
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

/** Returns only active stores authorized by both the current session and database assignments. */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const requestedStoreId = request.nextUrl.searchParams.get('storeId')?.trim().toLowerCase() || null
  if (requestedStoreId && !canAdminAccessStore(session.user, requestedStoreId)) {
    return NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
  }

  try {
    const stores = await db.store.findMany({
      where: {
        isActive: true,
        ...(hasGlobalAdminStoreAccess(session.user)
          ? {}
          : { adminAssignments: { some: { adminId: session.user.id } } }),
        ...(requestedStoreId ? { id: requestedStoreId } : {}),
      },
      include: { storeSettings: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    })

    const visibleStores = stores
      .filter((store) => store.isActive && canAdminAccessStore(session.user, store.id))
      .map(serializeStore)

    return NextResponse.json({ stores: visibleStores })
  } catch {
    return NextResponse.json({ error: '店舗一覧の取得に失敗しました' }, { status: 500 })
  }
}

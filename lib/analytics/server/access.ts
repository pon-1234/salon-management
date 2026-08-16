/**
 * @design_doc   Multi-store analytics authorization boundary
 * @related_to   Analytics API routes and requireAdmin store assignment checks
 * @known_issues Requests without store context remain bound to the legacy fallback store
 */
import type { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/utils'
import { ensureStoreId, resolveStoreId } from '@/lib/store/server'
import { FALLBACK_STORE_ID } from './common'

export interface AnalyticsAccessResult {
  storeId: string
  error: NextResponse | null
}

export async function requireAnalyticsAccess(request: NextRequest): Promise<AnalyticsAccessResult> {
  const requestedStoreId = await resolveStoreId(request)
  const storeId = await ensureStoreId(requestedStoreId ?? FALLBACK_STORE_ID)
  const error = await requireAdmin({ permissions: 'analytics:read', storeId })
  return { storeId, error }
}

/**
 * @design_doc   Multi-store analytics authorization boundary
 * @related_to   Analytics API routes and requireAdmin store assignment checks
 * @known_issues URLs without storeId remain bound to the legacy fallback store
 */
import type { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/utils'
import { FALLBACK_STORE_ID } from './common'

export interface AnalyticsAccessResult {
  storeId: string
  error: NextResponse | null
}

export async function requireAnalyticsAccess(request: NextRequest): Promise<AnalyticsAccessResult> {
  const requestedStoreId = request.nextUrl.searchParams.get('storeId')?.trim().toLowerCase()
  const storeId = requestedStoreId || FALLBACK_STORE_ID
  const error = await requireAdmin({ permissions: 'analytics:read', storeId })
  return { storeId, error }
}

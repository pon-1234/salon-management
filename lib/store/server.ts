import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

const DEFAULT_STORE_ID = 'ikebukuro'
const storeCache = new Map<string, boolean>()

async function storeExists(storeId: string): Promise<boolean> {
  if (!storeId) {
    return false
  }

  if (storeCache.has(storeId)) {
    return storeCache.get(storeId) ?? false
  }

  const store = await db.store.findUnique({
    where: { id: storeId },
    select: { id: true },
  })

  const exists = Boolean(store)
  storeCache.set(storeId, exists)
  return exists
}

function extractStoreCandidate(request: NextRequest): string | null {
  const searchParams = request.nextUrl.searchParams
  const queryStore = searchParams.get('storeId') ?? searchParams.get('store')
  if (queryStore) {
    return queryStore
  }

  const headerStore =
    request.headers.get('x-store-id') ??
    request.headers.get('x-store-code') ??
    request.headers.get('x-tenant-id')
  if (headerStore) {
    return headerStore
  }

  const hostname = request.nextUrl.hostname || request.headers.get('host') || ''
  if (hostname) {
    const host = hostname.split(':')[0]
    const segments = host.split('.')
    if (segments.length > 2) {
      return segments[0]
    }
  }

  return null
}

export async function resolveStoreId(request: NextRequest): Promise<string | null> {
  const candidate = extractStoreCandidate(request)
  if (!candidate) {
    return null
  }

  const normalized = candidate.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}

export async function ensureStoreId(storeId?: string | null): Promise<string> {
  const normalized = storeId?.trim().toLowerCase()
  if (normalized && (await storeExists(normalized))) {
    return normalized
  }

  if (!(await storeExists(DEFAULT_STORE_ID))) {
    await db.store.upsert({
      where: { id: DEFAULT_STORE_ID },
      update: {},
      create: {
        id: DEFAULT_STORE_ID,
        name: '池袋店',
        displayName: 'サロン池袋店',
        slug: DEFAULT_STORE_ID,
      },
    })
    storeCache.set(DEFAULT_STORE_ID, true)
  }

  return DEFAULT_STORE_ID
}

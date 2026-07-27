/**
 * @design_doc   DEVELOPMENT_GUIDE.md public store review display
 * @related_to   loadPublicStoreHomeData: shared public store payload construction
 * @known_issues docs/LEGACY_GOLD_ADMIN_MIGRATION_INVENTORY.md tracks legacy review migration gaps
 */
import { NextResponse } from 'next/server'
import { loadPublicStoreHomeData } from '@/lib/store/public-home-server'

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const normalizedSlug = slug?.toLowerCase()

  if (!normalizedSlug) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }

  try {
    const payload = await loadPublicStoreHomeData(normalizedSlug)
    if (!payload) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }
    return NextResponse.json(payload)
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}

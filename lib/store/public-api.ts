/**
 * @design_doc   Production public storefront data integrity
 * @related_to   public-home-server.ts provides the shared route and Server Component payload
 * @known_issues Development fallback data remains opt-in for local demos
 */
import { loadPublicStoreHomeData } from './public-home-server'
import type { PublicStoreHomeData } from './public-types'
import type { Store } from './types'

export async function fetchPublicStoreHomeData(slug: string): Promise<PublicStoreHomeData | null> {
  return loadPublicStoreHomeData(slug)
}

export async function fetchStoreBySlug(slug: string): Promise<Store | null> {
  const data = await loadPublicStoreHomeData(slug)
  return data?.store ?? null
}

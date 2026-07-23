/**
 * @design_doc   Multi-store administrator navigation authorization
 * @related_to   contexts/store-context.tsx and lib/auth/store-access.ts
 * @known_issues Store metadata is supplied by the configured catalogue
 */
import type { Store } from './types'
import { canAdminAccessStore, type StoreAccessUser } from '@/lib/auth/store-access'

export function filterAdminStores(stores: readonly Store[], user: StoreAccessUser): Store[] {
  return stores.filter((store) => canAdminAccessStore(user, store.id))
}

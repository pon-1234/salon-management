/**
 * @design_doc   Multi-store administrator navigation authorization
 * @related_to   contexts/store-context.tsx and NextAuth storeIds
 * @known_issues Store metadata still comes from the configured store catalogue
 */
import { describe, expect, it } from 'vitest'
import type { Store } from './types'
import { filterAdminStores } from './admin-stores'

const stores = [
  { id: 'ikebukuro', slug: 'ikebukuro' },
  { id: 'ginza', slug: 'ginza' },
  { id: 'shinjuku', slug: 'shinjuku' },
] as Store[]

describe('filterAdminStores', () => {
  it('returns every active store for a super administrator', () => {
    expect(
      filterAdminStores(stores, {
        role: 'admin',
        adminRole: 'super_admin',
        permissions: ['*'],
        storeIds: [],
      })
    ).toEqual(stores)
  })

  it('returns only explicitly assigned stores for other administrators', () => {
    expect(
      filterAdminStores(stores, {
        role: 'admin',
        adminRole: 'manager',
        permissions: ['reservation:*'],
        storeIds: ['ginza'],
      })
    ).toEqual([stores[1]])
  })

  it('fails closed for an administrator with no assignments', () => {
    expect(
      filterAdminStores(stores, {
        role: 'admin',
        adminRole: 'staff',
        permissions: ['reservation:read'],
      })
    ).toEqual([])
  })
})

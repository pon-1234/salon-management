/**
 * @design_doc   Customer chat visibility while customer identities remain globally unique
 * @related_to   Administrative customer chat list and store-scoped broadcast
 * @known_issues Multi-store customers remain unavailable until messages carry a store identity
 */
import { describe, expect, it, vi } from 'vitest'

import { resolveCustomerChatScope } from './customer-store-scope'

describe('resolveCustomerChatScope', () => {
  it('uses CustomerStoreAssignment even when only one store is active', async () => {
    const count = vi.fn().mockResolvedValue(1)

    await expect(resolveCustomerChatScope({ store: { count } }, 'uat-ikebukuro')).resolves.toEqual({
      storeAssignments: {
        some: { storeId: 'uat-ikebukuro' },
        every: { storeId: 'uat-ikebukuro' },
      },
    })
    expect(count).not.toHaveBeenCalled()
  })

  it('uses the same persisted assignment boundary when multiple stores are active', async () => {
    const count = vi.fn().mockResolvedValue(2)

    await expect(resolveCustomerChatScope({ store: { count } }, 'store-a')).resolves.toEqual({
      storeAssignments: {
        some: { storeId: 'store-a' },
        every: { storeId: 'store-a' },
      },
    })
    expect(count).not.toHaveBeenCalled()
  })
})

/**
 * @design_doc   Customer chat visibility while customer identities remain globally unique
 * @related_to   Administrative customer chat list and store-scoped broadcast
 * @known_issues Per-store customer ownership requires the separately approved schema policy
 */
import { describe, expect, it, vi } from 'vitest'

import { resolveCustomerChatScope } from './customer-store-scope'

describe('resolveCustomerChatScope', () => {
  it('keeps every migrated customer visible when the deployment has one active store', async () => {
    const count = vi.fn().mockResolvedValue(1)

    await expect(resolveCustomerChatScope({ store: { count } }, 'uat-ikebukuro')).resolves.toEqual(
      {}
    )
    expect(count).toHaveBeenCalledWith({ where: { isActive: true } })
  })

  it('limits customers to reservation-derived membership once multiple stores are active', async () => {
    const count = vi.fn().mockResolvedValue(2)

    await expect(resolveCustomerChatScope({ store: { count } }, 'store-a')).resolves.toEqual({
      reservations: { some: { storeId: 'store-a' } },
    })
  })
})

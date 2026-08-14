/**
 * @design_doc   Customer chat visibility while customer identities remain globally unique
 * @related_to   Administrative customer chat list and store-scoped broadcast
 * @known_issues Multi-store customers remain unavailable until messages carry a store identity
 */
import type { Prisma } from '@prisma/client'

interface ActiveStoreDatabase {
  store: {
    findFirst(args: {
      where: { id: string; isActive: boolean }
      select: { id: boolean }
    }): Promise<{ id: string } | null>
  }
}

export async function isActiveChatStore(
  database: ActiveStoreDatabase,
  storeId: string
): Promise<boolean> {
  const store = await database.store.findFirst({
    where: { id: storeId, isActive: true },
    select: { id: true },
  })
  return Boolean(store)
}

/**
 * Customer chat visibility always follows the persisted customer-store assignment. A customer
 * must have an assignment to the selected store and no assignment to any other store because
 * messages do not yet carry their own store identity.
 */
export function resolveCustomerChatScope(
  _database: unknown,
  storeId: string
): Promise<Prisma.CustomerWhereInput> {
  return Promise.resolve({
    storeAssignments: {
      some: { storeId },
      every: { storeId },
    },
  })
}

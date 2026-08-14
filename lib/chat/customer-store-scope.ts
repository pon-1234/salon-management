/**
 * @design_doc   Customer chat visibility while customer identities remain globally unique
 * @related_to   Administrative customer chat list and store-scoped broadcast
 * @known_issues A customer visiting multiple stores still has one shared chat thread
 */
import type { Prisma } from '@prisma/client'

interface CustomerScopeDatabase {
  store: {
    count(args: { where: { isActive: boolean } }): Promise<number>
  }
}

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
 * The migrated Ikebukuro deployment has one store and no persisted customer-store key, so every
 * migrated customer belongs to that sole store. Once multiple stores are active, fail closed and
 * derive membership only from a reservation in the selected store.
 */
export async function resolveCustomerChatScope(
  database: CustomerScopeDatabase,
  storeId: string
): Promise<Prisma.CustomerWhereInput> {
  const activeStoreCount = await database.store.count({ where: { isActive: true } })
  if (activeStoreCount === 1) {
    return {}
  }

  return {
    reservations: {
      some: { storeId },
    },
  }
}

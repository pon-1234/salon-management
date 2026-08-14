/**
 * @design_doc   Multi-store administrator authorization boundary
 * @related_to   NextAuth session storeIds and AdminStoreAssignment
 * @known_issues Customer and message ownership require a separate approved policy
 */
export interface StoreAccessUser {
  role?: string
  adminRole?: string
  permissions?: string[]
  storeIds?: string[]
  storeSlugs?: string[]
}

export function hasGlobalAdminStoreAccess(user: StoreAccessUser): boolean {
  return (
    user.role === 'admin' &&
    (user.adminRole === 'super_admin' || Boolean(user.permissions?.includes('*')))
  )
}

export function canAdminAccessStore(user: StoreAccessUser, storeId: string): boolean {
  if (user.role !== 'admin') {
    return false
  }

  if (hasGlobalAdminStoreAccess(user)) {
    return true
  }

  const normalizedStoreId = storeId.trim().toLowerCase()
  if (!normalizedStoreId) {
    return false
  }

  return (Array.isArray(user.storeIds) ? user.storeIds : []).some(
    (assignedStoreId) =>
      typeof assignedStoreId === 'string' &&
      assignedStoreId.trim().toLowerCase() === normalizedStoreId
  )
}

/** Performs the middleware's preliminary check before a store slug can be canonicalized. */
export function canAdminAccessStoreIdentifier(
  user: StoreAccessUser,
  storeIdOrSlug: string
): boolean {
  if (hasGlobalAdminStoreAccess(user)) {
    return true
  }

  const normalizedIdentifier = storeIdOrSlug.trim().toLowerCase()
  if (user.role !== 'admin' || !normalizedIdentifier) {
    return false
  }

  const assignedIdentifiers = [
    ...(Array.isArray(user.storeIds) ? user.storeIds : []),
    ...(Array.isArray(user.storeSlugs) ? user.storeSlugs : []),
  ]

  return assignedIdentifiers.some(
    (assignedIdentifier) =>
      typeof assignedIdentifier === 'string' &&
      assignedIdentifier.trim().toLowerCase() === normalizedIdentifier
  )
}

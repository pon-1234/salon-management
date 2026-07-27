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
  if (!normalizedStoreId || !Array.isArray(user.storeIds)) {
    return false
  }

  return user.storeIds.some(
    (assignedStoreId) =>
      typeof assignedStoreId === 'string' &&
      assignedStoreId.trim().toLowerCase() === normalizedStoreId
  )
}

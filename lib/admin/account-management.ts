/**
 * @design_doc https://app.notion.com/p/3ccdda8d8bde80ec928cc17adff35cde
 * @related_to AdminInfoPage and /api/admin share store-scoped account management rules
 * @known_issues Managers can edit their own profile but cannot change their own access
 */
type AccountActor =
  | {
      id?: string
      role?: string
      adminRole?: string
      storeIds?: readonly string[]
    }
  | null
  | undefined

type AccountTarget = { id: string; role: string; storeIds: readonly string[] }

export function canCreateStaffAccount(actor: AccountActor, storeIds: readonly string[]): boolean {
  if (actor?.role !== 'admin') return false
  if (actor.adminRole === 'super_admin') return true
  return (
    actor.adminRole === 'manager' &&
    storeIds.length > 0 &&
    storeIds.every((storeId) => actor.storeIds?.includes(storeId) === true)
  )
}

export function canChangeAdminAccess(actor: AccountActor, target: AccountTarget): boolean {
  if (actor?.role !== 'admin') return false
  if (actor.adminRole === 'super_admin') return true
  return target.role === 'staff' && canCreateStaffAccount(actor, target.storeIds)
}

export function canEditAdminAccount(actor: AccountActor, target: AccountTarget): boolean {
  if (actor?.role !== 'admin') return false
  return (
    canChangeAdminAccess(actor, target) ||
    (actor.adminRole === 'manager' && actor.id === target.id && target.role === 'manager')
  )
}

/**
 * @design_doc   Shared permission helpers for RBAC checks
 * @related_to   lib/auth/utils.ts, components using permission-aware UI
 * @known_issues Does not yet support negated permissions
 */

export type Permission = string

function normalizeInput(value: Permission | Permission[]): Permission[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is Permission => typeof entry === 'string')
  }
  return typeof value === 'string' ? [value] : []
}

function matchesNamespaceWildCard(granted: Permission, required: Permission): boolean {
  if (!granted.endsWith(':*')) {
    return false
  }

  const namespace = granted.slice(0, -2)
  if (namespace.length === 0) {
    return false
  }

  if (required === namespace) {
    return true
  }

  return required.startsWith(`${namespace}:`)
}

export function permissionMatches(granted: Permission, required: Permission): boolean {
  if (granted === '*' || granted === required) {
    return true
  }

  return matchesNamespaceWildCard(granted, required)
}

export function hasPermission(
  grantedPermissions: Permission[] | undefined,
  requiredPermission: Permission
): boolean {
  if (!grantedPermissions || grantedPermissions.length === 0) {
    return false
  }

  return grantedPermissions.some((granted) => permissionMatches(granted, requiredPermission))
}

export function hasAnyPermission(
  grantedPermissions: Permission[] | undefined,
  requiredPermissions: Permission | Permission[]
): boolean {
  const required = normalizeInput(requiredPermissions)
  if (required.length === 0) {
    return true
  }

  return required.some((permission) => hasPermission(grantedPermissions, permission))
}

export function hasAllPermissions(
  grantedPermissions: Permission[] | undefined,
  requiredPermissions: Permission | Permission[]
): boolean {
  const required = normalizeInput(requiredPermissions)
  if (required.length === 0) {
    return true
  }

  return required.every((permission) => hasPermission(grantedPermissions, permission))
}

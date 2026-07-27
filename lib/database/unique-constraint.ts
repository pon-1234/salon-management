/**
 * @design_doc   Production database uniqueness conflict boundary
 * @related_to   PaymentService and settlement persistence conflict handling
 * @known_issues Driver error metadata varies, so only the approved constraint name or field is accepted
 */

type DatabaseError = {
  code?: unknown
  constraint?: unknown
  message?: unknown
  meta?: {
    constraint?: unknown
    target?: unknown
  }
}

type UniqueConstraint = {
  name: string
  field: string
}

function matchesExpectedTarget(value: unknown, expected: UniqueConstraint): boolean {
  if (typeof value === 'string') {
    return value === expected.name || value === expected.field || value.includes(expected.name)
  }

  return (
    Array.isArray(value) &&
    value.length === 1 &&
    typeof value[0] === 'string' &&
    value[0] === expected.field
  )
}

/**
 * Recognizes only the requested PostgreSQL/Prisma unique constraint.
 * Other P2002/23505 errors must remain server errors because their retry semantics differ.
 */
export function isExpectedUniqueConstraintError(
  error: unknown,
  expected: UniqueConstraint
): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const databaseError = error as DatabaseError
  if (databaseError.code !== 'P2002' && databaseError.code !== '23505') {
    return false
  }

  return [
    databaseError.constraint,
    databaseError.meta?.constraint,
    databaseError.meta?.target,
    databaseError.message,
  ].some((value) => matchesExpectedTarget(value, expected))
}

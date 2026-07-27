/**
 * @design_doc   API credential-boundary requirements
 * @related_to   Prisma relation payloads returned by API routes
 * @known_issues Private business fields still require route-specific projections
 */
const CREDENTIAL_FIELDS = new Set([
  'password',
  'passwordHash',
  'resetToken',
  'resetTokenExpiry',
  'emailVerificationToken',
  'emailVerificationExpiry',
  'phoneVerificationCode',
  'phoneVerificationExpiry',
  'phoneVerificationAttempts',
])

function isPlainRecord(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export function sanitizeResponseData<T>(value: T, additionalPrivateFields: string[] = []): T {
  const blockedFields = new Set([...CREDENTIAL_FIELDS, ...additionalPrivateFields])

  const sanitize = (current: unknown): unknown => {
    if (Array.isArray(current)) {
      return current.map(sanitize)
    }

    if (current === null || typeof current !== 'object' || !isPlainRecord(current)) {
      return current
    }

    return Object.fromEntries(
      Object.entries(current)
        .filter(([key]) => !blockedFields.has(key))
        .map(([key, nestedValue]) => [key, sanitize(nestedValue)])
    )
  }

  return sanitize(value) as T
}

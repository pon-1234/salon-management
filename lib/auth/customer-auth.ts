/**
 * @design_doc   Canonical customer email identity and closed store-scoped return paths
 * @related_to   Customer registration, verification, login, and password recovery
 * @known_issues Store existence still must be verified against an active Store by server routes
 */
const STORE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_STORE_SLUG_LENGTH = 100

export function normalizeCustomerEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function parseSafeStoreSlug(storeSlug: string | null | undefined): string | null {
  if (
    typeof storeSlug !== 'string' ||
    storeSlug.length < 1 ||
    storeSlug.length > MAX_STORE_SLUG_LENGTH ||
    !STORE_SLUG_PATTERN.test(storeSlug)
  ) {
    return null
  }

  return storeSlug
}

export function buildStoreLoginPath(storeSlug: string | null | undefined): string {
  const safeStoreSlug = parseSafeStoreSlug(storeSlug)
  return safeStoreSlug ? `/${safeStoreSlug}/login` : '/'
}

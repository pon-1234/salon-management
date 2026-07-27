/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md J-1 storefront age verification
 * @related_to   middleware.ts and app/api/age-verification/route.ts
 * @known_issues Verification is self-attested and does not independently prove identity
 */
export const AGE_VERIFICATION_COOKIE = 'salon_age_verified'
export const AGE_VERIFICATION_COOKIE_VALUE = '1'
export const AGE_VERIFICATION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

const NON_STOREFRONT_ROOT_SEGMENTS = new Set([
  '_next',
  'admin',
  'api',
  'auth',
  'cast',
  'images',
  'reset-password',
  'verify-email',
  'videos',
])

export function getStorefrontSlug(pathname: string): string | null {
  const [firstSegment] = pathname.split('/').filter(Boolean)

  if (
    !firstSegment ||
    NON_STOREFRONT_ROOT_SEGMENTS.has(firstSegment) ||
    firstSegment.startsWith('.') ||
    firstSegment.includes('.')
  ) {
    return null
  }

  return firstSegment
}

export function isAgeVerificationPath(pathname: string, storeSlug: string): boolean {
  return (
    pathname === `/${storeSlug}/age-verification` ||
    pathname.startsWith(`/${storeSlug}/age-verification/`)
  )
}

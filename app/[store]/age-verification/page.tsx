/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md J-1 storefront age verification
 * @related_to   middleware.ts redirects unverified storefront requests to this page
 * @known_issues Verification is self-attested and does not independently prove identity
 */
import { AgeVerificationClient } from '@/components/age-verification-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '年齢確認',
}

function sanitizeCallbackUrl(value: string | string[] | undefined, storeSlug: string): string {
  const candidate = Array.isArray(value) ? value[0] : value
  const storeRoot = `/${storeSlug}`

  if (
    !candidate ||
    !candidate.startsWith(storeRoot) ||
    candidate.startsWith('//') ||
    candidate.includes('\r') ||
    candidate.includes('\n')
  ) {
    return storeRoot
  }

  return candidate
}

export default async function StoreAgeVerificationPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string }>
  searchParams: Promise<{ callbackUrl?: string | string[] }>
}) {
  const [{ store }, { callbackUrl }] = await Promise.all([params, searchParams])

  return <AgeVerificationClient callbackUrl={sanitizeCallbackUrl(callbackUrl, store)} />
}

/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md J-1 storefront age verification
 * @related_to   AgeVerification renders the prompt; age-verification API persists consent
 * @known_issues The underage exit destination remains externally configured in a later phase
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AgeVerification } from '@/components/age-verification'

interface AgeVerificationClientProps {
  callbackUrl: string
}

export function AgeVerificationClient({ callbackUrl }: AgeVerificationClientProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const handleVerification = async (isAdult: boolean) => {
    if (!isAdult) {
      window.location.assign('https://www.google.com')
      return
    }

    setError(null)
    try {
      const response = await fetch('/api/age-verification', { method: 'POST' })
      if (!response.ok) {
        throw new Error('Age verification cookie could not be saved')
      }
      router.replace(callbackUrl)
      router.refresh()
    } catch {
      setError('年齢確認を保存できませんでした。もう一度お試しください。')
    }
  }

  return <AgeVerification onVerify={handleVerification} error={error} />
}

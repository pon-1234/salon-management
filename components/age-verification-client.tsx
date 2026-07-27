/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md J-1 storefront age verification
 * @related_to   AgeVerification renders the prompt; age-verification API persists consent
 * @known_issues None
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
  const [declined, setDeclined] = useState(false)

  const handleVerification = async (isAdult: boolean) => {
    if (!isAdult) {
      setDeclined(true)
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

  if (declined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-luxury-black-deep px-4 text-center text-luxury-gold-soft">
        <div className="max-w-md space-y-4 rounded-lg border border-luxury-gold-border/40 bg-luxury-panel-dark p-8">
          <h1 className="text-xl font-semibold text-luxury-gold">ご利用いただけません</h1>
          <p>18歳未満および高校生の方はご利用いただけません。</p>
          <button
            type="button"
            className="min-h-11 rounded-md border border-luxury-gold-border/60 px-5"
            onClick={() => setDeclined(false)}
          >
            年齢確認に戻る
          </button>
        </div>
      </main>
    )
  }

  return <AgeVerification onVerify={handleVerification} error={error} />
}

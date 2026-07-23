'use client'

/**
 * @design_doc   Signed-in customer phone verification without anonymous credential replacement
 * @related_to   verify-phone send and confirm API routes
 * @known_issues Legacy account claiming requires a separately approved identity migration flow
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface VerifyPhoneFormProps {
  storeSlug: string
}

export function VerifyPhoneForm({ storeSlug }: VerifyPhoneFormProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [codeSent, setCodeSent] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) {
      return
    }

    const timer = window.setTimeout(() => {
      setResendCooldown((prev) => Math.max(prev - 1, 0))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [resendCooldown])

  const handleSend = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/auth/verify-phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error ?? 'SMSの送信に失敗しました')
      }
      setCodeSent(true)
      setResendCooldown(60)
      setSuccess('認証コードを送信しました。')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SMSの送信に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/auth/verify-phone/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error ?? '認証に失敗しました')
      }

      setSuccess('SMS認証が完了しました。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '認証に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="luxury-panel w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2 text-2xl text-[#f5e6c4]">
          <ShieldCheck className="h-5 w-5 text-[#f3d08a]" />
          電話番号認証
        </CardTitle>
        <CardDescription className="text-center">
          アカウントに登録済みの電話番号へ認証コードを送信します。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full border-[#3b2e1f] text-[#f5e6c4] hover:bg-[#2b2114]"
          onClick={handleSend}
          disabled={loading || resendCooldown > 0}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {resendCooldown > 0 ? `再送信まで ${resendCooldown}秒` : '認証コードを送信'}
        </Button>

        {codeSent && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="code">認証コード</Label>
              <Input
                id="code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6桁のコード"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                disabled={loading}
              />
            </div>

            <Button
              type="button"
              className="w-full"
              onClick={handleConfirm}
              disabled={loading || code.length !== 6}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              認証する
            </Button>
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground">
          <Link href={`/${storeSlug}/login`} className="text-[#f3d08a] hover:underline">
            ログイン画面に戻る
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

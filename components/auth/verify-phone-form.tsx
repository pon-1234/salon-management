'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Loader2, Phone, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { normalizePhoneNumber, formatPhoneNumber } from '@/lib/customer/utils'

interface VerifyPhoneFormProps {
  storeSlug: string
}

export function VerifyPhoneForm({ storeSlug }: VerifyPhoneFormProps) {
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') === 'claim' ? 'claim' : 'verify'
  const initialPhone = searchParams.get('phone') ?? ''

  const [phone, setPhone] = useState(initialPhone)
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [codeSent, setCodeSent] = useState(false)

  const normalizedPhone = useMemo(() => normalizePhoneNumber(phone), [phone])

  const handleSend = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/auth/verify-phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error ?? 'SMSの送信に失敗しました')
      }
      setCodeSent(true)
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
        body: JSON.stringify({
          phone: normalizedPhone,
          code,
          email: mode === 'claim' ? email : undefined,
          password: mode === 'claim' ? password : undefined,
          nickname: mode === 'claim' ? nickname : undefined,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error ?? '認証に失敗しました')
      }

      setSuccess(
        mode === 'claim'
          ? 'SMS認証が完了しました。ログインへ進めます。'
          : 'SMS認証が完了しました。'
      )
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
          {mode === 'claim'
            ? '既存アカウントを引き継ぐためにSMS認証を行います。'
            : '予約前の本人確認のためSMS認証を行います。'}
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

        <div className="space-y-2">
          <Label htmlFor="phone">電話番号</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#cbb88f]" />
            <Input
              id="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              onBlur={() => setPhone(formatPhoneNumber(normalizedPhone))}
              placeholder="090-1234-5678"
              className="pl-10"
              disabled={loading}
            />
          </div>
          <p className="text-xs text-muted-foreground">SMSを受け取る番号を入力してください。</p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full border-[#3b2e1f] text-[#f5e6c4] hover:bg-[#2b2114]"
          onClick={handleSend}
          disabled={loading || !normalizedPhone}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          認証コードを送信
        </Button>

        {codeSent && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="code">認証コード</Label>
              <Input
                id="code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="6桁のコード"
                disabled={loading}
              />
            </div>

            {mode === 'claim' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="nickname">ニックネーム（任意）</Label>
                  <Input
                    id="nickname"
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    placeholder="サイト内の表示名"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="example@email.com"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">パスワード</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="8文字以上"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <Button
              type="button"
              className="w-full"
              onClick={handleConfirm}
              disabled={loading || !code || (mode === 'claim' && (!email || !password))}
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

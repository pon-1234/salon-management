'use client'

/**
 * @design_doc   Store-scoped customer password recovery request form
 * @related_to   app/api/auth/forgot-password and store login pages
 * @known_issues Delivery status remains enumeration-safe and is confirmed only by email receipt
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Store } from '@/lib/store/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'

interface ForgotPasswordFormProps {
  store: Store
}

export function ForgotPasswordForm({ store }: ForgotPasswordFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, storeId: store.id }),
      })

      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null)
        const message =
          payload &&
          typeof payload === 'object' &&
          'message' in payload &&
          typeof payload.message === 'string'
            ? payload.message
            : '現在処理できません。しばらくしてからお試しください'
        setError(message)
        return
      }

      setSubmitted(true)
    } catch {
      setError('現在処理できません。しばらくしてからお試しください')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <Card className="luxury-panel w-full">
        <CardHeader>
          <div className="mb-4 flex justify-center">
            <CheckCircle className="h-12 w-12 text-[#2fc8b7]" />
          </div>
          <CardTitle className="text-center text-2xl text-[#f5e6c4]">送信完了</CardTitle>
          <CardDescription className="text-center">
            パスワードリセットの手順をメールで送信しました
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              ご登録のメールアドレスにパスワードリセット用のリンクを送信しました。
              メールをご確認の上、リンクからパスワードの再設定を行ってください。
            </AlertDescription>
          </Alert>

          <p className="text-center text-sm text-muted-foreground">
            メールが届かない場合は、迷惑メールフォルダをご確認ください。
          </p>

          <Button className="w-full" onClick={() => router.push(`/${store.slug}/login`)}>
            ログインページに戻る
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="luxury-panel w-full">
      <CardHeader>
        <CardTitle className="text-center text-2xl text-[#f5e6c4]">
          パスワードをお忘れの方
        </CardTitle>
        <CardDescription className="text-center">
          ご登録のメールアドレスを入力してください
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-[#cbb88f]" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="example@email.com"
                className="pl-10"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              パスワードリセット用のリンクをお送りします
            </p>
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '送信中...' : 'リセットリンクを送信'}
          </Button>
        </form>

        {/* Back to Login */}
        <div className="mt-6">
          <Link
            href={`/${store.slug}/login`}
            className="flex items-center justify-center text-sm text-[#f3d08a] hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            ログインページに戻る
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

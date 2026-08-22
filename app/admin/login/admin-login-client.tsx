'use client'

/**
 * @design_doc   ui-improvement-instructions.md U-3 false authentication UI removal
 * @related_to   setup-admin.ts: creates admin users without exposing shared demo passwords
 * @known_issues Administrator recovery requires a privileged operator because admin reset tokens are not stored
 */
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { sanitizeCallbackUrl } from '@/lib/auth/callback-url'

export function AdminLoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('admin-credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。')
      } else if (result?.ok) {
        router.push(
          sanitizeCallbackUrl(searchParams.get('callbackUrl'), { fallback: '/admin/dashboard' })
        )
        router.refresh()
      }
    } catch {
      setError('ログインに失敗しました。しばらく時間をおいて再度お試しください。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-muted/40 to-background px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-bold">GOLD ESTHE GROUP 管理画面</CardTitle>
          <CardDescription>管理者アカウントでログインしてください</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="パスワード"
                  autoComplete="current-password"
                  className="pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-10 w-11"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              <p className="text-right text-xs text-muted-foreground">
                パスワードをお忘れの方は
                <Link href="#password-help" className="ml-1 text-primary underline">
                  管理責任者へ再発行を依頼
                </Link>
              </p>
            </div>
          </CardContent>
          <CardFooter id="password-help" className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              管理者パスワードは安全上メールで自動再発行されません。店舗の管理責任者へご連絡ください。
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

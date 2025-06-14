'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Store } from '@/lib/store/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Lock, AlertCircle } from 'lucide-react'

interface LoginFormProps {
  store: Store
}

export function LoginForm({ store }: LoginFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Simulate login
    await new Promise(resolve => setTimeout(resolve, 1500))

    // In real app, this would make an API call
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    // Mock validation
    if (email === 'test@example.com' && password === 'password') {
      alert('ログインに成功しました！')
      router.push(`/${store.slug}`)
    } else {
      setError('メールアドレスまたはパスワードが正しくありません')
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl text-center">ログイン</CardTitle>
        <CardDescription className="text-center">
          会員の方はこちらからログインしてください
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Demo Credentials */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <p className="text-sm text-blue-800">
            <strong>デモ用ログイン情報:</strong><br />
            メール: test@example.com<br />
            パスワード: password
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="example@email.com"
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="パスワード"
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <Label
                htmlFor="remember"
                className="text-sm font-normal cursor-pointer"
              >
                ログイン状態を保持する
              </Label>
            </div>
            <Link
              href={`/${store.slug}/forgot-password`}
              className="text-sm text-blue-600 hover:underline"
            >
              パスワードを忘れた方
            </Link>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">または</span>
          </div>
        </div>

        {/* Social Login */}
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => alert('LINE ログインは準備中です')}
          >
            <LineIcon className="mr-2 h-5 w-5" />
            LINE でログイン
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => alert('Twitter ログインは準備中です')}
          >
            <TwitterIcon className="mr-2 h-5 w-5" />
            Twitter でログイン
          </Button>
        </div>

        {/* Register Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            アカウントをお持ちでない方は
            <Link
              href={`/${store.slug}/register`}
              className="text-blue-600 hover:underline ml-1"
            >
              新規会員登録
            </Link>
          </p>
        </div>

        {/* Guest Link */}
        <div className="mt-3 text-center">
          <Link
            href={`/${store.slug}`}
            className="text-sm text-gray-500 hover:underline"
          >
            会員登録せずに続ける
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

// Social Media Icons
function LineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.28 2 11.53c0 2.36.91 4.51 2.41 6.19.17.19.18.49.06.7l-.67 1.51c-.14.31.2.64.52.5l1.63-.7c.21-.09.45-.04.62.11 1.35.91 2.97 1.46 4.73 1.46 5.52 0 10-4.28 10-9.53C22 6.28 17.52 2 12 2zm-5.5 9.5c0 .28-.22.5-.5.5s-.5-.22-.5-.5v-3c0-.28.22-.5.5-.5s.5.22.5.5v3zm2.5.5c-.28 0-.5-.22-.5-.5v-3c0-.28.22-.5.5-.5s.5.22.5.5v3c0 .28-.22.5-.5.5zm3.5-.5c0 .19-.11.36-.28.44-.06.03-.12.04-.18.04-.12 0-.24-.04-.33-.13l-1.5-1.5c-.09-.09-.14-.21-.14-.35V8.5c0-.28.22-.5.5-.5s.5.22.5.5v1.29l1.15 1.15c.12.12.17.29.13.46-.02.08-.06.15-.12.21l-.23.23v.66c0 .28-.22.5-.5.5zm3.5 0c0 .28-.22.5-.5.5h-1.5c-.28 0-.5-.22-.5-.5v-3c0-.28.22-.5.5-.5h1.5c.28 0 .5.22.5.5s-.22.5-.5.5H15v.5h1c.28 0 .5.22.5.5s-.22.5-.5.5h-1v.5h1c.28 0 .5.22.5.5z"/>
    </svg>
  )
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
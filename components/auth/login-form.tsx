/**
 * @design_doc   Customer login form component with NextAuth.js integration
 * @related_to   NextAuth.js configuration, customer authentication
 * @known_issues None currently
 */
'use client'

import { useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Store } from '@/lib/store/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react'

const loginSchema = z.object({
  email: z
    .string()
    .email('正しいメールアドレスを入力してください')
    .min(1, 'メールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
})

type LoginFormData = z.infer<typeof loginSchema>

interface LoginFormProps {
  store: Store
}

export function LoginForm({ store }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  // Redirect if already authenticated
  if (status === 'authenticated' && session?.user?.role === 'customer') {
    router.push(`/${store.slug}/mypage`)
    return null
  }

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await signIn('customer-credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        setError('メールアドレスまたはパスワードが正しくありません')
      } else {
        // Redirect to callback URL or default mypage
        const callbackUrl = searchParams.get('callbackUrl') || `/${store.slug}/mypage`
        router.push(callbackUrl)
      }
    } catch (err) {
      setError('ログイン中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center text-2xl">ログイン</CardTitle>
        <CardDescription className="text-center">
          会員の方はこちらからログインしてください
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Demo Credentials */}
        <div className="mb-6 rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            <strong>デモ用ログイン情報:</strong>
            <br />
            メール: tanaka@example.com
            <br />
            パスワード: password123
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                className="pl-10"
                {...register('email')}
                disabled={isLoading}
              />
            </div>
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="パスワード"
                className="pl-10"
                {...register('password')}
                disabled={isLoading}
              />
            </div>
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </div>

          {/* Forgot Password */}
          <div className="flex justify-end">
            <Link
              href={`/${store.slug}/forgot-password`}
              className="text-sm text-blue-600 hover:underline"
            >
              パスワードを忘れた方
            </Link>
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            ログイン
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
            <Link href={`/${store.slug}/register`} className="ml-1 text-blue-600 hover:underline">
              新規会員登録
            </Link>
          </p>
        </div>

        {/* Guest Link */}
        <div className="mt-3 text-center">
          <Link href={`/${store.slug}`} className="text-sm text-gray-500 hover:underline">
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
      <path d="M12 2C6.48 2 2 6.28 2 11.53c0 2.36.91 4.51 2.41 6.19.17.19.18.49.06.7l-.67 1.51c-.14.31.2.64.52.5l1.63-.7c.21-.09.45-.04.62.11 1.35.91 2.97 1.46 4.73 1.46 5.52 0 10-4.28 10-9.53C22 6.28 17.52 2 12 2zm-5.5 9.5c0 .28-.22.5-.5.5s-.5-.22-.5-.5v-3c0-.28.22-.5.5-.5s.5.22.5.5v3zm2.5.5c-.28 0-.5-.22-.5-.5v-3c0-.28.22-.5.5-.5s.5.22.5.5v3c0 .28-.22.5-.5.5zm3.5-.5c0 .19-.11.36-.28.44-.06.03-.12.04-.18.04-.12 0-.24-.04-.33-.13l-1.5-1.5c-.09-.09-.14-.21-.14-.35V8.5c0-.28.22-.5.5-.5s.5.22.5.5v1.29l1.15 1.15c.12.12.17.29.13.46-.02.08-.06.15-.12.21l-.23.23v.66c0 .28-.22.5-.5.5zm3.5 0c0 .28-.22.5-.5.5h-1.5c-.28 0-.5-.22-.5-.5v-3c0-.28.22-.5.5-.5h1.5c.28 0 .5.22.5.5s-.22.5-.5.5H15v.5h1c.28 0 .5.22.5.5s-.22.5-.5.5h-1v.5h1c.28 0 .5.22.5.5z" />
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

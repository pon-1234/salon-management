'use client'

/**
 * @design_doc   ui-improvement-instructions.md U-3 customer login false UI removal
 * @related_to   NextAuth.js configuration, customer authentication
 * @known_issues Social login is removed until providers are actually implemented
 */
import { useEffect, useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Store } from '@/lib/store/types'
import { sanitizeCallbackUrl } from '@/lib/auth/callback-url'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'customer') {
      router.push(`/${store.slug}/mypage`)
    }
  }, [router, session?.user?.role, status, store.slug])

  if (status === 'authenticated' && session?.user?.role === 'customer') {
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
        const callbackUrl = sanitizeCallbackUrl(searchParams.get('callbackUrl'), {
          fallback: `/${store.slug}/mypage`,
        })
        router.push(callbackUrl)
      }
    } catch (err) {
      setError('ログイン中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="luxury-panel w-full">
      <CardHeader>
        <CardTitle className="text-center text-2xl text-[#f5e6c4]">ログイン</CardTitle>
        <CardDescription className="text-center">
          会員の方はこちらからログインしてください
        </CardDescription>
      </CardHeader>
      <CardContent>
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
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-[#cbb88f]" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
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
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-[#cbb88f]" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
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
              className="text-sm text-[#f3d08a] hover:underline"
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

        {/* Register Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            アカウントをお持ちでない方は
            <Link href={`/${store.slug}/register`} className="ml-1 text-[#f3d08a] hover:underline">
              新規会員登録
            </Link>
          </p>
        </div>

        {/* Guest Link */}
        <div className="mt-3 text-center">
          <Link href={`/${store.slug}`} className="text-sm text-muted-foreground hover:underline">
            会員登録せずに続ける
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

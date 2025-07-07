/**
 * @design_doc   Admin login page component
 * @related_to   NextAuth.js configuration, middleware authentication
 * @known_issues None currently
 */
'use client'

import { useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('正しいメールアドレスを入力してください').min(1, 'メールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function AdminLoginPage() {
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
  if (status === 'authenticated' && session?.user?.role === 'admin') {
    router.push('/admin/dashboard')
    return null
  }

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await signIn('admin-credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。')
      } else {
        // Redirect to callback URL or default admin dashboard
        const callbackUrl = searchParams.get('callbackUrl') || '/admin/dashboard'
        router.push(callbackUrl)
      }
    } catch (err) {
      setError('ログインに失敗しました。しばらく時間をおいて再度お試しください。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">管理者ログイン</CardTitle>
          <CardDescription className="text-center">
            管理者アカウントでログインしてください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                placeholder="パスワードを入力"
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ログイン
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>デモ用アカウント:</p>
            <p>メール: admin@example.com</p>
            <p>パスワード: admin123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
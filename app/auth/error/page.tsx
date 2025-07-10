'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import Link from 'next/link'

const errorMessages: Record<string, { title: string; description: string }> = {
  Configuration: {
    title: '設定エラー',
    description: 'アプリケーションの設定に問題があります。管理者にお問い合わせください。',
  },
  AccessDenied: {
    title: 'アクセスが拒否されました',
    description: 'このリソースへのアクセス権限がありません。',
  },
  Verification: {
    title: '認証エラー',
    description: 'メールアドレスの認証に失敗しました。',
  },
  Default: {
    title: '認証エラー',
    description: 'ログイン中にエラーが発生しました。もう一度お試しください。',
  },
  CredentialsSignin: {
    title: 'ログインエラー',
    description: 'メールアドレスまたはパスワードが正しくありません。',
  },
  SessionRequired: {
    title: 'ログインが必要です',
    description: 'このページを表示するにはログインが必要です。',
  },
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  useEffect(() => {
    // エラーをコンソールに記録（デバッグ用）
    console.error('Auth error:', error)
  }, [error])

  const errorInfo = errorMessages[error || 'Default'] || errorMessages.Default

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400">
            認証エラー
          </CardTitle>
          <CardDescription>ログイン処理中に問題が発生しました</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{errorInfo.title}</AlertTitle>
            <AlertDescription>{errorInfo.description}</AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/admin/login">管理者ログインに戻る</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">お客様ログインに戻る</Link>
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                エラーコード: {error}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
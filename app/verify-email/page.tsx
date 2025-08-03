'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('無効なリンクです')
      return
    }

    // Verify email with token
    const verifyEmail = async () => {
      try {
        const response = await fetch('/api/auth/verify-email/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'メール確認に失敗しました')
        }

        setStatus('success')
        setMessage(result.message || 'メールアドレスが確認されました')
      } catch (err) {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'エラーが発生しました')
      }
    }

    verifyEmail()
  }, [token])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-4 flex justify-center">
            {status === 'loading' && <Loader2 className="h-12 w-12 animate-spin text-gray-400" />}
            {status === 'success' && <CheckCircle className="h-12 w-12 text-green-500" />}
            {status === 'error' && <XCircle className="h-12 w-12 text-red-500" />}
          </div>
          <CardTitle className="text-center text-2xl">
            {status === 'loading' && 'メール確認中...'}
            {status === 'success' && 'メール確認完了'}
            {status === 'error' && 'エラー'}
          </CardTitle>
          <CardDescription className="text-center">
            {status === 'loading' && 'しばらくお待ちください'}
            {status === 'success' && 'メールアドレスが正常に確認されました'}
            {status === 'error' && message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status !== 'loading' && (
            <Button
              className="w-full"
              onClick={() => router.push('/login')}
              variant={status === 'success' ? 'default' : 'outline'}
            >
              ログインページへ
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * @design_doc   Admin login page using NextAuth.js
 * @related_to   NextAuth.js configuration, admin credentials provider
 * @known_issues None currently
 */
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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
import { AlertCircle } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

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
        router.push('/admin/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError('ログインに失敗しました。しばらく時間をおいて再度お試しください。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">管理者ログイン</CardTitle>
          <CardDescription>管理画面にアクセスするにはログインしてください</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Demo Credentials */}
            <div className="space-y-2 rounded-lg bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">デモ用ログイン情報</p>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>
                  <span className="font-medium">スーパー管理者:</span> admin@example.com / admin123
                </li>
                <li>
                  <span className="font-medium">マネージャー:</span> manager@example.com / manager123
                </li>
                <li>
                  <span className="font-medium">スタッフ:</span> staff@example.com / staff123
                </li>
              </ul>
              <p className="text-xs text-blue-700">
                * スタッフロールは閲覧制限があります。必要に応じてロールを切り替えて動作を確認してください。
              </p>
            </div>
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

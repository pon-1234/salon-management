'use client'

import { FormEvent, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Loader2, LogIn } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

interface CastLoginFormProps {
  storeSlug?: string
}

export function CastLoginForm({ storeSlug }: CastLoginFormProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultCallback = storeSlug
    ? `/cast/dashboard?store=${encodeURIComponent(storeSlug)}`
    : '/cast/dashboard'
  const callbackUrl = searchParams.get('callbackUrl') ?? defaultCallback
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await signIn('cast-credentials', {
        redirect: false,
        email,
        password,
        callbackUrl,
      })

      if (result?.error) {
        setError(result.error)
        toast({
          title: 'ログインに失敗しました',
          description: result.error,
          variant: 'destructive',
        })
        return
      }

      toast({ title: 'ログインしました' })
      router.push(result?.url ?? callbackUrl)
    })
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">キャストログイン</CardTitle>
        <CardDescription>メールアドレスとパスワードを入力してサインインしてください。</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="cast-email">メールアドレス</Label>
            <Input
              id="cast-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cast-password">パスワード</Label>
            <Input
              id="cast-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
            ログイン
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

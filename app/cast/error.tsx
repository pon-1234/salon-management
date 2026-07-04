'use client'

/**
 * @design_doc   ui-improvement-instructions.md U-5 cast route error boundary
 * @related_to   app/cast/not-found.tsx: cast route fallback UI
 * @known_issues Existing cast auth redirects are unchanged
 */
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function CastError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-4 rounded-md border bg-background p-6 text-center">
        <h1 className="text-xl font-semibold">キャスト画面を表示できませんでした</h1>
        <p className="text-sm text-muted-foreground">
          操作を再試行するか、ログイン画面へ戻ってください。
        </p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={reset}>
            再試行
          </Button>
          <Button asChild>
            <Link href="/cast/login">ログインへ戻る</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}

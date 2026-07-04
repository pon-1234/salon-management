'use client'

/**
 * @design_doc   ui-improvement-instructions.md U-5 admin route error boundary
 * @related_to   app/(admin)/not-found.tsx: admin route fallback UI
 * @known_issues Existing admin auth flow is unchanged
 */
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-4 rounded-md border bg-background p-6 text-center">
        <h1 className="text-xl font-semibold">管理画面を表示できませんでした</h1>
        <p className="text-sm text-muted-foreground">
          操作を再試行するか、管理画面トップへ戻ってください。
        </p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={reset}>
            再試行
          </Button>
          <Button asChild>
            <Link href="/admin/dashboard">管理画面トップ</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}

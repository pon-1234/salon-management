'use client'

/**
 * @design_doc   ui-improvement-instructions.md U-5 route error boundary
 * @related_to   app/not-found.tsx: root-level fallback UI
 * @known_issues Visual QA is performed manually in the U5 browser pass
 */
import { Button } from '@/components/ui/button'

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold">ページを表示できませんでした</h1>
        <p className="text-sm text-muted-foreground">
          時間を置いて再度お試しください。入力中の内容がある場合は、再読み込み前に状態をご確認ください。
        </p>
        <Button onClick={reset}>再試行</Button>
      </div>
    </main>
  )
}

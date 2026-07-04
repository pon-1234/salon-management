/**
 * @design_doc   ui-improvement-instructions.md U-5 cast route not-found UI
 * @related_to   app/cast/error.tsx: cast route fallback UI
 * @known_issues Existing cast auth redirects are unchanged
 */
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function CastNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-4 rounded-md border bg-background p-6 text-center">
        <h1 className="text-xl font-semibold">キャストページが見つかりません</h1>
        <p className="text-sm text-muted-foreground">URLをご確認ください。</p>
        <Button asChild>
          <Link href="/cast/dashboard">ダッシュボードへ戻る</Link>
        </Button>
      </div>
    </main>
  )
}

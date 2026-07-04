/**
 * @design_doc   ui-improvement-instructions.md U-5 admin route not-found UI
 * @related_to   app/(admin)/error.tsx: admin route fallback UI
 * @known_issues Existing admin navigation is unchanged
 */
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AdminNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-4 rounded-md border bg-background p-6 text-center">
        <h1 className="text-xl font-semibold">管理ページが見つかりません</h1>
        <p className="text-sm text-muted-foreground">
          URLをご確認ください。管理画面トップから目的のページへ移動できます。
        </p>
        <Button asChild>
          <Link href="/admin/dashboard">管理画面トップへ戻る</Link>
        </Button>
      </div>
    </main>
  )
}

/**
 * @design_doc   ui-improvement-instructions.md U-5 route not-found UI
 * @related_to   app/error.tsx: root-level fallback UI
 * @known_issues Store/admin/cast groups provide more specific variants
 */
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function RootNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold">ページが見つかりません</h1>
        <p className="text-sm text-muted-foreground">
          URLをご確認ください。トップページから目的のページへ移動できます。
        </p>
        <Button asChild>
          <Link href="/">トップへ戻る</Link>
        </Button>
      </div>
    </main>
  )
}

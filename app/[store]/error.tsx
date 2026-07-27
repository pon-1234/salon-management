'use client'

/**
 * @design_doc   ui-improvement-instructions.md U-5 store route error boundary
 * @related_to   app/[store]/not-found.tsx: public store route fallback UI
 * @known_issues None
 */
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function StoreError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { store } = useParams<{ store: string }>()

  return (
    <main className="luxury-body flex min-h-screen items-center justify-center bg-luxury-black-deep px-4 text-foreground">
      <div className="w-full max-w-md space-y-4 rounded-md border border-luxury-border bg-luxury-panel-dark p-6 text-center">
        <h1 className="text-xl font-semibold">ページを表示できませんでした</h1>
        <p className="text-sm text-luxury-gold-muted">時間を置いて再度お試しください。</p>
        <div className="flex justify-center gap-2">
          <Button onClick={reset}>再試行</Button>
          <Button asChild variant="outline">
            <Link href={`/${store}`}>店舗トップへ</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}

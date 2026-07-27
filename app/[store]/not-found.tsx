'use client'

/**
 * @design_doc   ui-improvement-instructions.md U-5 store route not-found UI
 * @related_to   app/[store]/error.tsx: public store route fallback UI
 * @known_issues None
 */
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function StoreNotFound() {
  const { store } = useParams<{ store: string }>()

  return (
    <main className="luxury-body flex min-h-screen items-center justify-center bg-luxury-black-deep px-4 text-foreground">
      <div className="w-full max-w-md space-y-4 rounded-md border border-luxury-border bg-luxury-panel-dark p-6 text-center">
        <h1 className="text-xl font-semibold">ページが見つかりません</h1>
        <p className="text-sm text-luxury-gold-muted">URLをご確認ください。</p>
        <Button asChild>
          <Link href={`/${store}`}>店舗トップへ戻る</Link>
        </Button>
      </div>
    </main>
  )
}

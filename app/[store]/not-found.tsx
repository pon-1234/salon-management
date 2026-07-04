/**
 * @design_doc   ui-improvement-instructions.md U-5 store route not-found UI
 * @related_to   app/[store]/error.tsx: public store route fallback UI
 * @known_issues Store slug may be unavailable in not-found rendering
 */
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function StoreNotFound() {
  return (
    <main className="luxury-body flex min-h-screen items-center justify-center bg-[#0b0b0b] px-4 text-[#f5e6c4]">
      <div className="w-full max-w-md space-y-4 rounded-md border border-[#3b2e1f] bg-[#121212] p-6 text-center">
        <h1 className="text-xl font-semibold">ページが見つかりません</h1>
        <p className="text-sm text-[#d7c39c]">URLをご確認ください。</p>
        <Button asChild>
          <Link href="/">トップへ戻る</Link>
        </Button>
      </div>
    </main>
  )
}

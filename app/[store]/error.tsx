'use client'

/**
 * @design_doc   ui-improvement-instructions.md U-5 store route error boundary
 * @related_to   app/[store]/not-found.tsx: public store route fallback UI
 * @known_issues Store-specific navigation is unavailable when the route itself fails
 */
import { Button } from '@/components/ui/button'

export default function StoreError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="luxury-body flex min-h-screen items-center justify-center bg-[#0b0b0b] px-4 text-[#f5e6c4]">
      <div className="w-full max-w-md space-y-4 rounded-md border border-[#3b2e1f] bg-[#121212] p-6 text-center">
        <h1 className="text-xl font-semibold">ページを表示できませんでした</h1>
        <p className="text-sm text-[#d7c39c]">時間を置いて再度お試しください。</p>
        <Button onClick={reset}>再試行</Button>
      </div>
    </main>
  )
}

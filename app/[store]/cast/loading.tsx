/**
 * @design_doc   ui-improvement-instructions.md U-5 representative store loading UI
 * @related_to   app/[store]/cast/page.tsx: public cast list loading state
 * @known_issues Store-specific navigation skeleton is intentionally minimal
 */
import { Skeleton } from '@/components/ui/skeleton'

export default function StoreCastLoading() {
  return (
    <main className="luxury-body min-h-screen bg-[#0b0b0b] px-4 py-10 text-[#f5e6c4]">
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-10 w-52 bg-[#2a2a2a]" />
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="aspect-[3/4] bg-[#2a2a2a]" />
          ))}
        </div>
      </div>
    </main>
  )
}

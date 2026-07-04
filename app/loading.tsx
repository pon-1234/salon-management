/**
 * @design_doc   ui-improvement-instructions.md U-5 route loading UI
 * @related_to   app/error.tsx, app/not-found.tsx: root-level route states
 * @known_issues Page-specific skeletons are added for representative heavy routes
 */
import { Skeleton } from '@/components/ui/skeleton'

export default function RootLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-4 py-10">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-40 w-full" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </main>
  )
}

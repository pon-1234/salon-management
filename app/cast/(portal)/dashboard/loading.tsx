/**
 * @design_doc   ui-improvement-instructions.md U-5 representative cast loading UI
 * @related_to   app/cast/(portal)/dashboard/page.tsx: cast dashboard loading state
 * @known_issues Component-level fetch loading states are handled separately
 */
import { Skeleton } from '@/components/ui/skeleton'

export default function CastDashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-9 w-56" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

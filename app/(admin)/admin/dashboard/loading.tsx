/**
 * @design_doc   ui-improvement-instructions.md U-5 representative admin loading UI
 * @related_to   app/(admin)/admin/dashboard/page.tsx: dashboard loading state
 * @known_issues Component-level fetch loading states are handled separately
 */
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-9 w-56" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  )
}

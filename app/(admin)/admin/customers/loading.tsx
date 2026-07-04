/**
 * @design_doc   ui-improvement-instructions.md U-5 representative admin loading UI
 * @related_to   app/(admin)/admin/customers/page.tsx: customer list loading state
 * @known_issues Component-level fetch loading states are handled separately
 */
import { Skeleton } from '@/components/ui/skeleton'

export default function CustomersLoading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    </div>
  )
}

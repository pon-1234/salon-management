/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md C-4 shared loading states
 * @related_to   Skeleton: shared visual placeholder; route loading boundaries
 * @known_issues Callers choose a page-level or compact presentation
 */
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface PageLoadingProps {
  label?: string
  compact?: boolean
  className?: string
}

export function PageLoading({
  label = '読み込んでいます',
  compact = false,
  className,
}: PageLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center justify-center gap-3 text-sm text-muted-foreground',
        compact ? 'min-h-24' : 'min-h-[40vh]',
        className
      )}
    >
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

interface TableSkeletonProps {
  rows?: number
  columns?: number
  label?: string
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  label = '一覧を読み込んでいます',
}: TableSkeletonProps) {
  return (
    <div role="status" aria-label={label} className="space-y-3">
      {Array.from({ length: rows }, (_, row) => (
        <div
          key={row}
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }, (_, column) => (
            <Skeleton key={column} className="h-10 w-full" />
          ))}
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}

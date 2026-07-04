/**
 * @design_doc   ui-improvement-instructions.md U-6 admin page header
 * @related_to   Header: global admin navigation; settings pages: first rollout surface
 * @known_issues Breadcrumbs beyond the optional back link are not modeled yet
 */
import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type PageHeaderIcon = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>

type PageHeaderProps = {
  title: string
  description?: string
  backHref?: string
  backLabel?: string
  backIcon?: PageHeaderIcon
  icon?: PageHeaderIcon
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = '前のページへ戻る',
  backIcon: BackIcon,
  icon: Icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        {backHref && (
          <Button variant="ghost" size="icon" asChild>
            <Link href={backHref} aria-label={backLabel}>
              {BackIcon ? <BackIcon aria-hidden className="h-5 w-5" /> : null}
              {!BackIcon && <span>{backLabel}</span>}
            </Link>
          </Button>
        )}
        {Icon && <Icon aria-hidden className="h-8 w-8 shrink-0 text-emerald-600" />}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2 md:justify-end">{actions}</div>}
    </div>
  )
}

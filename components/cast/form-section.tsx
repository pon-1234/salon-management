'use client'

import { type ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface FormSectionProps {
  title: string
  description?: ReactNode
  children: ReactNode
  contentClassName?: string
}

export function FormSection({
  title,
  description,
  children,
  contentClassName,
}: FormSectionProps) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className={cn('space-y-6', contentClassName)}>{children}</CardContent>
    </Card>
  )
}


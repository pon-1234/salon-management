'use client'

import { ReactNode } from 'react'
import { AnalyticsLayout } from '@/components/analytics/layout'
import { useSession } from 'next-auth/react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { hasPermission } from '@/lib/auth/permissions'
import { Loader2 } from 'lucide-react'

export default function AnalyticsRootLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const isAdmin = session?.user?.role === 'admin'
  const canViewAnalytics = hasPermission(session?.user?.permissions ?? [], 'analytics:read')

  if (status === 'loading') {
    return (
      <div className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center bg-muted/20 p-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          権限を確認しています...
        </div>
      </div>
    )
  }

  if (!isAdmin || !canViewAnalytics) {
    return (
      <div className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center bg-muted/20 p-8">
        <div className="max-w-md">
          <Alert variant="destructive">
            <AlertDescription>
              売上情報へのアクセス権限がありません。必要な場合は管理者にお問い合わせください。
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="flex">
      <AnalyticsLayout />
      <div className="flex-1 min-w-0 overflow-x-hidden p-6 lg:p-8">
        <div className="mx-auto w-full max-w-screen-xl">{children}</div>
      </div>
    </div>
  )
}

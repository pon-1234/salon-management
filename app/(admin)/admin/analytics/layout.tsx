'use client'

import { ReactNode } from 'react'
import { AnalyticsLayout } from '@/components/analytics/layout'
import { useSession } from 'next-auth/react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function AnalyticsRootLayout({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const isGeneralStaff = session?.user?.adminRole === 'staff'

  if (isGeneralStaff) {
    return (
      <div className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center bg-muted/20 p-8">
        <div className="max-w-md">
          <Alert variant="destructive">
            <AlertDescription>
              売上情報へのアクセス権限がありません。店舗管理者にお問い合わせください。
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="flex">
      <AnalyticsLayout />
      <div className="flex-1 p-8">{children}</div>
    </div>
  )
}

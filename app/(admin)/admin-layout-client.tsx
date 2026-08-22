'use client'

/**
 * @design_doc   docs/UX_FOUNDATIONS.md
 * @related_to   Header: sticky admin navigation; chat/analytics fill the remaining viewport
 * @known_issues Breadcrumb rollout is still page-by-page
 */
import { ReactNode, Suspense } from 'react'
import { Header } from '@/components/header'
import { cn } from '@/lib/utils'
import { useNotification } from '@/contexts/notification-context'
import { CTIProvider } from '@/components/cti/cti-provider'
import { NotificationProvider } from '@/contexts/notification-context'
import { PageLoading } from '@/components/ui/page-loading'

function AdminLayoutContent({ children }: { children: ReactNode }) {
  const { hasNewNotifications } = useNotification()

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <Header />
      <main className="min-h-0 flex-1 overflow-auto">
        <div className={cn('h-full w-full', hasNewNotifications && 'has-notifications')}>
          {children}
        </div>
      </main>
    </div>
  )
}

export function AdminLayoutClient({ children }: { children: ReactNode }) {
  return (
    <NotificationProvider>
      <Suspense fallback={<PageLoading label="管理画面を読み込んでいます" />}>
        <CTIProvider>
          <AdminLayoutContent>{children}</AdminLayoutContent>
        </CTIProvider>
      </Suspense>
    </NotificationProvider>
  )
}

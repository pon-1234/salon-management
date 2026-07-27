'use client'

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
    <>
      <Header />
      <div className="min-h-screen w-full">
        <main>
          <div className={cn('w-full', hasNewNotifications && 'has-notifications')}>{children}</div>
        </main>
      </div>
    </>
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

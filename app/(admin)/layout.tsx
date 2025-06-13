'use client'

import { ReactNode, Suspense } from 'react'
import { Header } from '@/components/header'
import { cn } from '@/lib/utils'
import { useNotification } from '@/contexts/notification-context'
import { CTIProvider } from '@/components/cti/cti-provider'
import { NotificationProvider } from '@/contexts/notification-context'

function AdminLayoutContent({ children }: { children: ReactNode }) {
  const { hasNewNotifications } = useNotification()

  return (
    <>
      <Header />
      <div className="pt-[83px] min-h-screen w-full">
        <main>
          <div
            className={cn(
              'w-full',
              hasNewNotifications && 'has-notifications'
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </>
  )
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <NotificationProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <CTIProvider>
          <AdminLayoutContent>{children}</AdminLayoutContent>
        </CTIProvider>
      </Suspense>
    </NotificationProvider>
  )
}
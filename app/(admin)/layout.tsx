'use client'

import { ReactNode, Suspense } from 'react'
import { Header } from '@/components/header'
import { SidebarProvider } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { useNotification } from '@/contexts/notification-context'
import { CTIProvider } from '@/components/cti/cti-provider'
import { NotificationProvider } from '@/contexts/notification-context'

function AdminLayoutContent({ children }: { children: ReactNode }) {
  const { hasNewNotifications } = useNotification()

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="h-screen overflow-hidden flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto">
          <div
            className={cn(
              'min-h-full',
              hasNewNotifications && 'has-notifications'
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
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
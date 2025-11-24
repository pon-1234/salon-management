import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { CastPortalNavigation, type CastPortalNavigationProps } from '@/components/cast-portal/navigation'
import { CastPortalHeader } from '@/components/cast-portal/portal-header'

const NAV_ITEMS: CastPortalNavigationProps['items'] = [
  { href: '/cast/dashboard', label: 'ホーム', icon: 'home' },
  { href: '/cast/reservations', label: '予約', icon: 'calendar' },
  { href: '/cast/settlements', label: '精算', icon: 'wallet' },
  { href: '/cast/line-link', label: 'LINE連携', icon: 'link' },
  { href: '/cast/chat', label: 'チャット', icon: 'chat' },
]

export default async function CastPortalLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'cast') {
    redirect('/cast/login')
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <CastPortalHeader
        displayName={session.user.name}
        storeId={session.user.storeId}
        email={session.user.email}
        imageUrl={session.user.image}
      />
      <CastPortalNavigation items={NAV_ITEMS} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

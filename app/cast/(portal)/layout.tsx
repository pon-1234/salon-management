import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { CastPortalNavigation } from '@/components/cast-portal/navigation'
import { CastPortalHeader } from '@/components/cast-portal/portal-header'

export const NAV_ITEMS = [
  { href: '/cast/dashboard', label: 'ダッシュボード' },
  { href: '/cast/reservations', label: '予約一覧' },
  { href: '/cast/settlements', label: '精算・売上' },
  { href: '/cast/chat', label: 'スタッフチャット' },
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
      />
      <CastPortalNavigation items={NAV_ITEMS} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

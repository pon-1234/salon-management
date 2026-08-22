'use client'

/**
 * @design_doc   ui-improvement-instructions.md U-6 admin navigation
 * @related_to   StoreSelector, NotificationList, CustomerSelectionDialog, and CastListPage search
 * @known_issues Full breadcrumb rollout is left for later page-by-page adoption
 */
import {
  Home,
  Search,
  Bell,
  MessageSquare,
  Calendar,
  CalendarDays,
  CalendarRange,
  Users,
  Clock,
  Settings,
  ListChecks,
  LogOut,
  Menu,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { NotificationList } from '@/components/notification-list'
import { NotificationDetailDialog } from '@/components/notification-detail-dialog'
import Link from 'next/link'
import { useState, useCallback, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useNotifications } from '@/contexts/notification-context'
import type { AdminNotification, ReservationNotification } from '@/contexts/notification-context'
import { StoreSelector } from '@/components/store/store-selector'
import { useSession, signOut } from 'next-auth/react'
import { CustomerSelectionDialog } from '@/components/customer/customer-selection-dialog'
import { hasPermission } from '@/lib/auth/permissions'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

const adminNavigationLinks = [
  { href: '/admin/dashboard', label: 'ホーム', icon: Home },
  { href: '/admin/reservation', label: '予約表', icon: CalendarRange },
  { href: '/admin/reservation-list', label: '予約一覧', icon: ListChecks },
  { href: '/admin/chat', label: 'チャット', icon: MessageSquare },
  { href: '/admin/cast/list', label: 'キャスト', icon: Users },
  { href: '/admin/cast/weekly-schedule', label: '出勤表', icon: Clock },
  { href: '/admin/customers', label: '顧客管理', icon: Search },
  { href: '/admin/reviews', label: '口コミ', icon: Star },
  { href: '/admin/settings', label: '設定', icon: Settings },
]

function isAdminNavActive(pathname: string, href: string) {
  if (href === '/admin/dashboard') {
    return pathname === '/admin/dashboard' || pathname === '/admin'
  }
  if (href === '/admin/reservation') {
    return pathname === '/admin/reservation' || pathname.startsWith('/admin/reservation/')
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

function HeaderNavLink({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string
  label: string
  icon: typeof Home
  pathname: string
}) {
  const isActive = isAdminNavActive(pathname, href)
  return (
    <Link href={href} aria-current={isActive ? 'page' : undefined} className="hidden xl:block">
      <Button
        variant="ghost"
        className={cn(
          'flex h-auto shrink-0 flex-col items-center gap-0.5 px-2 py-1.5',
          isActive && 'bg-emerald-50 text-emerald-800'
        )}
      >
        <Icon className="h-5 w-5" />
        <span className={cn('text-xs', isActive ? 'text-emerald-800' : 'text-gray-600')}>
          {label}
        </span>
      </Button>
    </Link>
  )
}

export function Header() {
  const { data: session } = useSession()
  const canViewAnalytics = hasPermission(session?.user?.permissions ?? [], 'analytics:read')
  const canReadCustomers = hasPermission(session?.user?.permissions ?? [], 'customer:read')
  const canCreateReservation =
    canReadCustomers && hasPermission(session?.user?.permissions ?? [], 'reservation:create')
  const [notificationOpen, setNotificationOpen] = useState(false)
  const { notifications, markAsRead, markAsUnread, unreadCount } = useNotifications()
  const router = useRouter()
  const pathname = usePathname()
  const [selectedNotification, setSelectedNotification] = useState<ReservationNotification | null>(
    null
  )
  const [showCustomerSelection, setShowCustomerSelection] = useState(false)
  const [showCustomerLookup, setShowCustomerLookup] = useState(false)

  const handleNotificationSelect = useCallback(
    (notification: AdminNotification) => {
      if (notification.type === 'chat') {
        markAsRead(notification.id)
        setNotificationOpen(false)
        const params = new URLSearchParams({ castId: notification.details.castId })
        router.push(`/admin/chat?${params.toString()}`)
        return
      }

      setSelectedNotification(notification)
      setNotificationOpen(false)
    },
    [markAsRead, router]
  )

  const handleNavigateFromNotification = useCallback(
    (notification: ReservationNotification) => {
      const reservationId = notification.details.reservationId
      router.push(`/admin/reservation-list?highlight=${encodeURIComponent(reservationId)}`)
      setSelectedNotification(null)
    },
    [router]
  )

  useEffect(() => {
    if (!selectedNotification) return
    const latest = notifications.find(
      (notification): notification is ReservationNotification =>
        notification.type === 'reservation' && notification.id === selectedNotification.id
    )
    if (latest && latest !== selectedNotification) {
      setSelectedNotification(latest)
    }
  }, [notifications, selectedNotification])

  return (
    <>
      <div className="print-hidden sticky top-0 z-50 flex items-center gap-2 border-b bg-background p-2 shadow-sm">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="xl:hidden" aria-label="メニューを開く">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <SheetHeader>
              <SheetTitle>管理メニュー</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 grid gap-2">
              {canCreateReservation ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11 justify-start"
                  onClick={() => setShowCustomerSelection(true)}
                  aria-label="モバイル予約作成"
                >
                  <Calendar className="mr-3 h-4 w-4" />
                  予約作成
                </Button>
              ) : null}
              {canReadCustomers ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11 justify-start"
                  onClick={() => setShowCustomerLookup(true)}
                  aria-label="モバイル顧客検索"
                >
                  <Search className="mr-3 h-4 w-4" />
                  顧客検索
                </Button>
              ) : null}
              {adminNavigationLinks
                .filter((item) => item.href !== '/admin/customers' || canReadCustomers)
                .map((item) => {
                  const isActive = isAdminNavActive(pathname, item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted',
                        isActive && 'bg-emerald-50 font-medium text-emerald-800'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  )
                })}
              {canViewAnalytics && (
                <>
                  <Link
                    href="/admin/analytics/daily-report"
                    aria-current={
                      isAdminNavActive(pathname, '/admin/analytics/daily-report')
                        ? 'page'
                        : undefined
                    }
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted',
                      isAdminNavActive(pathname, '/admin/analytics/daily-report') &&
                        'bg-emerald-50 font-medium text-emerald-800'
                    )}
                  >
                    <CalendarDays className="h-4 w-4" />
                    当日売上
                  </Link>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>

        <HeaderNavLink href="/admin/dashboard" label="ホーム" icon={Home} pathname={pathname} />

        {/* 店舗セレクター */}
        <StoreSelector />

        {canCreateReservation ? (
          <Button
            type="button"
            variant="ghost"
            className="hidden h-auto shrink-0 flex-col items-center gap-0.5 px-2 py-1.5 xl:flex"
            onClick={() => setShowCustomerSelection(true)}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-xs text-gray-600">予約作成</span>
          </Button>
        ) : null}

        {canReadCustomers ? (
          <Button
            type="button"
            variant="ghost"
            className="hidden h-auto shrink-0 flex-col items-center gap-0.5 px-2 py-1.5 xl:flex"
            onClick={() => setShowCustomerLookup(true)}
          >
            <Search className="h-5 w-5" />
            <span className="text-xs text-gray-600">顧客検索</span>
          </Button>
        ) : null}

        <HeaderNavLink
          href="/admin/reservation"
          label="予約表"
          icon={CalendarRange}
          pathname={pathname}
        />
        <HeaderNavLink
          href="/admin/reservation-list"
          label="予約一覧"
          icon={ListChecks}
          pathname={pathname}
        />
        <HeaderNavLink
          href="/admin/chat"
          label="チャット"
          icon={MessageSquare}
          pathname={pathname}
        />
        <HeaderNavLink href="/admin/cast/list" label="キャスト" icon={Users} pathname={pathname} />
        <HeaderNavLink
          href="/admin/cast/weekly-schedule"
          label="出勤表"
          icon={Clock}
          pathname={pathname}
        />

        {canViewAnalytics && (
          <>
            <HeaderNavLink
              href="/admin/analytics/daily-report"
              label="当日売上"
              icon={CalendarDays}
              pathname={pathname}
            />
          </>
        )}

        <HeaderNavLink href="/admin/reviews" label="口コミ" icon={Star} pathname={pathname} />
        <HeaderNavLink href="/admin/settings" label="設定" icon={Settings} pathname={pathname} />

        <div className="flex-1" />

        <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="relative flex h-auto flex-col items-center gap-0.5 px-2 py-1.5"
            >
              <Bell className="h-5 w-5" />
              <span className="text-xs text-gray-600">通知</span>
              {unreadCount > 0 && (
                <Badge className="absolute -right-1 -top-1 rounded-full bg-red-500 px-2 py-1 text-xs text-white">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <NotificationList
              notifications={notifications}
              onClose={() => setNotificationOpen(false)}
              onMarkAsRead={markAsRead}
              onMarkAsUnread={markAsUnread}
              onSelect={handleNotificationSelect}
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          className="flex h-auto flex-col items-center gap-0.5 px-2 py-1.5 text-red-600"
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
        >
          <LogOut className="h-5 w-5" />
          <span className="text-xs">ログアウト</span>
        </Button>

        <NotificationDetailDialog
          open={!!selectedNotification}
          notification={selectedNotification}
          onOpenChange={(open) => !open && setSelectedNotification(null)}
          onMarkAsRead={markAsRead}
          onNavigate={handleNavigateFromNotification}
        />
        {canCreateReservation ? (
          <CustomerSelectionDialog
            open={showCustomerSelection}
            onOpenChange={setShowCustomerSelection}
          />
        ) : null}
        {canReadCustomers ? (
          <CustomerSelectionDialog
            open={showCustomerLookup}
            onOpenChange={setShowCustomerLookup}
            mode="lookup"
          />
        ) : null}
      </div>
    </>
  )
}

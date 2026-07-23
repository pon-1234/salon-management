'use client'

/**
 * @design_doc   ui-improvement-instructions.md U-6 admin navigation
 * @related_to   StoreSelector, NotificationList: global admin header controls
 * @known_issues Full breadcrumb rollout is left for later page-by-page adoption
 */
import {
  Home,
  Search,
  ChevronDown,
  Check,
  BarChart2,
  Bell,
  MessageSquare,
  Calendar,
  Users,
  Clock,
  Settings,
  ListChecks,
  LogOut,
  Menu,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandInput,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { NotificationList } from '@/components/notification-list'
import { NotificationDetailDialog } from '@/components/notification-detail-dialog'
import Link from 'next/link'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Cast } from '@/lib/cast/types'
import { normalizeCastList } from '@/lib/cast/mapper'
import { useNotifications } from '@/contexts/notification-context'
import type { AdminNotification, ReservationNotification } from '@/contexts/notification-context'
import { StoreSelector } from '@/components/store/store-selector'
import { useSession, signOut } from 'next-auth/react'
import { CustomerSelectionDialog } from '@/components/customer/customer-selection-dialog'
import { hasPermission } from '@/lib/auth/permissions'
import { useStore } from '@/contexts/store-context'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

const adminNavigationLinks = [
  { href: '/admin/dashboard', label: 'ホーム', icon: Home },
  { href: '/admin/reservation-list', label: '予約一覧', icon: ListChecks },
  { href: '/admin/chat', label: 'チャット', icon: MessageSquare },
  { href: '/admin/cast/list', label: 'キャスト', icon: Users },
  { href: '/admin/cast/weekly-schedule', label: '出勤表', icon: Clock },
  { href: '/admin/customers', label: '顧客管理', icon: Search },
  { href: '/admin/reviews', label: '口コミ', icon: Star },
  { href: '/admin/settings', label: '設定', icon: Settings },
]

export function Header() {
  const { data: session } = useSession()
  const { currentStore } = useStore()
  const canViewAnalytics = hasPermission(session?.user?.permissions ?? [], 'analytics:read')
  const [castList, setCastList] = useState<Cast[]>([])
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [notificationOpen, setNotificationOpen] = useState(false)
  const { notifications, markAsRead, markAsUnread, unreadCount } = useNotifications()
  const router = useRouter()
  const [selectedNotification, setSelectedNotification] = useState<ReservationNotification | null>(
    null
  )
  const [showCustomerSelection, setShowCustomerSelection] = useState(false)
  const [showCustomerLookup, setShowCustomerLookup] = useState(false)

  useEffect(() => {
    const loadCasts = async () => {
      try {
        const response = await fetch(`/api/cast?storeId=${encodeURIComponent(currentStore.id)}`, {
          cache: 'no-store',
          credentials: 'include',
        })
        if (!response.ok) {
          throw new Error(`Failed to fetch casts: ${response.status}`)
        }
        const payload = await response.json()
        setCastList(normalizeCastList(payload))
      } catch (error) {
        console.error('Failed to load casts:', error)
      }
    }

    loadCasts()
  }, [currentStore.id])

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
      <div className="fixed left-0 right-0 top-0 z-50 flex items-center gap-4 border-b bg-white p-4 shadow-sm">
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
              {adminNavigationLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
              {canViewAnalytics && (
                <Link
                  href="/admin/analytics/daily-sales"
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
                >
                  <BarChart2 className="h-4 w-4" />
                  集計
                </Link>
              )}
            </nav>
          </SheetContent>
        </Sheet>

        <Link href="/admin/dashboard" className="hidden xl:block">
          <Button
            variant="ghost"
            className="flex h-auto shrink-0 flex-col items-center gap-0.5 px-3 py-2"
          >
            <Home className="h-5 w-5" />
            <span className="text-xs text-gray-600">ホーム</span>
          </Button>
        </Link>

        {/* 店舗セレクター */}
        <StoreSelector />

        <Button
          type="button"
          variant="ghost"
          className="hidden h-auto shrink-0 flex-col items-center gap-0.5 px-3 py-2 xl:flex"
          onClick={() => setShowCustomerSelection(true)}
        >
          <Calendar className="h-5 w-5" />
          <span className="text-xs text-gray-600">予約作成</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="hidden h-auto shrink-0 flex-col items-center gap-0.5 px-3 py-2 xl:flex"
          onClick={() => setShowCustomerLookup(true)}
        >
          <Search className="h-5 w-5" />
          <span className="text-xs text-gray-600">顧客検索</span>
        </Button>

        <Link href="/admin/reservation-list" className="hidden xl:block">
          <Button
            variant="ghost"
            className="flex h-auto shrink-0 flex-col items-center gap-0.5 px-3 py-2"
          >
            <ListChecks className="h-5 w-5" />
            <span className="text-xs text-gray-600">予約一覧</span>
          </Button>
        </Link>

        <Link href="/admin/chat" className="hidden xl:block">
          <Button
            variant="ghost"
            className="flex h-auto shrink-0 flex-col items-center gap-0.5 px-3 py-2"
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs text-gray-600">チャット</span>
          </Button>
        </Link>

        <Link href="/admin/cast/list" className="hidden xl:block">
          <Button
            variant="ghost"
            className="flex h-auto shrink-0 flex-col items-center gap-0.5 px-3 py-2"
          >
            <Users className="h-5 w-5" />
            <span className="text-xs text-gray-600">キャスト</span>
          </Button>
        </Link>

        <Link href="/admin/cast/weekly-schedule" className="hidden xl:block">
          <Button
            variant="ghost"
            className="flex h-auto shrink-0 flex-col items-center gap-0.5 px-3 py-2"
          >
            <Clock className="h-5 w-5" />
            <span className="text-xs text-gray-600">出勤表</span>
          </Button>
        </Link>

        <div className="hidden xl:block">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-[160px] justify-between"
              >
                {value
                  ? castList.find((cast) => cast.id === value)?.name || 'キャスト検索'
                  : 'キャスト検索'}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0">
              <Command>
                <CommandInput placeholder="キャストを検索..." className="h-9" />
                <CommandList>
                  <CommandEmpty>キャストが見つかりません。</CommandEmpty>
                  <CommandGroup>
                    {castList.map((cast) => (
                      <CommandItem
                        key={cast.id}
                        value={cast.id}
                        onSelect={(currentValue) => {
                          setValue(currentValue === value ? '' : currentValue)
                          setOpen(false)
                          router.push(`/admin/cast/manage/${cast.id}`)
                        }}
                      >
                        {cast.name}
                        <Check
                          className={cn(
                            'ml-auto h-4 w-4',
                            value === cast.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {canViewAnalytics && (
          <Link href="/admin/analytics/daily-sales" className="hidden xl:block">
            <Button
              variant="ghost"
              className="flex h-auto shrink-0 flex-col items-center gap-0.5 px-3 py-2"
            >
              <BarChart2 className="h-5 w-5" />
              <span className="text-xs text-gray-600">集計</span>
            </Button>
          </Link>
        )}

        <Link href="/admin/reviews" className="hidden xl:block">
          <Button
            variant="ghost"
            className="flex h-auto shrink-0 flex-col items-center gap-0.5 px-3 py-2"
          >
            <Star className="h-5 w-5" />
            <span className="text-xs text-gray-600">口コミ</span>
          </Button>
        </Link>

        <Link href="/admin/settings" className="hidden xl:block">
          <Button
            variant="ghost"
            className="flex h-auto shrink-0 flex-col items-center gap-0.5 px-3 py-2"
          >
            <Settings className="h-5 w-5" />
            <span className="text-xs text-gray-600">設定</span>
          </Button>
        </Link>

        <div className="flex-1" />

        <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="relative flex h-auto flex-col items-center gap-0.5 px-3 py-2"
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
          className="flex h-auto flex-col items-center gap-0.5 px-3 py-2 text-red-600"
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
        <CustomerSelectionDialog
          open={showCustomerSelection}
          onOpenChange={setShowCustomerSelection}
        />
        <CustomerSelectionDialog
          open={showCustomerLookup}
          onOpenChange={setShowCustomerLookup}
          mode="lookup"
        />
      </div>
    </>
  )
}

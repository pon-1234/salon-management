'use client'

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
import { Input } from '@/components/ui/input'
import { NotificationList } from '@/components/notification-list'
import Link from 'next/link'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ReservationDialog } from './reservation/reservation-dialog'
import { Cast } from '@/lib/cast/types'
import { normalizeCastList } from '@/lib/cast/mapper'
import { useNotifications } from '@/contexts/notification-context'
import { StoreSelector } from '@/components/store/store-selector'
import { useSession } from 'next-auth/react'
import { CustomerSelectionDialog } from '@/components/customer/customer-selection-dialog'

export function Header() {
  const { data: session } = useSession()
  const isGeneralStaff = session?.user?.adminRole === 'staff'
  const [castList, setCastList] = useState<Cast[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [notificationOpen, setNotificationOpen] = useState(false)
  const { notifications, markAsRead, removeNotification, unreadCount } = useNotifications()
  const router = useRouter()
  const [selectedReservation, setSelectedReservation] = useState<any>(null)
  const [showCustomerSelection, setShowCustomerSelection] = useState(false)

  useEffect(() => {
    const loadCasts = async () => {
      try {
        const response = await fetch('/api/cast', {
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
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/admin/customer-search?query=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleNotificationClick = (id: string) => {
    markAsRead(id)
    console.log('Notification clicked:', id)
  }

  const handleViewDetails = (id: string) => {
    const notification = notifications.find((n) => n.id === id)
    if (notification && notification.type === 'reservation') {
      setSelectedReservation(notification)
    }
    setNotificationOpen(false)
  }

  const handleArchive = useCallback(
    (id: string) => {
      removeNotification(id)
    },
    [removeNotification]
  )

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-50 flex items-center gap-4 border-b bg-white p-4 shadow-sm">
        <Link href="/admin">
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
          className="flex h-auto shrink-0 flex-col items-center gap-0.5 px-3 py-2"
          onClick={() => setShowCustomerSelection(true)}
        >
          <Calendar className="h-5 w-5" />
          <span className="text-xs text-gray-600">予約作成</span>
        </Button>

        <Link href="/admin/reservation-list">
          <Button
            variant="ghost"
            className="flex h-auto shrink-0 flex-col items-center gap-0.5 px-3 py-2"
          >
            <ListChecks className="h-5 w-5" />
            <span className="text-xs text-gray-600">予約一覧</span>
          </Button>
        </Link>

        <Link href="/admin/chat">
          <Button
            variant="ghost"
            className="flex h-auto shrink-0 flex-col items-center gap-0.5 px-3 py-2"
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs text-gray-600">チャット</span>
          </Button>
        </Link>

        <Link href="/admin/cast/list">
          <Button
            variant="ghost"
            className="flex h-auto shrink-0 flex-col items-center gap-0.5 px-3 py-2"
          >
            <Users className="h-5 w-5" />
            <span className="text-xs text-gray-600">キャスト</span>
          </Button>
        </Link>

        <Link href="/admin/cast/weekly-schedule">
          <Button
            variant="ghost"
            className="flex h-auto shrink-0 flex-col items-center gap-0.5 px-3 py-2"
          >
            <Clock className="h-5 w-5" />
            <span className="text-xs text-gray-600">出勤表</span>
          </Button>
        </Link>

        {/* 顧客電話番号検索フォーム */}
        <form onSubmit={handleSearch} className="relative max-w-md">
          <Input
            type="search"
            placeholder="顧客電話番号検索"
            className="bg-gray-50 py-2 pl-4 pr-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full"
          >
            <Search className="h-4 w-4" />
            <span className="sr-only">検索</span>
          </Button>
        </form>

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

        {!isGeneralStaff && (
          <Link href="/admin/analytics/daily-sales">
            <Button
              variant="ghost"
              className="flex h-auto shrink-0 flex-col items-center gap-0.5 px-3 py-2"
            >
              <BarChart2 className="h-5 w-5" />
              <span className="text-xs text-gray-600">集計</span>
            </Button>
          </Link>
        )}

        <Link href="/admin/settings">
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
              onNotificationClick={handleNotificationClick}
              onViewDetails={handleViewDetails}
              onArchive={handleArchive}
            />
          </PopoverContent>
        </Popover>

        <ReservationDialog
          open={!!selectedReservation}
          onOpenChange={(open) => !open && setSelectedReservation(null)}
          reservation={selectedReservation}
        />
        <CustomerSelectionDialog
          open={showCustomerSelection}
          onOpenChange={setShowCustomerSelection}
        />
      </div>
    </>
  )
}

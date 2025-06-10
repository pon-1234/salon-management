"use client"

import { Home, Search, ChevronDown, Check, BarChart2, Bell, MessageSquare, Calendar, Users, Clock, Settings } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandInput,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { NotificationList } from "@/components/notification-list"
import Link from "next/link"
import { useState, useCallback, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ReservationDialog } from "./reservation/reservation-dialog"
import { Cast } from "@/lib/cast/types"
import { getAllCasts } from "@/lib/cast/data"
import { useNotifications } from "@/contexts/notification-context"
import { StoreSelector } from "@/components/store/store-selector"

export function Header() {
  const [castList, setCastList] = useState<Cast[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")
  const [notificationOpen, setNotificationOpen] = useState(false)
  const { notifications, markAsRead, removeNotification, unreadCount } = useNotifications()
  const router = useRouter()
  const [selectedReservation, setSelectedReservation] = useState<any>(null);

  useEffect(() => {
    const cast = getAllCasts()
    setCastList(cast)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/customer-search?query=${encodeURIComponent(searchQuery)}`)
    }
  }


  const handleNotificationClick = (id: string) => {
    markAsRead(id)
    console.log("Notification clicked:", id)
  }

  const handleViewDetails = (id: string) => {
    const notification = notifications.find(n => n.id === id);
    if (notification && notification.type === "reservation") {
      setSelectedReservation(notification);
    }
    setNotificationOpen(false);
  };

  const handleArchive = useCallback((id: string) => {
    removeNotification(id);
  }, [removeNotification]);

  return (
    <>
      <div className="flex items-center gap-4 p-4 border-b bg-white fixed top-0 left-0 right-0 z-50 shadow-sm">
        <Link href="/">
          <Button variant="ghost" className="shrink-0 flex flex-col items-center gap-0.5 h-auto py-2 px-3">
            <Home className="h-5 w-5" />
            <span className="text-xs text-gray-600">ホーム</span>
          </Button>
        </Link>

        {/* 店舗セレクター */}
        <StoreSelector />

        <Link href="/reservation">
          <Button variant="ghost" className="shrink-0 flex flex-col items-center gap-0.5 h-auto py-2 px-3">
            <Calendar className="h-5 w-5" />
            <span className="text-xs text-gray-600">予約</span>
          </Button>
        </Link>

        <Link href="/chat">
          <Button variant="ghost" className="shrink-0 flex flex-col items-center gap-0.5 h-auto py-2 px-3">
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs text-gray-600">チャット</span>
          </Button>
        </Link>

        <Link href="/cast/list">
          <Button variant="ghost" className="shrink-0 flex flex-col items-center gap-0.5 h-auto py-2 px-3">
            <Users className="h-5 w-5" />
            <span className="text-xs text-gray-600">キャスト</span>
          </Button>
        </Link>

        <Link href="/cast/weekly-schedule">
          <Button variant="ghost" className="shrink-0 flex flex-col items-center gap-0.5 h-auto py-2 px-3">
            <Clock className="h-5 w-5" />
            <span className="text-xs text-gray-600">出勤表</span>
          </Button>
        </Link>

        {/* 顧客電話番号検索フォーム */}
        <form onSubmit={handleSearch} className="relative max-w-md">
          <Input 
            type="search" 
            placeholder="顧客電話番号検索" 
            className="pl-4 pr-10 py-2 bg-gray-50"
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
                ? castList.find((cast) => cast.id === value)?.name || "キャスト検索"
                : "キャスト検索"}
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
                        setValue(currentValue === value ? "" : currentValue)
                        setOpen(false)
                        router.push(`/cast/${cast.id}`)
                      }}
                    >
                      {cast.name}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          value === cast.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Link href="/analytics/daily-sales">
          <Button variant="ghost" className="shrink-0 flex flex-col items-center gap-0.5 h-auto py-2 px-3">
            <BarChart2 className="h-5 w-5" />
            <span className="text-xs text-gray-600">集計</span>
          </Button>
        </Link>

        <Link href="/settings">
          <Button variant="ghost" className="shrink-0 flex flex-col items-center gap-0.5 h-auto py-2 px-3">
            <Settings className="h-5 w-5" />
            <span className="text-xs text-gray-600">設定</span>
          </Button>
        </Link>

        <div className="flex-1" />

        <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="relative flex flex-col items-center gap-0.5 h-auto py-2 px-3">
              <Bell className="h-5 w-5" />
              <span className="text-xs text-gray-600">通知</span>
              {unreadCount > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 px-2 py-1 text-xs bg-red-500 text-white rounded-full"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-auto p-0" 
            align="end"
          >
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
      </div>
      <div className="h-[83px]"></div> {/* ヘッダーの高さ分のスペーサー */}
    </>
  )
}

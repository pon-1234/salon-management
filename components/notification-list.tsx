import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ReservationNotification {
  id: string
  storeId: string
  storeName: string
  type: 'reservation'
  message: string
  details: {
    reservationId: string
    reservationDate: string
    reservationTime: string
    receivedTime: string
    staffName?: string
    customerName: string
    status: string
    startTime: string
    endTime: string
    storeId?: string
  }
  read: boolean
  readAt?: string | null
  createdAt: string
  assignedTo?: string | null
  resolvedAt?: string | null
}

interface NotificationListProps {
  notifications: ReservationNotification[]
  onClose: () => void
  onMarkAsRead: (id: string) => void
  onMarkAsUnread: (id: string) => void
  onSelect: (notification: ReservationNotification) => void
}

const statusVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'success'> = {
  reminder: 'default',
  confirmed: 'success',
  pending: 'secondary',
  cancelled: 'destructive',
}

const statusLabelMap: Record<string, string> = {
  reminder: 'リマインド',
  confirmed: '確定',
  pending: '承認待ち',
  cancelled: 'キャンセル',
}

export function NotificationList({
  notifications,
  onClose,
  onMarkAsRead,
  onMarkAsUnread,
  onSelect,
}: NotificationListProps) {
  const [search, setSearch] = useState('')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  const filteredNotifications = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return notifications.filter((notification) => {
      if (showUnreadOnly && notification.read) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      const haystack = [
        notification.storeName,
        notification.message,
        notification.details.customerName,
        notification.details.staffName,
        notification.details.reservationDate,
        notification.details.reservationTime,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [notifications, search, showUnreadOnly])

  return (
    <div className="w-[440px] overflow-hidden rounded-lg border bg-white">
      <div className="flex items-center justify-between bg-emerald-600 p-4 text-white">
        <div>
          <h2 className="text-lg font-semibold">予約通知</h2>
          <p className="text-xs opacity-80">過去24時間以内のイベントを表示しています</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-emerald-700"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="店舗・キャスト・顧客で検索"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Button
            variant={showUnreadOnly ? 'default' : 'outline'}
            onClick={() => setShowUnreadOnly((prev) => !prev)}
            className="whitespace-nowrap"
          >
            未読のみ
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[420px]">
        {filteredNotifications.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">該当する通知はありません。</div>
        ) : (
          filteredNotifications.map((notification) => {
            const statusVariant = statusVariantMap[notification.details.status] ?? 'secondary'
            const statusLabel = statusLabelMap[notification.details.status] ?? notification.details.status

            return (
              <div
                key={notification.id}
                className={cn(
                  'cursor-pointer border-b p-4 transition-colors hover:bg-emerald-50/70',
                  notification.read ? 'bg-white' : 'bg-emerald-50'
                )}
                onClick={() => onSelect(notification)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-emerald-600">
                      <span className="font-medium">{notification.storeName}</span>
                      <Badge variant={statusVariant} className="capitalize">
                        {statusLabel}
                      </Badge>
                      {notification.assignedTo && (
                        <Badge variant="outline" className="text-xs">
                          担当 {notification.assignedTo}
                        </Badge>
                      )}
                      {notification.resolvedAt && (
                        <Badge variant="outline" className="text-[10px] text-emerald-700">
                          確認済み
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-foreground">{notification.message}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                      <div>
                        <span className="block text-[11px] uppercase text-muted-foreground">ご予約</span>
                        <span className="font-medium text-foreground">
                          {notification.details.reservationDate}{' '}
                          {notification.details.reservationTime}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] uppercase text-muted-foreground">顧客</span>
                        <span className="font-medium text-foreground">
                          {notification.details.customerName}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] uppercase text-muted-foreground">キャスト</span>
                        <span className="font-medium text-foreground">
                          {notification.details.staffName ?? '未割当'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] uppercase text-muted-foreground">受付</span>
                        <span>{notification.details.receivedTime}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] uppercase text-muted-foreground">予約ID</span>
                        <span>{notification.details.reservationId}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {notification.read ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation()
                          onMarkAsUnread(notification.id)
                        }}
                      >
                        未読に戻す
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation()
                          onMarkAsRead(notification.id)
                        }}
                      >
                        既読にする
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-emerald-600 hover:text-emerald-700"
                      onClick={(event) => {
                        event.stopPropagation()
                        onSelect(notification)
                      }}
                    >
                      詳細を見る →
                    </Button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </ScrollArea>
    </div>
  )
}

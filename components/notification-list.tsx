import { X, Archive } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  storeName: string
  type: "reservation" | "message" | "system"
  message: string
  details: {
    reservationDate?: string
    reservationTime?: string
    receivedTime?: string
    staff?: string
    customer?: string
  }
  read: boolean
}

interface NotificationListProps {
  notifications: Notification[]
  onClose: () => void
  onNotificationClick: (id: string) => void;
  onViewDetails: (id: string) => void;
  onArchive: (id: string) => void
}

export function NotificationList({
  notifications,
  onClose,
  onNotificationClick,
  onViewDetails,
  onArchive
}: NotificationListProps) {
  return (
    <div className="w-[400px] bg-white border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-emerald-600 p-4 text-white">
        <h2 className="text-lg font-semibold">お知らせ一覧</h2>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-emerald-700 text-white"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      <ScrollArea className="h-[400px]">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={cn(
              "border-b p-4 hover:bg-gray-50 cursor-pointer transition-colors",
              !notification.read && "bg-emerald-50"
            )}
            onClick={() => onNotificationClick(notification.id)}
          >
            <div className="rounded-lg">
              <div className="text-sm font-medium text-emerald-600 mb-1">
                {notification.storeName}
              </div>
              <div className="font-medium mb-2">{notification.message}</div>
              <div className="space-y-1 text-sm text-gray-600">
                {notification.details.reservationDate && (
                  <div className="flex justify-between">
                    <span>ご予約日時：</span>
                    <span>{notification.details.reservationDate} {notification.details.reservationTime}</span>
                  </div>
                )}
                {notification.details.receivedTime && (
                  <div className="flex justify-between">
                    <span>受付日時：</span>
                    <span>{notification.details.receivedTime}</span>
                  </div>
                )}
                {notification.details.staff && notification.details.customer && (
                  <div className="flex justify-between">
                    <span>キャスト：</span>
                    <span>{notification.details.staff}</span>
                  </div>
                )}
                {notification.details.customer && (
                  <div className="flex justify-between">
                    <span>顧客：</span>
                    <span>{notification.details.customer} 様</span>
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(notification.id);
                  }}
                >
                  <Archive className="w-4 h-4" />
                </Button>
                <Button
                  variant="link"
                  className="text-emerald-600 hover:text-emerald-700 p-0 h-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(notification.id);
                  }}
                >
                  詳細を見る →
                </Button>
              </div>
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  )
}

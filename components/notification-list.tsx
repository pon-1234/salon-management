import { X, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  storeName: string
  type: 'reservation' | 'message' | 'system' | 'incoming_call'
  message: string
  details: {
    reservationDate?: string
    reservationTime?: string
    receivedTime: string
    staff?: string
    customer: string
    phoneNumber?: string
    callDuration?: string
    callStatus?: 'answered' | 'rejected' | 'missed'
  }
  read: boolean
}

interface NotificationListProps {
  notifications: Notification[]
  onClose: () => void
  onNotificationClick: (id: string) => void
  onViewDetails: (id: string) => void
  onArchive: (id: string) => void
}

export function NotificationList({
  notifications,
  onClose,
  onNotificationClick,
  onViewDetails,
  onArchive,
}: NotificationListProps) {
  return (
    <div className="w-[400px] overflow-hidden rounded-lg border bg-white">
      <div className="flex items-center justify-between bg-emerald-600 p-4 text-white">
        <h2 className="text-lg font-semibold">お知らせ一覧</h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-emerald-700"
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
              'cursor-pointer border-b p-4 transition-colors hover:bg-gray-50',
              !notification.read && 'bg-emerald-50'
            )}
            onClick={() => onNotificationClick(notification.id)}
          >
            <div className="rounded-lg">
              <div className="mb-1 text-sm font-medium text-emerald-600">
                {notification.storeName}
              </div>
              <div className="mb-2 font-medium">{notification.message}</div>
              <div className="space-y-1 text-sm text-gray-600">
                {notification.type === 'incoming_call' ? (
                  <>
                    {notification.details.phoneNumber && (
                      <div className="flex justify-between">
                        <span>電話番号：</span>
                        <span>{notification.details.phoneNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>着信日時：</span>
                      <span>{notification.details.receivedTime}</span>
                    </div>
                    {notification.details.callStatus && (
                      <div className="flex justify-between">
                        <span>対応状況：</span>
                        <span
                          className={
                            notification.details.callStatus === 'answered'
                              ? 'text-green-600'
                              : notification.details.callStatus === 'rejected'
                                ? 'text-red-600'
                                : 'text-yellow-600'
                          }
                        >
                          {notification.details.callStatus === 'answered'
                            ? '応答済み'
                            : notification.details.callStatus === 'rejected'
                              ? '拒否'
                              : '不在着信'}
                        </span>
                      </div>
                    )}
                    {notification.details.callDuration && (
                      <div className="flex justify-between">
                        <span>通話時間：</span>
                        <span>{notification.details.callDuration}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>顧客：</span>
                      <span>{notification.details.customer} 様</span>
                    </div>
                  </>
                ) : (
                  <>
                    {notification.details.reservationDate && (
                      <div className="flex justify-between">
                        <span>ご予約日時：</span>
                        <span>
                          {notification.details.reservationDate}{' '}
                          {notification.details.reservationTime}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>受付日時：</span>
                      <span>{notification.details.receivedTime}</span>
                    </div>
                    {notification.details.staff && (
                      <div className="flex justify-between">
                        <span>キャスト：</span>
                        <span>{notification.details.staff}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>顧客：</span>
                      <span>{notification.details.customer} 様</span>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-2 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    onArchive(notification.id)
                  }}
                >
                  <Archive className="h-4 w-4" />
                </Button>
                <Button
                  variant="link"
                  className="h-auto p-0 text-emerald-600 hover:text-emerald-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewDetails(notification.id)
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

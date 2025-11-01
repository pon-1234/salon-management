import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'

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

interface NotificationDetailDialogProps {
  open: boolean
  notification: ReservationNotification | null
  onOpenChange: (open: boolean) => void
  onAssign: (id: string, assignee: string) => void
  onResolve: (id: string, resolved: boolean) => void
  onMarkAsRead: (id: string) => void
  onNavigate: (notification: ReservationNotification) => void
}

export function NotificationDetailDialog({
  open,
  notification,
  onOpenChange,
  onAssign,
  onResolve,
  onMarkAsRead,
  onNavigate,
}: NotificationDetailDialogProps) {
  const [assignee, setAssignee] = useState('')

  useEffect(() => {
    if (notification) {
      setAssignee(notification.assignedTo ?? '')
      if (!notification.read) {
        onMarkAsRead(notification.id)
      }
    }
  }, [notification, onMarkAsRead])

  if (!notification) {
    return null
  }

  const start = new Date(notification.details.startTime)
  const end = new Date(notification.details.endTime)
  const startLabel = format(start, 'M月d日 (EEE) HH:mm')
  const endLabel = format(end, 'HH:mm')

  const isResolved = Boolean(notification.resolvedAt)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span>{notification.storeName}</span>
            <Badge variant="outline" className="text-xs">予約ID {notification.details.reservationId}</Badge>
          </DialogTitle>
          <DialogDescription>{notification.message}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <section className="grid gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-[11px] uppercase text-muted-foreground">ご予約日時</p>
              <p className="text-base font-semibold text-foreground">
                {startLabel} - {endLabel}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase text-muted-foreground">受付</p>
              <p className="font-semibold text-foreground">{notification.details.receivedTime}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase text-muted-foreground">顧客</p>
              <p className="font-semibold text-foreground">{notification.details.customerName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase text-muted-foreground">担当キャスト</p>
              <p className="font-semibold text-foreground">{notification.details.staffName ?? '未割当'}</p>
            </div>
          </section>

          <section className="space-y-2 rounded-lg border border-dashed border-border/60 p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">タスク管理</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input
                placeholder="担当者名を入力"
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
              />
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => onAssign(notification.id, assignee.trim())}
                >
                  担当者に割り当てる
                </Button>
                <Button
                  variant={isResolved ? 'outline' : 'default'}
                  onClick={() => onResolve(notification.id, !isResolved)}
                >
                  {isResolved ? '確認済みを解除' : '確認済みにする'}
                </Button>
              </div>
            </div>
            {notification.assignedTo && (
              <p className="text-xs text-muted-foreground">
                現在の担当者: <span className="font-medium text-foreground">{notification.assignedTo}</span>
              </p>
            )}
            {notification.resolvedAt && (
              <p className="text-xs text-muted-foreground">
                確認済み: {format(new Date(notification.resolvedAt), 'M月d日 HH:mm')}
              </p>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
          <Button onClick={() => onNavigate(notification)}>関連ページを開く</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

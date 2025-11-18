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
import { format } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import type { ReservationNotification } from '@/contexts/notification-context'

interface NotificationDetailDialogProps {
  open: boolean
  notification: ReservationNotification | null
  onOpenChange: (open: boolean) => void
  onMarkAsRead: (id: string) => void
  onNavigate: (notification: ReservationNotification) => void
}

interface ReservationDetailPayload {
  id: string
  course?: { name?: string | null } | null
  cast?: { name?: string | null } | null
  customer?: { name?: string | null } | null
  options?: Array<{ optionName?: string | null; optionPrice?: number | null }>
  marketingChannel?: string | null
  paymentMethod?: string | null
  price?: number | null
  notes?: string | null
}

export function NotificationDetailDialog({
  open,
  notification,
  onOpenChange,
  onMarkAsRead,
  onNavigate,
}: NotificationDetailDialogProps) {
  const [detail, setDetail] = useState<ReservationDetailPayload | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (!notification) {
      return
    }

    setDetail(null)
    setDetailError(null)

    if (!notification.read) {
      onMarkAsRead(notification.id)
    }

    const controller = new AbortController()

    const fetchReservation = async () => {
      setDetailLoading(true)
      try {
        const params = new URLSearchParams({
          id: notification.details.reservationId,
        })
        if (notification.details.storeId) {
          params.set('storeId', notification.details.storeId)
        }

        const response = await fetch(`/api/reservation?${params.toString()}`, {
          cache: 'no-store',
          credentials: 'include',
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('予約情報を取得できませんでした')
        }

        const payload = await response.json()
        if (!controller.signal.aborted) {
          setDetail(payload)
        }
      } catch (error) {
        if (controller.signal.aborted) return
        setDetailError(error instanceof Error ? error.message : '予約情報を取得できませんでした')
      } finally {
        if (!controller.signal.aborted) {
          setDetailLoading(false)
        }
      }
    }

    fetchReservation()

    return () => controller.abort()
  }, [notification, onMarkAsRead])

  const courseName = useMemo(() => {
    if (detail?.course?.name) {
      return detail.course.name
    }
    if (detailLoading) {
      return '読み込み中...'
    }
    return '不明'
  }, [detail, detailLoading])

  const coursePrice = useMemo(() => {
    if (typeof detail?.price === 'number') {
      return `¥${detail.price.toLocaleString()}`
    }
    if (detailLoading) {
      return '読み込み中...'
    }
    return '—'
  }, [detail, detailLoading])

  const marketingChannel = detail?.marketingChannel ?? (detailLoading ? '読み込み中...' : 'WEB')
  const paymentMethod = detail?.paymentMethod ?? (detailLoading ? '読み込み中...' : '現金')

  if (!notification) {
    return null
  }

  const start = new Date(notification.details.startTime)
  const end = new Date(notification.details.endTime)
  const startLabel = format(start, 'M月d日 (EEE) HH:mm')
  const endLabel = format(end, 'HH:mm')

  const optionList =
    detail?.options?.length && !detailLoading
      ? detail.options.map((option, index) => ({
          key: `${option.optionName ?? 'option'}-${index}`,
          name: option.optionName ?? 'オプション',
          price:
            typeof option.optionPrice === 'number'
              ? `¥${option.optionPrice.toLocaleString()}`
              : '—',
        }))
      : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span>{notification.storeName}</span>
            <Badge variant="outline" className="text-xs">
              予約ID {notification.details.reservationId}
            </Badge>
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
              <p className="font-semibold text-foreground">
                {notification.details.staffName ?? '未割当'}
              </p>
            </div>
          </section>

          <section className="space-y-3 rounded-lg border border-border/60 p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">予約詳細</p>
            {detailError && <p className="text-xs text-destructive">{detailError}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-[11px] uppercase text-muted-foreground">コース</p>
                <p className="font-semibold text-foreground">{courseName}</p>
                <p className="text-xs text-muted-foreground">{coursePrice}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] uppercase text-muted-foreground">お支払い</p>
                <p className="font-semibold text-foreground">{paymentMethod}</p>
                <p className="text-xs text-muted-foreground">チャネル: {marketingChannel}</p>
              </div>
            </div>
            {detailLoading && (
              <p className="text-xs text-muted-foreground">予約詳細を読み込み中です...</p>
            )}
            {!detailLoading && optionList.length > 0 && (
              <div>
                <p className="text-[11px] uppercase text-muted-foreground">オプション</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {optionList.map((option) => (
                    <li
                      key={option.key}
                      className="flex items-center justify-between border-b border-dashed border-border/60 py-1 text-muted-foreground"
                    >
                      <span>{option.name}</span>
                      <span className="font-medium text-foreground">{option.price}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {detail?.notes && (
              <div>
                <p className="text-[11px] uppercase text-muted-foreground">備考</p>
                <p className="text-sm text-foreground">{detail.notes}</p>
              </div>
            )}
          </section>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
          <Button onClick={() => onNavigate(notification)}>予約画面で開く</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

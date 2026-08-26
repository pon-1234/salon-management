/**
 * @design_doc   Daily reservation table and its explicit quick-status action contract
 * @related_to   ReservationListPage, ReservationDialog
 * @known_issues None
 */
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { ReservationData } from '@/lib/types/reservation'
import { MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'
import { ReservationStatus } from '@/lib/constants'
import { isCreditCardPaymentMethod } from '@/lib/reservation/credit-card-fee'
import {
  compareReservationsForOpsList,
  getReservationStatusLabel,
  isCompletedOpsStatus,
} from '@/lib/reservation/status-display'

interface ReservationListProps {
  reservations: ReservationData[]
  limit?: number
  showViewMore?: boolean
  onOpenReservation?: (reservation: ReservationData) => void
}

export function ReservationList({
  reservations,
  limit,
  showViewMore = false,
  onOpenReservation,
}: ReservationListProps) {
  const displayReservations = limit ? reservations.slice(0, limit) : reservations
  const orderedReservations = useMemo(
    () => [...displayReservations].sort(compareReservationsForOpsList),
    [displayReservations]
  )
  const activeReservations = orderedReservations.filter(
    (reservation) => !isCompletedOpsStatus(reservation.status)
  )
  const completedReservations = orderedReservations.filter((reservation) =>
    isCompletedOpsStatus(reservation.status)
  )

  const statusMeta = useMemo(
    () =>
      ({
        confirmed: {
          label: '確定',
          className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
        },
        pending: {
          label: '仮予約',
          className: 'bg-amber-100 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
        },
        tentative: {
          label: '仮予約',
          className: 'bg-amber-100 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
        },
        cancelled: {
          label: 'キャンセル',
          className: 'bg-rose-100 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
        },
        modifiable: {
          label: '修正待ち',
          className: 'bg-sky-100 text-sky-700 border-sky-200',
          dot: 'bg-sky-500',
        },
        completed: {
          label: '完了',
          className: 'bg-slate-200 text-slate-700 border-slate-300',
          dot: 'bg-slate-500',
        },
        preconfirmed: {
          label: '事前確認',
          className: 'bg-sky-100 text-sky-700 border-sky-200',
          dot: 'bg-sky-500',
        },
      }) as Record<
        ReservationStatus | 'tentative' | string,
        { label: string; className: string; dot: string }
      >,
    []
  )

  const renderStatusBadge = (
    status?: string | null,
    fallbackLabel?: string,
    marketingChannel?: string | null
  ) => {
    const normalized = status?.toLowerCase() ?? ''
    const meta = statusMeta[normalized] ?? null
    const label =
      getReservationStatusLabel(normalized, marketingChannel) ||
      meta?.label ||
      fallbackLabel ||
      '未設定'
    const dotClass = meta?.dot ?? 'bg-slate-400'
    const baseClass =
      meta?.className ?? 'bg-slate-100 text-slate-600 border border-slate-200 shadow-none'

    return (
      <Badge
        variant="outline"
        className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${baseClass}`}
      >
        <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden="true" />
        {label}
      </Badge>
    )
  }

  const renderCardPaymentBadge = (reservation: ReservationData) => {
    if (!isCreditCardPaymentMethod(reservation.paymentMethod)) {
      return <span className="text-xs text-muted-foreground">—</span>
    }
    const processed = Boolean(reservation.paymentReference?.trim())
    return (
      <Badge
        variant="outline"
        className={
          processed
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }
      >
        {processed ? 'カード処理済み' : 'カード未処理'}
      </Badge>
    )
  }

  const renderRow = (reservation: ReservationData) => (
    <TableRow
      key={reservation.id}
      onClick={() => onOpenReservation && onOpenReservation(reservation)}
      className="cursor-pointer hover:bg-gray-50"
    >
      <TableCell className="whitespace-nowrap">
        <div className="w-24 rounded bg-muted p-1 text-center font-mono text-xs text-muted-foreground">
          {reservation.id.slice(0, 10)}
        </div>
      </TableCell>
      <TableCell>
        <div>{reservation.customerName} 様</div>
        {reservation.designation === 'new' && (
          <div className="mt-1 text-sm text-gray-500">[新規指名]</div>
        )}
        <div className="mt-1 text-sm text-gray-500">{reservation.location}</div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span>{format(reservation.startTime, 'yyyy-MM-dd')}</span>
        </div>
        <div className="text-sm text-gray-500">{format(reservation.startTime, 'HH:mm')}</div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span>{reservation.staff || 'キャスト未設定'}</span>
        </div>
      </TableCell>
      <TableCell>{`${reservation.course}`}</TableCell>
      <TableCell>{format(reservation.startTime, 'HH:mm')}</TableCell>
      <TableCell>{format(reservation.endTime, 'HH:mm')}</TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-2">
          {renderStatusBadge(
            reservation.status,
            reservation.bookingStatus,
            reservation.marketingChannel
          )}
        </div>
      </TableCell>
      <TableCell>{renderCardPaymentBadge(reservation)}</TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="icon"
          aria-label="予約詳細を開く"
          onClick={(event) => {
            event.stopPropagation()
            onOpenReservation?.(reservation)
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px] whitespace-nowrap">番号</TableHead>
              <TableHead className="w-[140px] whitespace-nowrap">お名前</TableHead>
              <TableHead className="whitespace-nowrap">日時指定</TableHead>
              <TableHead className="whitespace-nowrap">キャスト</TableHead>
              <TableHead className="whitespace-nowrap">コース</TableHead>
              <TableHead className="w-[80px] whitespace-nowrap">開始</TableHead>
              <TableHead className="w-[80px] whitespace-nowrap">終了</TableHead>
              <TableHead className="w-[180px] whitespace-nowrap">ステータス</TableHead>
              <TableHead className="w-[140px] whitespace-nowrap">カード決済</TableHead>
              <TableHead className="w-[80px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderedReservations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center text-sm text-muted-foreground">
                  この日の予約はありません。
                </TableCell>
              </TableRow>
            ) : (
              <>
                {activeReservations.map(renderRow)}
                {completedReservations.length > 0 ? (
                  <>
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600"
                      >
                        完了
                      </TableCell>
                    </TableRow>
                    {completedReservations.map(renderRow)}
                  </>
                ) : null}
              </>
            )}
          </TableBody>
        </Table>
      </div>
      {showViewMore && reservations.length > (limit || 0) && (
        <div className="mt-4 flex justify-center">
          <Link href="/admin/reservation-list">
            <Button variant="default" className="bg-emerald-600 text-white hover:bg-emerald-700">
              もっと見る
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}

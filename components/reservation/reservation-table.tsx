'use client'

import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMemo, useState } from 'react'
import { ReservationDialog } from './reservation-dialog'
import { ReservationData } from '@/lib/types/reservation'
import { ReservationStatus } from '@/lib/constants'

interface ReservationTableProps {
  reservations: ReservationData[]
  onOpenReservation?: (reservation: ReservationData | null) => void
}

export function ReservationTable({ reservations, onOpenReservation }: ReservationTableProps) {
  const [selectedReservation, setSelectedReservation] = useState<ReservationData | null>(null)
  const statusMeta = useMemo(
    () =>
      ({
        confirmed: {
          label: '確定済',
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
      }) as Record<ReservationStatus | 'tentative' | string, { label: string; className: string; dot: string }>,
    []
  )

  const renderStatusBadge = (status?: string | null, fallbackLabel?: string) => {
    const normalized = status?.toLowerCase() ?? ''
    const meta = statusMeta[normalized] ?? null
    const label = meta?.label ?? fallbackLabel ?? '未設定'
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

  const handleOpenReservation = (reservation: ReservationData) => {
    if (onOpenReservation) {
      onOpenReservation(reservation)
    } else {
      setSelectedReservation(reservation)
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px] whitespace-nowrap">NO.</TableHead>
            <TableHead className="w-[160px] whitespace-nowrap">お名前</TableHead>
            <TableHead className="w-[160px] whitespace-nowrap">日時指定</TableHead>
            <TableHead className="w-[160px] whitespace-nowrap">女性</TableHead>
            <TableHead className="w-[160px] whitespace-nowrap">コース</TableHead>
            <TableHead className="w-[80px] whitespace-nowrap">IN</TableHead>
            <TableHead className="w-[80px] whitespace-nowrap">OUT</TableHead>
            <TableHead className="w-[130px] whitespace-nowrap">ステータス</TableHead>
            <TableHead className="w-[200px]">詳細</TableHead>
            <TableHead className="w-[80px] text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((reservation, index) => (
            <TableRow key={index} onClick={() => handleOpenReservation(reservation)}>
              <TableCell className="font-medium whitespace-nowrap">
                {(index + 1).toString().padStart(4, '0')}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {reservation.customerName} 様
                  <Badge
                    variant="secondary"
                    className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"
                  >
                    {reservation.customerType}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500">顧客ID: {reservation?.customerId || ''}</div>
              </TableCell>
              <TableCell>
                {reservation.date} {reservation.time}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Image
                    src={reservation.staffImage}
                    alt={reservation.staff}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <span>{reservation.staff}</span>
                </div>
              </TableCell>
              <TableCell>{reservation.course}</TableCell>
              <TableCell>{reservation.time}</TableCell>
              <TableCell>{reservation.inOutTime.split('-')[1] || '-'}</TableCell>
              <TableCell className="whitespace-nowrap">
                {renderStatusBadge(reservation.status, reservation.bookingStatus)}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{reservation.location}</span>
                  <span className="text-xs text-gray-500">{reservation.specificLocation}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ReservationDialog
        open={!!selectedReservation}
        onOpenChange={(open) => !open && setSelectedReservation(null)}
        reservation={selectedReservation}
      />
    </>
  )
}

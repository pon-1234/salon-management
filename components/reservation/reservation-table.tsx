'use client'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
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
import { useState } from 'react'
import { ReservationDialog } from './reservation-dialog'
import { ReservationData } from '@/lib/types/reservation'

interface ReservationTableProps {
  reservations: ReservationData[]
  onOpenReservation?: (reservation: ReservationData | null) => void
}

export function ReservationTable({ reservations, onOpenReservation }: ReservationTableProps) {
  const [selectedReservation, setSelectedReservation] = useState<ReservationData | null>(null)

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
            <TableHead className="w-[120px] whitespace-nowrap">確認</TableHead>
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
              <TableCell>
                <Badge
                  variant={reservation.bookingStatus === '確定済' ? 'default' : 'outline'}
                  className={`w-fit ${
                    reservation.bookingStatus === '確定済' ? 'bg-emerald-600 text-white' : ''
                  }`}
                >
                  {reservation.bookingStatus}
                </Badge>
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

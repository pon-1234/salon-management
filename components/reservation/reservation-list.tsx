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
import Link from 'next/link'
import { format } from 'date-fns'
import { ReservationData } from '@/lib/types/reservation'

interface ReservationListProps {
  reservations: ReservationData[]
  limit?: number
  showViewMore?: boolean
  onOpenReservation?: (reservation: ReservationData) => void
  onMakeModifiable?: (reservationId: string) => void
}

export function ReservationList({
  reservations,
  limit,
  showViewMore = false,
  onOpenReservation,
  onMakeModifiable,
}: ReservationListProps) {
  const displayReservations = limit ? reservations.slice(0, limit) : reservations

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'ゴールド':
        return 'bg-gray-600 text-white'
      case 'シルバー':
        return 'bg-gray-400 text-white'
      case 'ブロンズ':
        return 'bg-orange-400 text-white'
      default:
        return 'bg-gray-100'
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px] whitespace-nowrap">NO.</TableHead>
              <TableHead className="w-[140px] whitespace-nowrap">お名前</TableHead>
              <TableHead className="whitespace-nowrap">日時指定</TableHead>
              <TableHead className="whitespace-nowrap">スタッフ</TableHead>
              <TableHead className="whitespace-nowrap">コース</TableHead>
              <TableHead className="w-[80px] whitespace-nowrap">IN</TableHead>
              <TableHead className="w-[80px] whitespace-nowrap">OUT</TableHead>
              <TableHead className="w-[180px] whitespace-nowrap">確認</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayReservations.map((reservation) => (
              <TableRow
                key={reservation.id}
                onClick={() => onOpenReservation && onOpenReservation(reservation)}
                className="cursor-pointer hover:bg-gray-50"
              >
                <TableCell className="whitespace-nowrap">
                  <div className="w-24 rounded bg-red-50 p-1 text-center font-mono text-xs">
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
                  <div className="text-sm text-gray-500">
                    {format(reservation.startTime, 'HH:mm')}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{reservation.staff}</span>
                  </div>
                </TableCell>
                <TableCell>{`${reservation.course}`}</TableCell>
                <TableCell>{format(reservation.startTime, 'HH:mm')}</TableCell>
                <TableCell>{format(reservation.endTime, 'HH:mm')}</TableCell>
                <TableCell>
                  <div className="flex flex-nowrap items-center gap-2">
                    <Badge
                      variant={
                        reservation.bookingStatus === '確定'
                          ? 'default'
                          : reservation.bookingStatus === '修正可能'
                            ? 'outline'
                            : 'secondary'
                      }
                      className="whitespace-nowrap"
                    >
                      {reservation.bookingStatus}
                    </Badge>
                    {reservation.bookingStatus === '確定' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 whitespace-nowrap px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          onMakeModifiable?.(reservation.id)
                        }}
                      >
                        修正可能にする
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
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

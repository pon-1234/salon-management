import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import { format } from "date-fns"
import { Reservation } from "@/lib/types/reservation"

interface ReservationListProps {
  reservations: Reservation[]
  limit?: number
  showViewMore?: boolean
  onOpenReservation?: (reservation: Reservation) => void
}

export function ReservationList({ reservations, limit, showViewMore = false, onOpenReservation }: ReservationListProps) {
  const displayReservations = limit ? reservations.slice(0, limit) : reservations

  const getRankColor = (rank: string) => {
    switch (rank) {
      case "ゴールド":
        return "bg-gray-600 text-white"
      case "シルバー":
        return "bg-gray-400 text-white"
      case "ブロンズ":
        return "bg-orange-400 text-white"
      default:
        return "bg-gray-100"
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">NO.</TableHead>
              <TableHead>お名前</TableHead>
              <TableHead>日時指定</TableHead>
              <TableHead>スタッフ</TableHead>
              <TableHead>コース</TableHead>
              <TableHead className="w-[80px]">IN</TableHead>
              <TableHead className="w-[80px]">OUT</TableHead>
              <TableHead className="w-[80px]">確認</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayReservations.map((reservation) => (
              <TableRow key={reservation.id} onClick={() => onOpenReservation && onOpenReservation(reservation)} className="cursor-pointer hover:bg-gray-50">
                <TableCell>
                  <div className="bg-red-50 text-center rounded p-1 w-20">
                    {reservation.id}
                  </div>
                </TableCell>
                <TableCell>
                  <div>{reservation.customerName} 様</div>
                  {reservation.isNewDesignation && (
                    <div className="text-sm text-gray-500 mt-1">
                      [新規指名]
                    </div>
                  )}
                  <div className="text-sm text-gray-500 mt-1">
                    {reservation.location}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{format(reservation.startTime, 'yyyy-MM-dd')}</span>
                  </div>
                  <div className="text-sm text-gray-500">{format(reservation.startTime, 'HH:mm')}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{reservation.staffName}</span>
                    <Badge className={getRankColor(reservation.staffRank)}>
                      {reservation.staffRank}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {`${reservation.courseName}${reservation.duration}分`}
                </TableCell>
                <TableCell>{format(reservation.startTime, 'HH:mm')}</TableCell>
                <TableCell>{format(reservation.endTime, 'HH:mm')}</TableCell>
                <TableCell>
                  <Badge variant={reservation.status === 'confirmed' ? 'default' : 'secondary'}>
                    {reservation.status === 'confirmed' ? '確定' : '未確定'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {showViewMore && reservations.length > (limit || 0) && (
        <div className="flex justify-center mt-4">
          <Link href="/reservation-list">
            <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              もっと見る
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}

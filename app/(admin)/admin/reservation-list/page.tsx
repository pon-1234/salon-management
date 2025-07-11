'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { ReservationList } from '@/components/reservation/reservation-list'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ReservationRepositoryImpl } from '@/lib/reservation/repository-impl'
import { toast } from '@/hooks/use-toast'
import { ReservationDialog } from '@/components/reservation/reservation-dialog'
import { Reservation, ReservationData } from '@/lib/types/reservation'
import { format } from 'date-fns'

export default function ReservationListPage() {
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const reservationRepository = new ReservationRepositoryImpl()

  useEffect(() => {
    fetchReservations()
  }, [])

  const fetchReservations = async () => {
    setLoading(true)
    try {
      const fetchedReservations = await reservationRepository.getAll()
      setReservations(fetchedReservations)
    } catch (error) {
      console.error('Error fetching reservations:', error)
      toast({
        title: 'エラー',
        description: '予約一覧の取得に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // 予約データをダイアログ用に変換
  const convertToReservationData = (reservation: Reservation): ReservationData | null => {
    if (!reservation) return null

    return {
      id: reservation.id,
      customerId: reservation.customerId,
      customerName: `顧客${reservation.customerId}`,
      customerType: '通常顧客',
      phoneNumber: '090-1234-5678',
      points: 100,
      bookingStatus: reservation.status,
      staffConfirmation: '確認済み',
      customerConfirmation: '確認済み',
      prefecture: '東京都',
      district: '渋谷区',
      location: 'アパホテル',
      locationType: 'ホテル',
      specificLocation: '502号室',
      staff: `スタッフ${reservation.staffId}`,
      marketingChannel: 'WEB',
      date: format(reservation.startTime, 'yyyy-MM-dd'),
      time: format(reservation.startTime, 'HH:mm'),
      inOutTime: `${format(reservation.startTime, 'HH:mm')}-${format(reservation.endTime, 'HH:mm')}`,
      course: 'リラクゼーションコース',
      freeExtension: 'なし',
      designation: '指名',
      designationFee: '3,000円',
      options: {},
      transportationFee: 0,
      paymentMethod: '現金',
      discount: '0円',
      additionalFee: 0,
      totalPayment: reservation.price,
      storeRevenue: Math.floor(reservation.price * 0.6),
      staffRevenue: Math.floor(reservation.price * 0.4),
      staffBonusFee: 0,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      staffImage: '/placeholder-user.jpg',
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">予約一覧</h1>
          <div className="flex items-center gap-4">
            <Select defaultValue="all">
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全て表示</SelectItem>
                <SelectItem value="confirmed">確定済み</SelectItem>
                <SelectItem value="pending">未確定</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input placeholder="予約No" className="w-[200px]" />
              <Button className="bg-emerald-600 hover:bg-emerald-700">検索</Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : (
          <ReservationList
            reservations={reservations
              .map((r) => convertToReservationData(r))
              .filter((r): r is ReservationData => r !== null)}
            onOpenReservation={(reservationData) => {
              const reservation = reservations.find((r) => r.id === reservationData.id)
              if (reservation) setSelectedReservation(reservation)
            }}
          />
        )}
      </main>
      <ReservationDialog
        open={!!selectedReservation}
        onOpenChange={(open) => !open && setSelectedReservation(null)}
        reservation={selectedReservation ? convertToReservationData(selectedReservation) : null}
      />
    </div>
  )
}

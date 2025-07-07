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
import { getAllReservations } from '@/lib/reservation/data'
import { ReservationDialog } from '@/components/reservation/reservation-dialog'
import { Reservation } from '@/lib/types/reservation'

export default function ReservationListPage() {
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])

  useEffect(() => {
    const fetchReservations = async () => {
      const fetchedReservations = await getAllReservations()
      setReservations(fetchedReservations)
    }

    fetchReservations()
  }, [])

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

        <ReservationList reservations={reservations} onOpenReservation={setSelectedReservation} />
      </main>
      <ReservationDialog
        open={!!selectedReservation}
        onOpenChange={(open) => !open && setSelectedReservation(null)}
        reservation={selectedReservation}
      />
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback, useMemo, ChangeEvent } from 'react'
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
import { Reservation, ReservationData, ReservationUpdatePayload } from '@/lib/types/reservation'
import { mapReservationToReservationData } from '@/lib/reservation/transformers'
import { useSession } from 'next-auth/react'
import { format, isSameDay, startOfDay, addDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useStore } from '@/contexts/store-context'


export default function ReservationListPage() {
  const { currentStore } = useStore()
  const [selectedReservation, setSelectedReservation] = useState<ReservationData | null>(null)
  const [rawReservations, setRawReservations] = useState<Reservation[]>([])
  const [dailyReservations, setDailyReservations] = useState<ReservationData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()))
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending'>('all')
  const { data: session } = useSession()
  const reservationRepository = useMemo(
    () => new ReservationRepositoryImpl(undefined, currentStore.id),
    [currentStore.id]
  )

  const updateDailyReservations = useCallback(
    (source: Reservation[], targetDate: Date) => {
      const filtered = source.filter((reservation) =>
        isSameDay(new Date(reservation.startTime), targetDate)
      )
      const mapped = filtered.map((reservation) =>
        mapReservationToReservationData({
          ...reservation,
          startTime: new Date(reservation.startTime),
          endTime: new Date(reservation.endTime),
        } as Reservation)
      )
      setDailyReservations(mapped.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()))
    },
    []
  )

  const fetchReservations = useCallback(async () => {
    setLoading(true)
    try {
      const fetchedReservations = await reservationRepository.getAll()
      const normalized = fetchedReservations.map(
        (reservation) =>
          ({
            ...reservation,
            startTime: new Date(reservation.startTime),
            endTime: new Date(reservation.endTime),
          }) as Reservation
      )
      setRawReservations(normalized)
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
  }, [reservationRepository])

  useEffect(() => {
    fetchReservations()
  }, [fetchReservations])

  useEffect(() => {
    updateDailyReservations(rawReservations, selectedDate)
  }, [rawReservations, selectedDate, updateDailyReservations])

  const filteredReservations = useMemo(() => {
    if (statusFilter === 'all') {
      return dailyReservations
    }

    if (statusFilter === 'confirmed') {
      return dailyReservations.filter((reservation) => reservation.status === 'confirmed')
    }

    return dailyReservations.filter(
      (reservation) => reservation.status !== 'confirmed' && reservation.status !== 'cancelled'
    )
  }, [dailyReservations, statusFilter])

  const confirmedCount = useMemo(
    () => dailyReservations.filter((reservation) => reservation.status === 'confirmed').length,
    [dailyReservations]
  )

  const pendingCount = useMemo(
    () =>
      dailyReservations.filter(
        (reservation) => reservation.status !== 'confirmed' && reservation.status !== 'cancelled'
      ).length,
    [dailyReservations]
  )

  const totalCount = dailyReservations.length

  const weekOverview = useMemo(() => {
    const baseDate = startOfDay(new Date())

    return Array.from({ length: 7 }).map((_, index) => {
      const date = addDays(baseDate, index)
      const dayReservations = rawReservations.filter((reservation) =>
        isSameDay(reservation.startTime, date)
      )

      const uniqueCustomers = new Set(
        dayReservations.map((reservation) => {
          const customer = (reservation as any).customer
          return (
            reservation.customerId ||
            (customer && (customer.id || customer.email)) ||
            (reservation as any).customerName ||
            reservation.id
          )
        })
      )

      return {
        date,
        reservationCount: dayReservations.length,
        customerCount: uniqueCustomers.size,
      }
    })
  }, [rawReservations])

  const handleDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    if (!value) return
    const nextDate = new Date(`${value}T00:00:00`)
    if (!Number.isNaN(nextDate.getTime())) {
      setSelectedDate(nextDate)
    }
  }

  const handleReservationSave = async (
    reservationId: string,
    payload: ReservationUpdatePayload
  ): Promise<void> => {
    const targetReservation = rawReservations.find((reservation) => reservation.id === reservationId)
    if (!targetReservation) {
      const err = new Error('対象の予約が見つかりません。')
      toast({
        title: '更新に失敗しました',
        description: err.message,
        variant: 'destructive',
      })
      throw err
    }

    const updatePayload: Partial<Reservation> & { castId?: string } = {
      castId: payload.castId,
      startTime: payload.startTime,
      endTime: payload.endTime,
    }

    if (payload.status) {
      updatePayload.status = payload.status as Reservation['status']
    }

    if (payload.notes !== undefined) {
      updatePayload.notes = payload.notes
    }

    if (payload.storeMemo !== undefined) {
      ;(updatePayload as any).storeMemo = payload.storeMemo
    }

    if (payload.designationType !== undefined) {
      updatePayload.designationType = payload.designationType
    }
    if (payload.designationFee !== undefined) {
      updatePayload.designationFee = payload.designationFee
    }
    if (payload.transportationFee !== undefined) {
      updatePayload.transportationFee = payload.transportationFee
    }
    if (payload.additionalFee !== undefined) {
      updatePayload.additionalFee = payload.additionalFee
    }
    if (payload.paymentMethod !== undefined) {
      updatePayload.paymentMethod = payload.paymentMethod
    }
    if (payload.marketingChannel !== undefined) {
      updatePayload.marketingChannel = payload.marketingChannel
    }
    if (payload.areaId !== undefined) {
      updatePayload.areaId = payload.areaId
    }
    if (payload.stationId !== undefined) {
      updatePayload.stationId = payload.stationId
    }
    if (payload.locationMemo !== undefined) {
      updatePayload.locationMemo = payload.locationMemo
    }
    if (payload.price !== undefined) {
      updatePayload.price = payload.price
    }

    try {
      const updatedReservation = await reservationRepository.update(reservationId, updatePayload)
      const normalizedUpdated = {
        ...updatedReservation,
        startTime: new Date(updatedReservation.startTime),
        endTime: new Date(updatedReservation.endTime),
      } as Reservation

      setRawReservations((prev) =>
        prev.map((reservation) => (reservation.id === reservationId ? normalizedUpdated : reservation))
      )

      const updatedData = mapReservationToReservationData(normalizedUpdated)
      setSelectedReservation(updatedData)

      toast({
        title: '予約を更新しました',
        description: '変更内容を保存しました。',
      })
    } catch (error) {
      const err = error instanceof Error ? error : new Error('不明なエラーが発生しました。')
      toast({
        title: '更新に失敗しました',
        description: err.message,
        variant: 'destructive',
      })
      throw err
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 overflow-x-auto">
          <div className="flex min-w-max gap-3">
            {weekOverview.map(({ date, reservationCount, customerCount }) => {
              const isActive = isSameDay(date, selectedDate)
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => setSelectedDate(new Date(date))}
                  className={cn(
                    'min-w-[140px] rounded-xl border px-4 py-3 text-left shadow-sm transition',
                    isActive
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-transparent bg-white hover:border-emerald-200 hover:bg-emerald-50/40'
                  )}
                >
                  <div className="text-sm font-semibold">
                    {format(date, 'M/d(E)', { locale: ja })}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    <span className="font-medium text-gray-700">{customerCount}人</span>/
                    {reservationCount}件
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">本日の予約</h1>
            <p className="text-sm text-muted-foreground">
              {format(selectedDate, 'yyyy年MM月dd日(E)')} の予約状況
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span>
                総件数 <span className="font-semibold text-foreground">{totalCount}</span>
              </span>
              <span className="text-emerald-600">確定 {confirmedCount}</span>
              <span className="text-amber-600">調整中 {pendingCount}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={handleDateChange}
              className="w-[180px]"
            />
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="confirmed">確定</SelectItem>
                <SelectItem value="pending">調整中</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchReservations} disabled={loading}>
              再読込
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : (
          <ReservationList
            reservations={filteredReservations}
            onOpenReservation={setSelectedReservation}
          />
        )}
      </main>
      <ReservationDialog
        open={!!selectedReservation}
        onOpenChange={(open) => !open && setSelectedReservation(null)}
        reservation={selectedReservation}
        onSave={handleReservationSave}
      />
    </div>
  )
}

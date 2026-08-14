'use client'

/**
 * @design_doc   Daily admin reservation list with persistent status and detail editing
 * @related_to   ReservationList, ReservationDialog, ReservationRepositoryImpl
 * @known_issues None
 */
import { useState, useEffect, useCallback, useMemo, ChangeEvent } from 'react'
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
import { getAllReservations } from '@/lib/reservation/data'
import { toast } from '@/hooks/use-toast'
import { ReservationDialog } from '@/components/reservation/reservation-dialog'
import {
  Reservation,
  ReservationApiUpdatePayload,
  ReservationData,
  ReservationSavePayload,
} from '@/lib/types/reservation'
import { mapReservationToReservationData } from '@/lib/reservation/transformers'
import { useSession } from 'next-auth/react'
import { addDays } from 'date-fns'
import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useStore } from '@/contexts/store-context'
import { hasPermission } from '@/lib/auth/permissions'
import { TableSkeleton } from '@/components/ui/page-loading'

const ADJUSTING_STATUSES = new Set(['pending', 'tentative', 'modifiable'])
const PAGE_SIZE = 25
const JST_TIMEZONE = 'Asia/Tokyo'
type ReservationStatusFilter = 'active' | 'confirmed' | 'pending' | 'cancelled'

function getJstDayRange(date: Date): { start: Date; end: Date } {
  const dateKey = formatInTimeZone(date, JST_TIMEZONE, 'yyyy-MM-dd')
  const start = zonedTimeToUtc(`${dateKey}T00:00:00`, JST_TIMEZONE)

  return { start, end: addDays(start, 1) }
}

function isWithinRange(date: Date, start: Date, end: Date): boolean {
  const timestamp = date.getTime()
  return timestamp >= start.getTime() && timestamp < end.getTime()
}

export default function ReservationListPage() {
  const { currentStore } = useStore()
  const [selectedReservation, setSelectedReservation] = useState<ReservationData | null>(null)
  const [rawReservations, setRawReservations] = useState<Reservation[]>([])
  const [dailyReservations, setDailyReservations] = useState<ReservationData[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(() => getJstDayRange(new Date()).start)
  const [statusFilter, setStatusFilter] = useState<ReservationStatusFilter>('active')
  const requestedStatus = statusFilter === 'pending' ? 'adjusting' : statusFilter
  const { data: session } = useSession()
  const canUpdateReservations = hasPermission(
    session?.user?.permissions ?? [],
    'reservation:update'
  )
  const reservationRepository = useMemo(
    () => new ReservationRepositoryImpl(undefined, currentStore.id),
    [currentStore.id]
  )

  const updateDailyReservations = useCallback((source: Reservation[], targetDate: Date) => {
    const { start, end } = getJstDayRange(targetDate)
    const filtered = source.filter((reservation) =>
      isWithinRange(new Date(reservation.startTime), start, end)
    )
    const mapped = filtered.map((reservation) =>
      mapReservationToReservationData({
        ...reservation,
        startTime: new Date(reservation.startTime),
        endTime: new Date(reservation.endTime),
      } as Reservation)
    )
    setDailyReservations(mapped.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()))
  }, [])

  const fetchReservations = useCallback(async () => {
    setLoading(true)
    try {
      const offset = page * PAGE_SIZE
      const { start, end } = getJstDayRange(selectedDate)
      const fetchedReservations = await getAllReservations({
        limit: PAGE_SIZE + 1,
        offset,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        storeId: currentStore.id,
        ...(requestedStatus ? { status: requestedStatus } : {}),
      })
      setHasMore(fetchedReservations.length > PAGE_SIZE)
      const normalized = fetchedReservations.slice(0, PAGE_SIZE).map(
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
  }, [currentStore.id, page, requestedStatus, selectedDate])

  useEffect(() => {
    fetchReservations()
  }, [fetchReservations])

  useEffect(() => {
    updateDailyReservations(rawReservations, selectedDate)
  }, [rawReservations, selectedDate, updateDailyReservations])

  const filteredReservations = useMemo(() => {
    if (statusFilter === 'active') {
      return dailyReservations.filter((reservation) => reservation.status !== 'cancelled')
    }

    if (statusFilter === 'confirmed') {
      return dailyReservations.filter((reservation) => reservation.status === 'confirmed')
    }

    if (statusFilter === 'pending') {
      return dailyReservations.filter((reservation) =>
        ADJUSTING_STATUSES.has(reservation.status ?? '')
      )
    }

    return dailyReservations.filter((reservation) => reservation.status === 'cancelled')
  }, [dailyReservations, statusFilter])

  const activeReservations = useMemo(
    () => dailyReservations.filter((reservation) => reservation.status !== 'cancelled'),
    [dailyReservations]
  )

  const confirmedCount = useMemo(
    () => dailyReservations.filter((reservation) => reservation.status === 'confirmed').length,
    [dailyReservations]
  )

  const pendingCount = useMemo(
    () =>
      dailyReservations.filter((reservation) => ADJUSTING_STATUSES.has(reservation.status ?? ''))
        .length,
    [dailyReservations]
  )

  const totalCount = activeReservations.length
  const cancelledCount = useMemo(
    () => dailyReservations.filter((reservation) => reservation.status === 'cancelled').length,
    [dailyReservations]
  )

  const weekOverview = useMemo(() => {
    const baseDate = getJstDayRange(new Date()).start

    return Array.from({ length: 7 }).map((_, index) => {
      const date = addDays(baseDate, index)
      const { start, end } = getJstDayRange(date)
      const dayReservations = rawReservations.filter(
        (reservation) =>
          reservation.status !== 'cancelled' &&
          isWithinRange(new Date(reservation.startTime), start, end)
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
    const nextDate = zonedTimeToUtc(`${value}T00:00:00`, JST_TIMEZONE)
    if (!Number.isNaN(nextDate.getTime())) {
      setPage(0)
      setSelectedDate(nextDate)
    }
  }

  const handleReservationSave = async (
    reservationId: string,
    payload: ReservationSavePayload
  ): Promise<void> => {
    const targetReservation = rawReservations.find(
      (reservation) => reservation.id === reservationId
    )
    if (!targetReservation) {
      const err = new Error('対象の予約が見つかりません。')
      toast({
        title: '更新に失敗しました',
        description: err.message,
        variant: 'destructive',
      })
      throw err
    }

    const updatePayload: ReservationApiUpdatePayload = { ...payload }

    try {
      const updatedReservation = await reservationRepository.update(reservationId, updatePayload)
      const normalizedUpdated = {
        ...updatedReservation,
        startTime: new Date(updatedReservation.startTime),
        endTime: new Date(updatedReservation.endTime),
        modifiableUntil: updatedReservation.modifiableUntil
          ? new Date(updatedReservation.modifiableUntil)
          : undefined,
      } as Reservation

      setRawReservations((prev) =>
        prev.map((reservation) =>
          reservation.id === reservationId ? normalizedUpdated : reservation
        )
      )

      const updatedData = mapReservationToReservationData(normalizedUpdated)
      setSelectedReservation((current) => {
        if (current?.id !== reservationId) {
          return current
        }
        return normalizedUpdated.status === 'cancelled' ? null : updatedData
      })

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
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 overflow-x-auto">
          <div className="flex min-w-max gap-3">
            {weekOverview.map(({ date, reservationCount, customerCount }) => {
              const isActive =
                formatInTimeZone(date, JST_TIMEZONE, 'yyyy-MM-dd') ===
                formatInTimeZone(selectedDate, JST_TIMEZONE, 'yyyy-MM-dd')
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => {
                    setPage(0)
                    setSelectedDate(new Date(date))
                  }}
                  className={cn(
                    'min-w-[140px] rounded-xl border px-4 py-3 text-left shadow-sm transition',
                    isActive
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-transparent bg-white hover:border-emerald-200 hover:bg-emerald-50/40'
                  )}
                >
                  <div className="text-sm font-semibold">
                    {formatInTimeZone(date, JST_TIMEZONE, 'M/d(E)', { locale: ja })}
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
              {formatInTimeZone(selectedDate, JST_TIMEZONE, 'yyyy年MM月dd日(E)', {
                locale: ja,
              })}{' '}
              の予約状況
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span>
                {statusFilter === 'cancelled' ? 'キャンセル件数' : '総件数'}{' '}
                <span className="font-semibold text-foreground">
                  {statusFilter === 'cancelled' ? cancelledCount : totalCount}
                </span>
              </span>
              <span className="text-emerald-600">確定 {confirmedCount}</span>
              <span className="text-amber-600">調整中 {pendingCount}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="date"
              value={formatInTimeZone(selectedDate, JST_TIMEZONE, 'yyyy-MM-dd')}
              onChange={handleDateChange}
              className="w-[180px]"
            />
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setPage(0)
                setStatusFilter(value as ReservationStatusFilter)
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">通常予約</SelectItem>
                <SelectItem value="confirmed">確定</SelectItem>
                <SelectItem value="pending">調整中</SelectItem>
                <SelectItem value="cancelled">キャンセル履歴</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchReservations} disabled={loading}>
              再読込
            </Button>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={8} columns={6} label="予約一覧を読み込んでいます" />
        ) : (
          <>
            <ReservationList
              reservations={filteredReservations}
              onOpenReservation={setSelectedReservation}
            />
            <div className="mt-4 flex items-center justify-end gap-3">
              <Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
                前へ
              </Button>
              <span className="text-sm text-muted-foreground">{page + 1}ページ</span>
              <Button variant="outline" disabled={!hasMore} onClick={() => setPage(page + 1)}>
                次へ
              </Button>
            </div>
          </>
        )}
      </main>
      <ReservationDialog
        open={!!selectedReservation}
        onOpenChange={(open) => !open && setSelectedReservation(null)}
        reservation={selectedReservation}
        onSave={canUpdateReservations ? handleReservationSave : undefined}
      />
    </div>
  )
}

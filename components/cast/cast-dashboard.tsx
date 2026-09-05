'use client'

/**
 * @design_doc   Client operational review: cast dashboard actions persist through domain APIs
 * @related_to   CastManagePage, ReservationDialog, ReservationRepositoryImpl
 * @known_issues None
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Cast, CastSchedule } from '@/lib/cast/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Clock, CalendarDays, User, Mail, Settings, Edit, DollarSign } from 'lucide-react'
import { ReservationDialog } from '@/components/reservation/reservation-dialog'
import { ReservationData, Reservation, ReservationSavePayload } from '@/lib/types/reservation'
import { getAllReservations } from '@/lib/reservation/data'
import { ReservationRepositoryImpl } from '@/lib/reservation/repository-impl'
import { format, addDays, startOfWeek } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
import {
  ScheduleEditDialog,
  type WeeklyScheduleEdit,
} from '@/components/cast-schedule/schedule-edit-dialog'
import type { CastScheduleStatus, ScheduleWorkStatus } from '@/lib/cast-schedule/old-types'
import { buildScheduleBatchPayload } from '@/lib/cast-schedule/batch-payload'
import { buildStoreScopedEndpoint } from '@/lib/store/endpoints'
import { useStore } from '@/contexts/store-context'
import { mapReservationToReservationData } from '@/lib/reservation/transformers'
interface CastDashboardProps {
  cast: Cast
  onUpdate: (data: Partial<Cast>) => Promise<void> | void
  onRequestEdit: () => void
}

export function CastDashboard({ cast, onUpdate, onRequestEdit }: CastDashboardProps) {
  const { currentStore } = useStore()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [scheduleMap, setScheduleMap] = useState<Record<string, CastSchedule>>({})
  const [scheduleReady, setScheduleReady] = useState(false)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), [])
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart])
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )
  const { toast } = useToast()
  const reservationRepository = useMemo(
    () => new ReservationRepositoryImpl(undefined, currentStore.id),
    [currentStore.id]
  )

  // 予約データを取得
  useEffect(() => {
    let ignore = false

    const fetchReservations = async () => {
      try {
        const pageSize = 100
        const now = new Date()
        const rangeEnd = addDays(now, 366)
        const allReservations: Reservation[] = []
        let offset = 0
        let page: Reservation[]

        do {
          page = await getAllReservations({
            storeId: currentStore.id,
            castId: cast.id,
            status: 'active',
            startDate: now.toISOString(),
            endDate: rangeEnd.toISOString(),
            limit: 100,
            offset,
          })
          allReservations.push(...page)
          offset += page.length
        } while (page.length === pageSize)

        if (!ignore) {
          setReservations(
            allReservations.map(
              (reservation) =>
                ({
                  ...reservation,
                  startTime: new Date(reservation.startTime),
                  endTime: new Date(reservation.endTime),
                }) as Reservation
            )
          )
        }
      } catch (error) {
        console.error('Failed to load cast reservations:', error)
        if (!ignore) {
          toast({
            title: 'エラー',
            description: '予約情報の取得に失敗しました',
            variant: 'destructive',
          })
        }
      }
    }
    void fetchReservations()

    return () => {
      ignore = true
    }
  }, [cast.id, currentStore.id, toast])

  const upcomingReservations = useMemo(() => {
    const now = new Date()
    return reservations
      .filter((reservation) => reservation.startTime.getTime() >= now.getTime())
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
  }, [reservations])

  const fetchSchedule = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        castId: cast.id,
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
        storeId: currentStore.id,
      })

      const response = await fetch(`/api/cast-schedule?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch schedule: ${response.status}`)
      }

      const payload = await response.json()
      const data = Array.isArray(payload?.data) ? payload.data : payload

      const map: Record<string, CastSchedule> = {}
      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          const date = new Date(item.date)
          const key = format(date, 'yyyy-MM-dd')
          map[key] = {
            id: item.id,
            castId: item.castId,
            date,
            startTime: new Date(item.startTime),
            endTime: new Date(item.endTime),
            isAvailable: item.isAvailable,
            note: item.notes ?? undefined,
            mediaText: item.mediaText ?? undefined,
            status: item.status ?? '出勤予定',
          }
        })
      }

      setScheduleMap(map)
      setScheduleReady(true)
    } catch (error) {
      console.error('Failed to load cast schedule:', error)
      toast({
        title: 'エラー',
        description: '出勤スケジュールの取得に失敗しました',
        variant: 'destructive',
      })
    }
  }, [cast.id, currentStore.id, toast, weekEnd, weekStart])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  const handleScheduleSave = useCallback(
    async (_castId: string, updated: WeeklyScheduleEdit) => {
      try {
        const response = await fetch(
          buildStoreScopedEndpoint('/api/cast-schedule/batch', currentStore.id),
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              castId: cast.id,
              storeId: currentStore.id,
              schedules: buildScheduleBatchPayload(updated, { includeUnset: true }),
            }),
          }
        )
        if (!response.ok) throw new Error('スケジュールの更新に失敗しました')

        await fetchSchedule()

        toast({
          title: 'スケジュールを更新しました',
        })
      } catch (error) {
        console.error('Failed to update schedule:', error)
        toast({
          title: 'エラー',
          description: error instanceof Error ? error.message : 'スケジュールの更新に失敗しました',
          variant: 'destructive',
        })
        throw error
      }
    },
    [cast.id, currentStore.id, fetchSchedule, toast]
  )

  const scheduleDisplay = useMemo(() => {
    return weekDays.map((date) => {
      const key = format(date, 'yyyy-MM-dd')
      const record = scheduleMap[key]
      const isAvailable = record ? record.isAvailable !== false : false
      const isWorking = Boolean(record) && isAvailable
      const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

      const time = record
        ? `${format(record.startTime, 'HH:mm')} - ${format(record.endTime, 'HH:mm')}`
        : '未入力'
      const note = record?.note?.trim().length ? record.note.trim() : null

      return {
        key,
        dayLabel: format(date, 'E', { locale: ja }),
        dateLabel: format(date, 'd'),
        isToday,
        isWorking,
        time,
        note,
      }
    })
  }, [scheduleMap, weekDays])

  const initialWeeklySchedule = useMemo<Record<string, CastScheduleStatus>>(() => {
    const schedule: Record<string, CastScheduleStatus> = {}
    weekDays.forEach((date) => {
      const key = format(date, 'yyyy-MM-dd')
      const record = scheduleMap[key]
      if (!record) return

      const status = (record.status as ScheduleWorkStatus | undefined) ?? '出勤予定'

      schedule[key] = {
        type: status,
        startTime: record.startTime ? format(record.startTime, 'HH:mm') : undefined,
        endTime: record.endTime ? format(record.endTime, 'HH:mm') : undefined,
        note: record.note,
        mediaText: record.mediaText,
        isAvailable: record.isAvailable ?? true,
      }
    })
    return schedule
  }, [scheduleMap, weekDays])

  // 予約データをダイアログ用に変換
  const convertToReservationData = (reservation: Reservation): ReservationData | null => {
    if (!reservation) return null
    return mapReservationToReservationData(reservation, { casts: [cast] })
  }

  const handleReservationSave = useCallback(
    async (reservationId: string, payload: ReservationSavePayload): Promise<void> => {
      const currentReservation = reservations.find(
        (reservation) => reservation.id === reservationId
      )
      if (!currentReservation) {
        throw new Error('対象の予約が見つかりません。')
      }

      const updated = await reservationRepository.update(reservationId, payload)
      const normalizedUpdated = {
        ...currentReservation,
        ...updated,
        startTime: new Date(updated.startTime),
        endTime: new Date(updated.endTime),
        updatedAt: new Date(updated.updatedAt),
      } as Reservation

      setReservations((current) =>
        normalizedUpdated.status === 'cancelled'
          ? current.filter((reservation) => reservation.id !== reservationId)
          : current.map((reservation) =>
              reservation.id === reservationId ? normalizedUpdated : reservation
            )
      )
      setSelectedReservation(normalizedUpdated.status === 'cancelled' ? null : normalizedUpdated)
      toast({ title: '予約を更新しました' })
    },
    [reservationRepository, reservations, toast]
  )

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-6">
      {/* 左側: 基本情報 (2/5) */}
      <div className="space-y-4 lg:col-span-2">
        {/* キャスト基本情報 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                基本情報
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRequestEdit}
                aria-label="プロフィール編集を開く"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">源氏名</span>
                <span className="font-medium">{cast.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">本名</span>
                <span>{cast.nameKana}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">タイプ</span>
                <Badge variant="outline" className="text-xs">
                  {cast.type}
                </Badge>
              </div>
              {cast.loginEmail ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-3 w-3" />
                  <span className="break-all text-xs">{cast.loginEmail}</span>
                </div>
              ) : null}
              {cast.phone ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">電話番号</span>
                  <span>{cast.phone}</span>
                </div>
              ) : null}
              {cast.blogWidget ? (
                <div>
                  <span className="text-gray-600">ブログウィジェット</span>
                  <p className="mt-1 break-all text-xs">{cast.blogWidget}</p>
                </div>
              ) : null}
              {cast.snsAccount ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">SNSアカウント</span>
                  <span>{cast.snsAccount}</span>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* 指名設定 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5" />
              指名設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="netReservation" className="text-sm">
                ネット予約
              </Label>
              <Switch
                id="netReservation"
                checked={cast.netReservation}
                onCheckedChange={(checked) => void onUpdate({ netReservation: checked })}
              />
            </div>
            <Separator />
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">特別指名料</span>
                <span className="font-medium">
                  {cast.specialDesignationFee ? `${cast.specialDesignationFee}円` : '未設定'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">パネル指名ランク</span>
                <Badge variant="secondary" className="text-xs">
                  {cast.panelDesignationRank || 0}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">本指名ランク</span>
                <Badge variant="secondary" className="text-xs">
                  {cast.regularDesignationRank || 0}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 右側: スケジュール・予約情報 (3/5) */}
      <div className="space-y-4 lg:col-span-3">
        {/* 今週のスケジュール */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                今週のスケジュール
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                disabled={!scheduleReady}
                onClick={() => setScheduleDialogOpen(true)}
              >
                <Edit className="mr-2 h-4 w-4" />
                編集
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {scheduleDisplay.map((item) => (
                <div
                  key={item.key}
                  className={`rounded-lg border p-1 text-center text-xs sm:p-2 ${
                    item.isToday
                      ? 'border-emerald-200 bg-emerald-50'
                      : item.isWorking
                        ? 'border-emerald-100 bg-emerald-50/40'
                        : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{item.dayLabel}</div>
                  <div className="text-xs text-gray-500">{item.dateLabel}</div>
                  <div
                    className={`mt-1 text-xs sm:text-xs ${
                      item.isWorking ? 'text-emerald-700' : 'text-gray-500'
                    }`}
                  >
                    <span className="sm:hidden">{item.time}</span>
                    <span className="hidden sm:inline">{item.time}</span>
                  </div>
                  {item.note && (
                    <div className="mt-1 whitespace-pre-wrap text-xs text-gray-500">
                      {item.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <ScheduleEditDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          castName={cast.name}
          castId={cast.id}
          initialSchedule={initialWeeklySchedule}
          startDate={weekStart}
          onSave={handleScheduleSave}
        />

        {/* 予約状況 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              予約状況
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingReservations.length > 0 ? (
                upcomingReservations.slice(0, 3).map((reservation) => {
                  const normalized = mapReservationToReservationData(reservation, {
                    casts: [cast],
                  })
                  const customerLabel = normalized?.customerName?.trim()
                    ? normalized.customerName
                    : reservation.customerId
                      ? `顧客${reservation.customerId.slice(0, 8)}`
                      : '顧客'
                  const serviceLabel = normalized?.course?.trim()
                    ? normalized.course
                    : reservation.serviceName?.trim() || 'サービス未設定'
                  const today = new Date()
                  const tomorrow = new Date(today)
                  tomorrow.setDate(tomorrow.getDate() + 1)

                  const isToday = reservation.startTime.toDateString() === today.toDateString()
                  const isTomorrow =
                    reservation.startTime.toDateString() === tomorrow.toDateString()

                  return (
                    <div
                      key={reservation.id}
                      className={`cursor-pointer rounded-lg border p-3 transition-all hover:shadow-md ${
                        isToday
                          ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                          : isTomorrow
                            ? 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                            : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedReservation(reservation)}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <Badge
                          className={isToday ? 'bg-emerald-600' : isTomorrow ? 'bg-blue-600' : ''}
                          variant={!isToday && !isTomorrow ? 'outline' : 'default'}
                        >
                          {isToday
                            ? '今日'
                            : isTomorrow
                              ? '明日'
                              : format(reservation.startTime, 'M/d')}
                        </Badge>
                        <span className="font-medium">{customerLabel}</span>
                        <Badge variant="outline" className="text-xs">
                          {normalized?.status === 'confirmed'
                            ? '確定'
                            : normalized?.status === 'pending'
                              ? '仮予約'
                              : '修正可能'}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-gray-700">
                        <div className="font-medium">
                          {format(reservation.startTime, 'HH:mm')} -{' '}
                          {format(reservation.endTime, 'HH:mm')}
                        </div>
                        <div>{serviceLabel}</div>
                        <div
                          className={`font-semibold ${isToday ? 'text-emerald-700' : isTomorrow ? 'text-blue-700' : ''}`}
                        >
                          {(normalized?.totalPayment ?? reservation.price).toLocaleString()}円
                        </div>
                      </div>
                      <div className="mt-2 flex gap-1">
                        <Badge
                          variant={normalized?.status === 'confirmed' ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {normalized?.status === 'confirmed' ? '確認済み' : '要確認'}
                        </Badge>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <CalendarDays className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                  <p className="mb-2 text-lg font-medium">今後の予約はありません</p>
                  <p className="text-sm">直近の予約が入るとここに表示されます。</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 予約詳細ダイアログ */}
      <ReservationDialog
        open={!!selectedReservation}
        onOpenChange={(open) => !open && setSelectedReservation(null)}
        reservation={selectedReservation ? convertToReservationData(selectedReservation) : null}
        onSave={handleReservationSave}
      />
    </div>
  )
}

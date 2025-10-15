'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Calendar,
  MapPin,
  CreditCard,
  Edit,
  X,
  Check,
  Phone,
  User,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { differenceInMinutes, addMinutes, format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ModificationHistoryTable } from '@/components/reservation/modification-history-table'
import { getModificationHistory, getModificationAlerts } from '@/lib/modification-history/data'
import { ReservationData, ReservationUpdatePayload } from '@/lib/types/reservation'
import { cn } from '@/lib/utils'
import { Cast } from '@/lib/cast/types'
import { normalizeCastList } from '@/lib/cast/mapper'
import { useSession } from 'next-auth/react'

type EditFormState = {
  date: string
  startTime: string
  castId: string
  storeMemo: string
  notes: string
}

const statusColorMap: Record<string, string> = {
  confirmed: 'bg-emerald-600',
  modifiable: 'bg-orange-500',
  pending: 'bg-amber-500',
  tentative: 'bg-amber-500',
  cancelled: 'bg-red-500',
  completed: 'bg-blue-500',
}

const statusTextMap: Record<string, string> = {
  confirmed: '確定済',
  pending: '仮予約',
  tentative: '仮予約',
  cancelled: 'キャンセル',
  modifiable: '修正可能',
  completed: '完了',
}

function formatRemainingTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatCurrency(amount: number | undefined) {
  if (typeof amount !== 'number') return '¥0'
  return `¥${amount.toLocaleString()}`
}

interface ReservationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservation: ReservationData | null | undefined
  onSave?: (reservationId: string, payload: ReservationUpdatePayload) => Promise<void> | void
  casts?: Cast[]
}

export function ReservationDialog({
  open,
  onOpenChange,
  reservation,
  onSave,
  casts,
}: ReservationDialogProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'history'>('overview')
  const [isEditMode, setIsEditMode] = useState(false)
  const [formState, setFormState] = useState<EditFormState>({
    date: '',
    startTime: '',
    castId: '',
    storeMemo: '',
    notes: '',
  })
  const [castOptions, setCastOptions] = useState<Cast[]>(casts ?? [])
  const [isLoadingCasts, setIsLoadingCasts] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [remainingTime, setRemainingTime] = useState<number | null>(null)
  const { data: session } = useSession()
  const isGeneralStaff = session?.user?.adminRole === 'staff'

  const modificationHistory = reservation ? getModificationHistory(reservation.id) : []
  const modificationAlerts = reservation ? getModificationAlerts(reservation.id) : []

  const reservationDurationMinutes = useMemo(() => {
    if (!reservation) return 0
    const diff = differenceInMinutes(reservation.endTime, reservation.startTime)
    return diff > 0 ? diff : 60
  }, [reservation])

  useEffect(() => {
    if (reservation) {
      setFormState({
        date: format(reservation.startTime, 'yyyy-MM-dd'),
        startTime: format(reservation.startTime, 'HH:mm'),
        castId: reservation.staffId || '',
        storeMemo: reservation.storeMemo || '',
        notes: reservation.notes || '',
      })
      setValidationError(null)
    }
  }, [reservation])

  useEffect(() => {
    if (casts && casts.length > 0) {
      setCastOptions(casts)
    }
  }, [casts])

  useEffect(() => {
    if (!open) return
    if (castOptions.length > 0) return

    let ignore = false
    const loadCasts = async () => {
      setIsLoadingCasts(true)
      try {
        const response = await fetch('/api/cast', {
          cache: 'no-store',
          credentials: 'include',
        })
        if (!response.ok) {
          throw new Error(`Failed to fetch casts: ${response.status}`)
        }
        const payload = await response.json()
        if (!ignore) {
          setCastOptions(normalizeCastList(payload))
        }
      } catch (error) {
        console.error(error)
      } finally {
        if (!ignore) {
          setIsLoadingCasts(false)
        }
      }
    }

    loadCasts()
    return () => {
      ignore = true
    }
  }, [open, castOptions.length])

  useEffect(() => {
    if (!reservation?.modifiableUntil) {
      setRemainingTime(null)
      return
    }

    const updateTimer = () => {
      const diffMs = new Date(reservation.modifiableUntil!).getTime() - Date.now()
      if (diffMs <= 0) {
        setRemainingTime(null)
      } else {
        setRemainingTime(Math.floor(diffMs / 1000))
      }
    }

    updateTimer()
    const intervalId = window.setInterval(updateTimer, 1000)

    return () => window.clearInterval(intervalId)
  }, [reservation?.modifiableUntil])

  const activeCastId = formState.castId || reservation?.staffId || ''

  const selectedCast = useMemo(
    () => castOptions.find((cast) => cast.id === activeCastId),
    [castOptions, activeCastId]
  )

  const computedEndTime = useMemo(() => {
    if (!formState.date || !formState.startTime) return ''
    const start = new Date(`${formState.date}T${formState.startTime}:00`)
    if (Number.isNaN(start.getTime())) return ''
    const end = addMinutes(start, reservationDurationMinutes)
    return format(end, 'HH:mm')
  }, [formState.date, formState.startTime, reservationDurationMinutes])

  const optionList = useMemo(() => {
    if (!reservation?.options) return []
    return Object.entries(reservation.options)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key)
  }, [reservation?.options])

  if (!reservation) {
    return null
  }

  const statusColor = statusColorMap[reservation.status || ''] || 'bg-gray-500'
  const statusLabel = reservation.bookingStatus || statusTextMap[reservation.status || ''] || '予約'

  const handleEnterEditMode = () => {
    if (!reservation) return
    setIsEditMode(true)
  }

  const resetForm = () => {
    if (!reservation) return
    setFormState({
      date: format(reservation.startTime, 'yyyy-MM-dd'),
      startTime: format(reservation.startTime, 'HH:mm'),
      castId: reservation.staffId || '',
      storeMemo: reservation.storeMemo || '',
      notes: reservation.notes || '',
    })
  }

  const handleCancelEdit = () => {
    resetForm()
    setValidationError(null)
    setIsEditMode(false)
  }

  const handleSaveChanges = async () => {
    if (!reservation || !onSave) {
      setIsEditMode(false)
      return
    }

    if (!formState.date || !formState.startTime) {
      setValidationError('予約日と開始時間を入力してください。')
      return
    }

    const start = new Date(`${formState.date}T${formState.startTime}:00`)
    if (Number.isNaN(start.getTime())) {
      setValidationError('日時の形式が正しくありません。')
      return
    }

    const castId = formState.castId || reservation.staffId || ''
    if (!castId) {
      setValidationError('担当キャストを選択してください。')
      return
    }

    const end = addMinutes(start, reservationDurationMinutes)

    if (selectedCast?.workStart && selectedCast?.workEnd) {
      const workStart = new Date(start)
      workStart.setHours(selectedCast.workStart.getHours(), selectedCast.workStart.getMinutes(), 0, 0)
      const workEnd = new Date(start)
      workEnd.setHours(selectedCast.workEnd.getHours(), selectedCast.workEnd.getMinutes(), 0, 0)

      if (start < workStart || end > workEnd) {
        setValidationError('選択した時間帯は担当キャストの出勤時間外です。')
        return
      }
    }

    setValidationError(null)
    setIsSaving(true)

    try {
      await onSave(reservation.id, {
        startTime: start,
        endTime: end,
        castId,
        storeMemo: formState.storeMemo,
        notes: formState.notes,
      })
      setIsEditMode(false)
    } catch (error) {
      if (error instanceof Error) {
        setValidationError(error.message)
      } else {
        setValidationError('予約の更新に失敗しました。')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!next) {
        setIsEditMode(false)
        resetForm()
      }
      onOpenChange(next)
    }}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
        <DialogTitle className="sr-only">{reservation.customerName} 様の予約詳細</DialogTitle>
        <DialogDescription className="sr-only">
          予約の詳細情報を表示し、必要に応じて編集できます。
        </DialogDescription>

        <div className="sticky top-0 z-20 flex items-start justify-between border-b bg-white p-4">
          <div>
            <div className="flex items-center gap-3">
              <div className={cn('h-3 w-3 rounded-full', statusColor)} />
              <h2 className="text-xl font-semibold">{reservation.customerName} 様</h2>
              <Badge variant="outline" className="text-xs">
                {statusLabel}
              </Badge>
              {reservation.customerType && (
                <Badge variant="secondary" className="text-xs">
                  {reservation.customerType}
                </Badge>
              )}
            </div>
            {remainingTime !== null && (
              <p className="mt-2 flex items-center gap-1 text-xs text-orange-600">
                <AlertCircle className="h-3 w-3" />
                修正可能残り時間: {formatRemainingTime(remainingTime)}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              予約ID: {reservation.id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  キャンセル
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  保存
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={handleEnterEditMode}>
                  <Edit className="mr-2 h-4 w-4" />
                  編集
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                  <X className="h-4 w-4" />
                  <span className="sr-only">閉じる</span>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {validationError && (
            <div className="border-b bg-red-50 px-4 py-3">
              <Alert variant="destructive">
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
            <div className="border-b bg-white px-4 pt-3">
              <TabsList className="grid w-full grid-cols-3 md:w-auto md:grid-cols-3">
                <TabsTrigger value="overview">概要</TabsTrigger>
                <TabsTrigger value="details">詳細</TabsTrigger>
                <TabsTrigger value="history" className="relative">
                  履歴
                  {modificationAlerts.length > 0 && (
                    <Badge variant="destructive" className="ml-2 h-4 px-1.5 py-0 text-[10px]">
                      {modificationAlerts.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-6 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">日時</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {isEditMode ? (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="reservation-date">日付</Label>
                        <Input
                          id="reservation-date"
                          type="date"
                          value={formState.date}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, date: event.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="reservation-start-time">開始時間</Label>
                        <Input
                          id="reservation-start-time"
                          type="time"
                          value={formState.startTime}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, startTime: event.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="reservation-end-time">終了時間</Label>
                        <Input id="reservation-end-time" type="time" value={computedEndTime} readOnly />
                        <p className="mt-1 text-xs text-muted-foreground">
                          施術時間: {reservationDurationMinutes}分
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-lg font-semibold">
                        {format(reservation.startTime, 'yyyy年MM月dd日(E)', { locale: ja })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(reservation.startTime, 'HH:mm')} - {format(reservation.endTime, 'HH:mm')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">場所</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="font-medium">{reservation.location || '未設定'}</div>
                  <div className="text-muted-foreground">
                    {reservation.prefecture} / {reservation.district}
                  </div>
                  {reservation.specificLocation && (
                    <div className="rounded-md bg-muted px-3 py-2 text-xs">{reservation.specificLocation}</div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">料金</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {isGeneralStaff ? (
                    <p className="text-sm text-muted-foreground">売上情報は表示できません。</p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between font-medium">
                        <span>総額</span>
                        <span>{formatCurrency(reservation.totalPayment)}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>支払い方法</span>
                        <span>{reservation.paymentMethod || '未設定'}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>割引</span>
                        <span>{reservation.discount || 'なし'}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>交通費</span>
                        <span>{formatCurrency(reservation.transportationFee)}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>追加料金</span>
                        <span>{formatCurrency(reservation.additionalFee)}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>店舗取り分</span>
                        <span>{formatCurrency(reservation.storeRevenue)}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>キャスト取り分</span>
                        <span>{formatCurrency(reservation.staffRevenue)}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">担当キャスト</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {isEditMode ? (
                    <>
                      <Label htmlFor="reservation-cast">キャスト</Label>
                      <Select
                        value={activeCastId}
                        onValueChange={(value) =>
                          setFormState((prev) => ({
                            ...prev,
                            castId: value,
                          }))
                        }
                      >
                        <SelectTrigger id="reservation-cast">
                          <SelectValue placeholder={isLoadingCasts ? '読み込み中...' : 'キャストを選択'} />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingCasts ? (
                            <div className="px-3 py-2 text-xs text-muted-foreground">読み込み中...</div>
                          ) : (
                            castOptions.map((cast) => (
                              <SelectItem key={cast.id} value={cast.id}>
                                {cast.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {selectedCast?.workStart && selectedCast?.workEnd && (
                        <p className="text-xs text-muted-foreground">
                          勤務時間: {format(selectedCast.workStart, 'HH:mm')} -{' '}
                          {format(selectedCast.workEnd, 'HH:mm')}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{reservation.staff}</div>
                        {selectedCast?.workStatus && (
                          <Badge variant="secondary" className="text-xs">
                            {selectedCast.workStatus}
                          </Badge>
                        )}
                      </div>
                      {selectedCast?.workStart && selectedCast?.workEnd && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(selectedCast.workStart, 'HH:mm')} - {format(selectedCast.workEnd, 'HH:mm')}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">連絡先</CardTitle>
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <div className="text-muted-foreground">電話番号</div>
                    <div className="font-medium">{reservation.phoneNumber || '未登録'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">メール</div>
                    <div className="font-medium">{reservation.email || '未登録'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">保有ポイント</div>
                    <div className="font-medium">{reservation.points.toLocaleString()} pt</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">店舗メモ</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isEditMode ? (
                    <Textarea
                      value={formState.storeMemo}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, storeMemo: event.target.value }))
                      }
                      rows={4}
                    />
                  ) : reservation.storeMemo ? (
                    <p className="text-sm">{reservation.storeMemo}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">店舗メモは登録されていません。</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-6 p-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">予約詳細</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <div className="text-muted-foreground">コース</div>
                  <div className="font-medium">{reservation.course || '未設定'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">指名</div>
                  <div className="font-medium">
                    {reservation.designation || 'なし'}{' '}
                    {reservation.designationFee && `(${reservation.designationFee})`}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">無料延長</div>
                  <div className="font-medium">{reservation.freeExtension || '0'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">マーケティング経路</div>
                  <div className="font-medium">{reservation.marketingChannel || '未設定'}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-muted-foreground">オプション</div>
                  {optionList.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {optionList.map((option) => (
                        <Badge key={option} variant="secondary" className="text-xs">
                          {option}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="font-medium">なし</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">詳細メモ</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditMode ? (
                  <Textarea
                    value={formState.notes}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    rows={5}
                    placeholder="予約に関する詳細メモを入力してください"
                  />
                ) : reservation.notes ? (
                  <p className="text-sm whitespace-pre-wrap">{reservation.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">詳細メモは登録されていません。</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">確認状況</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <div className="text-muted-foreground">スタッフ確認</div>
                  <div className="font-medium">{reservation.staffConfirmation}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">顧客確認</div>
                  <div className="font-medium">{reservation.customerConfirmation}</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="p-4">
            <ModificationHistoryTable
              modifications={modificationHistory}
              alerts={modificationAlerts}
            />
          </TabsContent>
        </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

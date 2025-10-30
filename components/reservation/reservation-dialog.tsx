'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
  ChevronDown,
  CheckCircle2,
  Ban,
  ClipboardList,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { differenceInMinutes, addMinutes, format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ModificationHistoryTable } from '@/components/reservation/modification-history-table'
import { getModificationHistory, getModificationAlerts } from '@/lib/modification-history/data'
import { ReservationData, ReservationUpdatePayload } from '@/lib/types/reservation'
import { cn } from '@/lib/utils'
import { Cast } from '@/lib/cast/types'
import { normalizeCastList } from '@/lib/cast/mapper'
import { useSession } from 'next-auth/react'
import {
  DEFAULT_DESIGNATION_FEES,
  findDesignationFeeByName,
  findDesignationFeeByPrice,
} from '@/lib/designation/fees'
import { getDesignationFees } from '@/lib/designation/data'
import type { DesignationFee } from '@/lib/designation/types'
import { hasPermission } from '@/lib/auth/permissions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { MARKETING_CHANNELS, PAYMENT_METHODS, ReservationStatus } from '@/lib/constants'
import { toast } from '@/hooks/use-toast'

type EditFormState = {
  date: string
  startTime: string
  castId: string
  designationId: string
  storeMemo: string
  notes: string
  paymentMethod: string
  marketingChannel: string
  transportationFee: number
  additionalFee: number
  designationFee: number
  price: number
  areaId: string | null
  stationId: string | null
  locationMemo: string
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

const STATUS_OPTIONS: Array<{
  value: ReservationStatus
  label: string
  description: string
}> = [
  {
    value: 'pending',
    label: '仮予約',
    description: '顧客からの問い合わせ段階。スケジュールを押さえておきたい場合に使用します。',
  },
  {
    value: 'confirmed',
    label: '確定',
    description: '顧客・スタッフ双方の確認が取れた状態です。',
  },
  {
    value: 'modifiable',
    label: '修正待ち',
    description: '詳細調整が残っている予約に設定してください。完了後に再度ステータスを更新します。',
  },
  {
    value: 'cancelled',
    label: 'キャンセル',
    description: '顧客キャンセル・トラブル等で予約を取り消す場合に使用します。',
  },
  {
    value: 'completed',
    label: '対応済み',
    description: '施術が完了しレポート作成などのフォローのみ残っている際に使用します。',
  },
]

type QuickAction = {
  target: ReservationStatus | 'completed'
  label: string
  description: string
  icon: LucideIcon
  isVisible: (status: ReservationStatus | 'completed') => boolean
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    target: 'confirmed',
    label: '予約を確定',
    description: '顧客と確定したらこちらを選択しておくと管理しやすくなります。',
    icon: CheckCircle2,
    isVisible: (status) => status === 'pending' || status === 'modifiable',
  },
  {
    target: 'modifiable',
    label: '詳細調整中にする',
    description: '追加ヒアリングや調整が必要な場合に使用します。',
    icon: ClipboardList,
    isVisible: (status) => status === 'pending' || status === 'confirmed',
  },
  {
    target: 'cancelled',
    label: 'キャンセルにする',
    description: '顧客都合・スタッフ都合などでキャンセルする際に設定します。',
    icon: Ban,
    isVisible: (status) => status !== 'cancelled',
  },
  {
    target: 'completed',
    label: '対応済みにする',
    description: '来店・施術が完了したらステータスを完了に更新します。',
    icon: Check,
    isVisible: (status) => status === 'confirmed' || status === 'modifiable',
  },
]

const STATUS_META = STATUS_OPTIONS.reduce<Record<string, { label: string; description: string }>>(
  (acc, item) => {
    acc[item.value] = { label: item.label, description: item.description }
    return acc
  },
  {}
)

function StatusBadge({ status }: { status: ReservationStatus | 'completed' }) {
  const color = statusColorMap[status] ?? 'bg-gray-500'
  const label = statusTextMap[status] ?? status
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-sm',
        color
      )}
    >
      {label}
    </span>
  )
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
  const [status, setStatus] = useState<ReservationStatus | 'completed'>(
    ((reservation?.status as ReservationStatus) ?? 'pending') as ReservationStatus
  )
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [formState, setFormState] = useState<EditFormState>({
    date: '',
    startTime: '',
    castId: '',
    designationId: '',
    storeMemo: '',
    notes: '',
    paymentMethod: '現金',
    marketingChannel: 'WEB',
    transportationFee: 0,
    additionalFee: 0,
    designationFee: 0,
    price: 0,
    areaId: null,
    stationId: null,
    locationMemo: '',
  })
  const [castOptions, setCastOptions] = useState<Cast[]>(casts ?? [])
  const [isLoadingCasts, setIsLoadingCasts] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [remainingTime, setRemainingTime] = useState<number | null>(null)
  const { data: session } = useSession()
  const canViewFinancialDetails = hasPermission(
    session?.user?.permissions ?? [],
    'analytics:read'
  )

  const modificationHistory = reservation ? getModificationHistory(reservation.id) : []
  const modificationAlerts = reservation ? getModificationAlerts(reservation.id) : []

  const reservationDurationMinutes = useMemo(() => {
    if (!reservation) return 0
    const diff = differenceInMinutes(reservation.endTime, reservation.startTime)
    return diff > 0 ? diff : 60
  }, [reservation])

  const [designationOptions, setDesignationOptions] =
    useState<DesignationFee[]>(DEFAULT_DESIGNATION_FEES)

  useEffect(() => {
    let ignore = false

    const loadDesignationFees = async () => {
      try {
        const fees = await getDesignationFees({ includeInactive: true })
        if (!ignore) {
          setDesignationOptions(fees)
        }
      } catch (error) {
        console.error('Failed to load designation fees:', error)
        if (!ignore) {
          setDesignationOptions(DEFAULT_DESIGNATION_FEES)
        }
      }
    }

    loadDesignationFees()
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (reservation?.status) {
      setStatus(reservation.status as ReservationStatus)
    }
  }, [reservation?.status])

  const reservationDesignation = useMemo(() => {
    if (!reservation) return undefined
    return (
      findDesignationFeeByName(reservation.designation, designationOptions) ||
      findDesignationFeeByPrice(reservation.designationFee, designationOptions)
    )
  }, [reservation, designationOptions])

  const selectableDesignationOptions = useMemo(() => {
    // Filter to show only active fees
    const activeOptions = designationOptions.filter((fee) => fee.isActive)

    // If editing an existing reservation with an inactive designation,
    // include it in the options so it can still be selected
    const currentDesignation = reservationDesignation
    if (
      currentDesignation &&
      !currentDesignation.isActive &&
      !activeOptions.find((fee) => fee.id === currentDesignation.id)
    ) {
      return [...activeOptions, currentDesignation].sort((a, b) => a.sortOrder - b.sortOrder)
    }

    return activeOptions
  }, [designationOptions, reservationDesignation])

  useEffect(() => {
    if (reservation?.status) {
      setStatus(reservation.status as ReservationStatus)
    }
  }, [reservation?.status])

  useEffect(() => {
    if (reservation) {
      setFormState({
        date: format(reservation.startTime, 'yyyy-MM-dd'),
        startTime: format(reservation.startTime, 'HH:mm'),
        castId: reservation.staffId || '',
        designationId: reservationDesignation?.id || '',
        storeMemo: reservation.storeMemo || '',
        notes: reservation.notes || '',
        paymentMethod: reservation.paymentMethod || '現金',
        marketingChannel: reservation.marketingChannel || 'WEB',
        transportationFee: reservation.transportationFee ?? 0,
        additionalFee: reservation.additionalFee ?? 0,
        designationFee: reservation.designationFee ?? 0,
        price: reservation.totalPayment ?? reservation.price ?? 0,
        areaId: reservation.areaId ?? null,
        stationId: reservation.stationId ?? null,
        locationMemo: reservation.locationMemo ?? '',
      })
      setValidationError(null)
    }
  }, [reservation, reservationDesignation])

  const handleStatusChange = useCallback(
    async (nextStatus: ReservationStatus | 'completed') => {
      if (!reservation) {
        return
      }
      if (!onSave || status === nextStatus) {
        setStatus(nextStatus)
        return
      }

      const effectiveCastId =
        formState.castId || reservation.staffId || (reservation as any).castId || ''
      if (!effectiveCastId) {
        toast({
          title: '担当キャスト未設定',
          description: 'ステータスを変更する前に担当キャストを選択してください。',
          variant: 'destructive',
        })
        return
      }

      setStatusUpdating(true)
      try {
        await onSave(reservation.id, {
          castId: effectiveCastId,
          startTime: reservation.startTime,
          endTime: reservation.endTime,
          status: nextStatus as ReservationStatus,
        })
        setStatus(nextStatus)
        toast({
          title: 'ステータスを更新しました',
          description: STATUS_META[nextStatus]?.label ?? nextStatus,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'ステータスの更新に失敗しました。'
        toast({
          title: '更新に失敗しました',
          description: message,
          variant: 'destructive',
        })
      } finally {
        setStatusUpdating(false)
      }
    },
    [formState.castId, onSave, reservation, status]
  )

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

  const paymentMethodOptions = useMemo(() => Object.values(PAYMENT_METHODS), [])

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

  const statusMeta = STATUS_META[status] ?? {
    label: statusTextMap[status] ?? status,
    description: '',
  }
  const visibleQuickActions = useMemo(
    () => QUICK_ACTIONS.filter((action) => action.isVisible(status)),
    [status]
  )

  if (!reservation) {
    return null
  }

  const rawDesignationId =
    formState.designationId || reservationDesignation?.id || ''

  const selectedDesignation =
    rawDesignationId && rawDesignationId.length > 0
      ? designationOptions.find((fee) => fee.id === rawDesignationId)
      : undefined

  const designationSelectValue = rawDesignationId && rawDesignationId.length > 0 ? rawDesignationId : 'none'
  const designationForDisplay = selectedDesignation || reservationDesignation

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
      designationId: reservationDesignation?.id || '',
      storeMemo: reservation.storeMemo || '',
      notes: reservation.notes || '',
      paymentMethod: reservation.paymentMethod || '現金',
      marketingChannel: reservation.marketingChannel || 'WEB',
      transportationFee: reservation.transportationFee ?? 0,
      additionalFee: reservation.additionalFee ?? 0,
      designationFee: reservation.designationFee ?? 0,
      price: reservation.totalPayment ?? reservation.price ?? 0,
      areaId: reservation.areaId ?? null,
      stationId: reservation.stationId ?? null,
      locationMemo: reservation.locationMemo ?? '',
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

    const designationIdToSave = formState.designationId || reservationDesignation?.id || ''
    const designationForSave =
      designationIdToSave && designationIdToSave.length > 0
        ? designationOptions.find((fee) => fee.id === designationIdToSave)
        : undefined

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
        designationType: designationForSave?.name,
        designationFee: designationForSave?.price ?? formState.designationFee,
        transportationFee: formState.transportationFee,
        additionalFee: formState.additionalFee,
        paymentMethod: formState.paymentMethod,
        marketingChannel: formState.marketingChannel,
        areaId: formState.areaId ?? null,
        stationId: formState.stationId ?? null,
        locationMemo: formState.locationMemo,
        price: formState.price,
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

        <div className="sticky top-0 z-20 border-b bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{reservation.customerName} 様</h2>
                <StatusBadge status={status} />
                {reservation.customerType && (
                  <Badge variant="secondary" className="text-xs">
                    {reservation.customerType}
                  </Badge>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>予約ID: {reservation.id}</span>
                {remainingTime !== null && (
                  <span className="inline-flex items-center gap-1 text-orange-600">
                    <AlertCircle className="h-3 w-3" />
                    修正可能残り時間: {formatRemainingTime(remainingTime)}
                  </span>
                )}
              </div>
              {statusMeta.description && (
                <p className="mt-1 text-xs text-muted-foreground">{statusMeta.description}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={statusUpdating || !onSave}
                    className="flex items-center gap-2"
                  >
                    ステータス変更
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-72">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    ステータスを選択
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {STATUS_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      disabled={statusUpdating || status === option.value}
                      onSelect={() => handleStatusChange(option.value as ReservationStatus)}
                      className="flex flex-col items-start gap-1 py-2"
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="text-sm font-medium">{option.label}</span>
                        {status === option.value && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-xs leading-snug text-muted-foreground">
                        {option.description}
                      </p>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
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
          {visibleQuickActions.length > 0 && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {visibleQuickActions.map((action) => {
                const Icon = action.icon
                return (
                  <div
                    key={action.target}
                    className="flex flex-col gap-1 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/40 p-3"
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      className="justify-start gap-2"
                      disabled={statusUpdating || isEditMode || !onSave}
                      onClick={() => handleStatusChange(action.target)}
                    >
                      <Icon className="h-4 w-4" />
                      {action.label}
                    </Button>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                )
              })}
            </div>
          )}
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
                <CardContent className="space-y-3 text-sm">
                  {!canViewFinancialDetails ? (
                    <p className="text-sm text-muted-foreground">売上情報は表示できません。</p>
                  ) : isEditMode ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="reservation-designation">指名設定</Label>
                        <Select
                          value={designationSelectValue}
                          onValueChange={(value) => {
                            const fee =
                              value === 'none'
                                ? undefined
                                : selectableDesignationOptions.find((item) => item.id === value)
                            setFormState((prev) => ({
                              ...prev,
                              designationId: value === 'none' ? '' : value,
                              designationFee: fee?.price ?? 0,
                            }))
                          }}
                        >
                          <SelectTrigger id="reservation-designation">
                            <SelectValue placeholder="指名を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">指名なし</SelectItem>
                            {selectableDesignationOptions.map((fee) => (
                              <SelectItem key={fee.id} value={fee.id}>
                                {fee.name}（¥{fee.price.toLocaleString()}）
                                {!fee.isActive && ' (非表示)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="reservation-total">総額</Label>
                        <Input
                          id="reservation-total"
                          type="number"
                          value={formState.price}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              price: Number(event.target.value || 0),
                            }))
                          }
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="reservation-transportation">交通費</Label>
                          <Input
                            id="reservation-transportation"
                            type="number"
                            value={formState.transportationFee}
                            onChange={(event) =>
                              setFormState((prev) => ({
                                ...prev,
                                transportationFee: Number(event.target.value || 0),
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="reservation-additional">追加料金</Label>
                          <Input
                            id="reservation-additional"
                            type="number"
                            value={formState.additionalFee}
                            onChange={(event) =>
                              setFormState((prev) => ({
                                ...prev,
                                additionalFee: Number(event.target.value || 0),
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="reservation-payment">支払い方法</Label>
                          <Select
                            value={formState.paymentMethod}
                            onValueChange={(value) =>
                              setFormState((prev) => ({ ...prev, paymentMethod: value }))
                            }
                          >
                            <SelectTrigger id="reservation-payment">
                              <SelectValue placeholder="支払い方法を選択" />
                            </SelectTrigger>
                            <SelectContent>
                              {paymentMethodOptions.map((method) => (
                                <SelectItem key={method} value={method}>
                                  {method}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="reservation-channel">集客チャネル</Label>
                          <Select
                            value={formState.marketingChannel}
                            onValueChange={(value) =>
                              setFormState((prev) => ({ ...prev, marketingChannel: value }))
                            }
                          >
                            <SelectTrigger id="reservation-channel">
                              <SelectValue placeholder="チャネルを選択" />
                            </SelectTrigger>
                            <SelectContent>
                              {MARKETING_CHANNELS.map((channel) => (
                                <SelectItem key={channel} value={channel}>
                                  {channel}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between font-medium">
                        <span>総額</span>
                        <span>{formatCurrency(reservation.totalPayment)}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>指名料</span>
                        {selectedDesignation ? (
                          <span>
                            ¥{selectedDesignation.price.toLocaleString()} （店舗 ¥
                            {selectedDesignation.storeShare.toLocaleString()} / キャスト ¥
                            {selectedDesignation.castShare.toLocaleString()}）
                          </span>
                        ) : (
                          <span>なし</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>支払い方法</span>
                        <span>{reservation.paymentMethod || '未設定'}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>集客チャネル</span>
                        <span>{reservation.marketingChannel || '未設定'}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>交通費</span>
                        <span>{formatCurrency(reservation.transportationFee)}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>追加料金</span>
                        <span>{formatCurrency(reservation.additionalFee)}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>店舗取り分</span>
                        <span>{formatCurrency(reservation.storeRevenue)}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>キャスト取り分</span>
                        <span>{formatCurrency(reservation.staffRevenue)}</span>
                      </div>
                    </div>
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
                  {designationForDisplay ? (
                    <div className="font-medium">
                      {designationForDisplay.name}{' '}
                      <span className="text-sm text-muted-foreground">
                        （¥{designationForDisplay.price.toLocaleString()} / 店舗 ¥
                        {designationForDisplay.storeShare.toLocaleString()} / キャスト ¥
                        {designationForDisplay.castShare.toLocaleString()}）
                      </span>
                    </div>
                  ) : (
                    <div className="font-medium">なし</div>
                  )}
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

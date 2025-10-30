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
  Info,
  Calculator,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { differenceInMinutes, addMinutes, format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ModificationHistoryTable } from '@/components/reservation/modification-history-table'
import { getModificationHistory, getModificationAlerts } from '@/lib/modification-history/data'
import { ReservationData, ReservationUpdatePayload } from '@/lib/types/reservation'
import { ModificationAlert, ModificationHistory } from '@/lib/types/modification-history'
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
import { usePricing } from '@/hooks/use-pricing'
import { useLocations } from '@/hooks/use-locations'
import { Checkbox } from '@/components/ui/checkbox'
import { useStore } from '@/contexts/store-context'

type EditFormState = {
  date: string
  startTime: string
  castId: string
  courseId: string | null
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
  optionIds: string[]
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

const STATUS_META = STATUS_OPTIONS.reduce<Record<string, { label: string; description: string }>>(
  (acc, item) => {
    acc[item.value] = { label: item.label, description: item.description }
    return acc
  },
  {}
)

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/[^\d.-]/g, '')
    const parsed = Number(normalized)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

function toNullableNumber(value: unknown): number | null {
  const parsed = toNumber(value, Number.NaN)
  return Number.isFinite(parsed) ? parsed : null
}

function formatMinutes(value: number | null | undefined): string {
  if (!Number.isFinite(value ?? Number.NaN) || !value || value <= 0) {
    return '0分'
  }

  const wholeMinutes = Math.round(value)
  const hours = Math.floor(wholeMinutes / 60)
  const minutes = wholeMinutes % 60

  if (hours > 0 && minutes > 0) {
    return `${hours}時間${minutes}分`
  }
  if (hours > 0) {
    return `${hours}時間`
  }
  return `${minutes}分`
}

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
  const { currentStore } = useStore()
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
    courseId: null,
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
    optionIds: [],
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
  const {
    coursePrices,
    courses,
    optionPrices,
    options,
    loading: pricingLoading,
  } = usePricing(currentStore.id)
  const {
    areas,
    stations,
    loading: locationsLoading,
  } = useLocations()

  const [modificationHistory, setModificationHistory] = useState<ModificationHistory[]>([])
  const [modificationAlerts, setModificationAlerts] = useState<ModificationAlert[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [historyReloadToken, setHistoryReloadToken] = useState(0)
  const UNASSIGNED_VALUE = '__unassigned__'

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
        const fees = await getDesignationFees({
          includeInactive: true,
          storeId: currentStore.id,
        })
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
  }, [currentStore.id])

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

  const courseOptions = useMemo(
    () =>
      (coursePrices.length > 0 ? coursePrices : courses).map((course: any) => ({
        id: String(course.id),
        name: course.name,
        duration: toNumber(course.duration, 0),
        price: toNumber(course.price, 0),
        storeShare: toNullableNumber(course.storeShare),
        castShare: toNullableNumber(course.castShare),
      })),
    [coursePrices, courses]
  )

  const optionChoices = useMemo(
    () =>
      (optionPrices.length > 0 ? optionPrices : options).map((option: any) => ({
        id: String(option.id),
        name: option.name,
        price: toNumber(option.price, 0),
        duration: toNumber(option.duration, 0),
        note: option.note ?? option.description ?? '',
        storeShare: toNullableNumber(option.storeShare),
        castShare: toNullableNumber(option.castShare),
      })),
    [optionPrices, options]
  )

  const selectedCourse = useMemo(() => {
    const courseId = formState.courseId || reservation?.serviceId || ''
    return courseOptions.find((course) => course.id === courseId) ?? null
  }, [courseOptions, formState.courseId, reservation?.serviceId])

  const selectedOptionDetails = useMemo(
    () => optionChoices.filter((option) => formState.optionIds.includes(option.id)),
    [optionChoices, formState.optionIds]
  )

  useEffect(() => {
    if (courseOptions.length === 0) {
      return
    }

    setFormState((prev) => {
      const currentCourseId = prev.courseId || reservation?.serviceId || ''
      if (currentCourseId && courseOptions.some((course) => course.id === currentCourseId)) {
        return prev
      }

      const fallbackCourseId = courseOptions[0]?.id ?? ''
      if (!fallbackCourseId || fallbackCourseId === prev.courseId) {
        return prev
      }

      return {
        ...prev,
        courseId: fallbackCourseId,
      }
    })
  }, [courseOptions, reservation?.serviceId])

  const filteredStations = useMemo(() => {
    if (!formState.areaId) {
      return stations
    }
    return stations.filter((station) => station.areaId === formState.areaId)
  }, [stations, formState.areaId])

  useEffect(() => {
    if (!formState.stationId) {
      return
    }
    if (filteredStations.some((station) => station.id === formState.stationId)) {
      return
    }
    setFormState((prev) => ({
      ...prev,
      stationId: null,
    }))
  }, [filteredStations, formState.stationId])

  useEffect(() => {
    if (reservation?.status) {
      setStatus(reservation.status as ReservationStatus)
    }
  }, [reservation?.status])

  useEffect(() => {
    let ignore = false

    const reservationId = reservation?.id
    if (!reservationId) {
      setModificationHistory([])
      setModificationAlerts([])
      return
    }

    const loadHistory = async () => {
      setIsHistoryLoading(true)
      try {
        const [history, alerts] = await Promise.all([
          getModificationHistory(reservationId),
          getModificationAlerts(reservationId),
        ])
        if (!ignore) {
          setModificationHistory(history)
          setModificationAlerts(alerts)
        }
      } catch (error) {
        if (!ignore) {
          toast({
            title: '履歴の取得に失敗しました',
            description:
              error instanceof Error ? error.message : '不明なエラーが発生しました。',
            variant: 'destructive',
          })
        }
      } finally {
        if (!ignore) {
          setIsHistoryLoading(false)
        }
      }
    }

    loadHistory()

    return () => {
      ignore = true
    }
  }, [reservation?.id, historyReloadToken])

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
        setHistoryReloadToken((prev) => prev + 1)
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
        const response = await fetch(
          `/api/cast?storeId=${encodeURIComponent(currentStore.id)}`,
          {
            cache: 'no-store',
            credentials: 'include',
          }
        )
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
  }, [open, castOptions.length, currentStore.id])

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

  const selectedOptionDurationTotal = useMemo(
    () =>
      selectedOptionDetails.reduce(
        (sum, option) => sum + (typeof option.duration === 'number' ? option.duration : 0),
        0
      ),
    [selectedOptionDetails]
  )

  const effectiveDurationMinutes = useMemo(() => {
    const courseDuration = toNumber(selectedCourse?.duration, 0)
    if (courseDuration > 0) {
      return courseDuration + selectedOptionDurationTotal
    }

    const estimatedBase =
      reservationDurationMinutes > 0
        ? reservationDurationMinutes - initialOptionDurationTotal
        : reservationDurationMinutes
    const normalizedBase = estimatedBase > 0 ? estimatedBase : reservationDurationMinutes
    return normalizedBase + selectedOptionDurationTotal
  }, [
    selectedCourse,
    selectedOptionDurationTotal,
    reservationDurationMinutes,
    initialOptionDurationTotal,
  ])

  const computedEndTime = useMemo(() => {
    if (!formState.date || !formState.startTime) return ''
    const start = new Date(`${formState.date}T${formState.startTime}:00`)
    if (Number.isNaN(start.getTime())) return ''
    const end = addMinutes(start, effectiveDurationMinutes)
    return format(end, 'HH:mm')
  }, [formState.date, formState.startTime, effectiveDurationMinutes])

  const initialOptionIdsRaw = useMemo(() => {
    if (!reservation?.options) return []
    return Object.entries(reservation.options)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key)
  }, [reservation?.options])

  const normalizedInitialOptionIds = useMemo(() => {
    if (optionChoices.length === 0) {
      return initialOptionIdsRaw
    }
    return Array.from(
      new Set(
        initialOptionIdsRaw.map((key) => {
          const byId = optionChoices.find((option) => option.id === key)
          if (byId) return byId.id
          const byName = optionChoices.find((option) => option.name === key)
          return byName ? byName.id : key
        })
      )
    )
  }, [initialOptionIdsRaw, optionChoices])

  const initialOptionDurationTotal = useMemo(() => {
    if (normalizedInitialOptionIds.length === 0 || optionChoices.length === 0) {
      return 0
    }

    return normalizedInitialOptionIds.reduce((sum, optionId) => {
      const match = optionChoices.find((option) => option.id === optionId)
      if (!match) {
        return sum
      }
      const duration = typeof match.duration === 'number' ? match.duration : 0
      return sum + duration
    }, 0)
  }, [normalizedInitialOptionIds, optionChoices])

  const initialOptionNames = useMemo(
    () =>
      initialOptionIdsRaw.map((key) => {
        const match = optionChoices.find((option) => option.id === key || option.name === key)
        return match?.name ?? key
      }),
    [initialOptionIdsRaw, optionChoices]
  )

  const displayOptionNames =
    selectedOptionDetails.length > 0
      ? selectedOptionDetails.map((option) => option.name)
      : initialOptionNames

  const originalTotal = useMemo(
    () => toNumber(reservation?.totalPayment ?? reservation?.price, 0),
    [reservation?.price, reservation?.totalPayment]
  )

  const priceBreakdown = useMemo(() => {
    const basePrice = selectedCourse
      ? toNumber(selectedCourse.price, reservation?.price ?? 0)
      : toNumber(reservation?.price, 0)
    const optionTotal = selectedOptionDetails.reduce(
      (sum, option) => sum + toNumber(option.price, 0),
      0
    )
    const transportation = toNumber(formState.transportationFee, 0)
    const additional = toNumber(formState.additionalFee, 0)
    const designation = toNumber(formState.designationFee, 0)
    const total = basePrice + optionTotal + transportation + additional + designation
    return {
      basePrice,
      optionTotal,
      transportation,
      additional,
      designation,
      total,
    }
  }, [
    selectedCourse,
    reservation?.price,
    selectedOptionDetails,
    formState.transportationFee,
    formState.additionalFee,
    formState.designationFee,
  ])

  const priceDelta = priceBreakdown.total - originalTotal
  const durationDelta = effectiveDurationMinutes - reservationDurationMinutes

useEffect(() => {
  if (reservation) {
    setFormState({
      date: format(reservation.startTime, 'yyyy-MM-dd'),
      startTime: format(reservation.startTime, 'HH:mm'),
      castId: reservation.staffId || '',
      courseId: reservation.serviceId || null,
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
      optionIds: normalizedInitialOptionIds,
      locationMemo: reservation.locationMemo ?? '',
    })
    setValidationError(null)
  }
}, [reservation, reservationDesignation, normalizedInitialOptionIds])

useEffect(() => {
  if (!isEditMode) return
  setFormState((prev) => {
    if (!Number.isFinite(priceBreakdown.total) || prev.price === priceBreakdown.total) {
      return prev
    }
    return {
      ...prev,
      price: priceBreakdown.total,
    }
  })
}, [isEditMode, priceBreakdown.total])

  const statusMeta = STATUS_META[status] ?? {
    label: statusTextMap[status] ?? status,
    description: '',
  }

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
      courseId: reservation.serviceId || null,
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
      optionIds: normalizedInitialOptionIds,
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

    const durationMinutes = effectiveDurationMinutes > 0 ? effectiveDurationMinutes : reservationDurationMinutes
    const end = addMinutes(start, durationMinutes)

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
      const courseIdToSave = formState.courseId ?? reservation.serviceId ?? ''
      const updatePayload: ReservationUpdatePayload = {
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
        options: formState.optionIds,
      }

      if (courseIdToSave) {
        updatePayload.courseId = courseIdToSave
      }

      await onSave(reservation.id, updatePayload)
      setHistoryReloadToken((prev) => prev + 1)
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
      <DialogContent
        className="flex max-h-[90vh] max-w-6xl flex-col overflow-hidden p-0"
        aria-describedby="reservation-dialog-description"
      >
        <DialogTitle className="sr-only">{reservation.customerName} 様の予約詳細</DialogTitle>
        <DialogDescription id="reservation-dialog-description" className="sr-only">
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
                          施術時間: {effectiveDurationMinutes}分
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
                <CardContent className="space-y-3 text-sm">
                  {isEditMode ? (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="reservation-area">対応エリア</Label>
                        <Select
                          value={formState.areaId ?? UNASSIGNED_VALUE}
                          onValueChange={(value) =>
                            setFormState((prev) => ({
                              ...prev,
                              areaId: value === UNASSIGNED_VALUE ? null : value,
                              stationId:
                                value === UNASSIGNED_VALUE ? null : prev.stationId,
                            }))
                          }
                        >
                          <SelectTrigger id="reservation-area" disabled={locationsLoading}>
                            <SelectValue
                              placeholder={
                                locationsLoading ? '読み込み中...' : 'エリアを選択'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNASSIGNED_VALUE}>未設定</SelectItem>
                            {areas.map((area) => (
                              <SelectItem key={area.id} value={area.id}>
                                {area.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="reservation-station">最寄り駅</Label>
                        <Select
                          value={formState.stationId ?? UNASSIGNED_VALUE}
                          onValueChange={(value) =>
                            setFormState((prev) => ({
                              ...prev,
                              stationId: value === UNASSIGNED_VALUE ? null : value,
                            }))
                          }
                          disabled={filteredStations.length === 0}
                        >
                          <SelectTrigger id="reservation-station">
                            <SelectValue
                              placeholder={
                                filteredStations.length === 0
                                  ? formState.areaId
                                    ? '該当する駅がありません'
                                    : 'エリアを選択してください'
                                  : '駅を選択'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNASSIGNED_VALUE}>未設定</SelectItem>
                            {filteredStations.map((station) => (
                              <SelectItem key={station.id} value={station.id}>
                                {station.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="reservation-location-memo">訪問先メモ</Label>
                        <Textarea
                          id="reservation-location-memo"
                          value={formState.locationMemo}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, locationMemo: event.target.value }))
                          }
                          rows={3}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="font-medium">
                        {reservation.areaName || reservation.location || '未設定'}
                      </div>
                      <div className="text-muted-foreground">
                        {(reservation.prefecture || '未設定')}{' '}
                        / {(reservation.district || '未設定')}
                      </div>
                      {reservation.stationName && (
                        <div className="text-xs text-muted-foreground">
                          最寄り駅: {reservation.stationName}
                        </div>
                      )}
                      {reservation.specificLocation && (
                        <div className="rounded-md bg-muted px-3 py-2 text-xs">
                          {reservation.specificLocation}
                        </div>
                      )}
                      {reservation.locationMemo && (
                        <div className="rounded-md bg-muted px-3 py-2 text-xs whitespace-pre-wrap">
                          {reservation.locationMemo}
                        </div>
                      )}
                    </div>
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
                  {isEditMode ? (
                    <Select
                      value={formState.courseId ?? UNASSIGNED_VALUE}
                      onValueChange={(value) =>
                        setFormState((prev) => ({
                          ...prev,
                          courseId: value === UNASSIGNED_VALUE ? null : value,
                        }))
                      }
                    >
                      <SelectTrigger id="reservation-course">
                        <SelectValue
                          placeholder={
                            pricingLoading ? '読み込み中...' : 'コースを選択'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED_VALUE}>未設定</SelectItem>
                        {courseOptions.length === 0 ? (
                          <SelectItem value="__empty" disabled>
                            コースが登録されていません
                          </SelectItem>
                        ) : (
                          courseOptions.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.name}（{course.duration}分 / ¥{course.price.toLocaleString()}）
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="font-medium">
                      {selectedCourse?.name || reservation.course || '未設定'}
                    </div>
                  )}
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
                  {isEditMode ? (
                    optionChoices.length === 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {pricingLoading ? 'オプションを読み込み中...' : 'オプションが設定されていません。'}
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {optionChoices.map((option) => {
                          const isChecked = formState.optionIds.includes(option.id)
                          return (
                            <label key={option.id} className="flex items-start gap-2 text-xs">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checkedState) => {
                                  const checked = checkedState === true
                                  setFormState((prev) => {
                                    const next = new Set(prev.optionIds)
                                    if (checked) {
                                      next.add(option.id)
                                    } else {
                                      next.delete(option.id)
                                    }
                                    return {
                                      ...prev,
                                      optionIds: Array.from(next),
                                    }
                                  })
                                }}
                              />
                              <span className="flex-1">
                                <span className="font-medium">{option.name}</span>
                                <span className="ml-2 text-muted-foreground">
                                  {option.duration ? `${formatMinutes(option.duration)} / ` : ''}
                                  ¥{option.price.toLocaleString()}
                                </span>
                                {option.note && (
                                  <span className="block text-[11px] text-muted-foreground">
                                    {option.note}
                                  </span>
                                )}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    )
                  ) : displayOptionNames.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {displayOptionNames.map((option) => (
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

            {isEditMode && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">料金プレビュー</CardTitle>
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="space-y-1">
                    <div className="text-muted-foreground">変更後の合計</div>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-2xl font-semibold">
                        {formatCurrency(priceBreakdown.total)}
                      </span>
                      {priceDelta !== 0 && (
                        <span
                          className={cn(
                            'text-sm font-semibold',
                            priceDelta > 0
                              ? 'text-red-600'
                              : 'text-emerald-600'
                          )}
                        >
                          {priceDelta > 0 ? '+' : '-'}
                          {formatCurrency(Math.abs(priceDelta))}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>現在の金額</span>
                      <span>{formatCurrency(originalTotal)}</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-2">
                    <div className="text-muted-foreground">施術時間</div>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-lg font-semibold">{formatMinutes(effectiveDurationMinutes)}</span>
                      {durationDelta !== 0 && (
                        <span
                          className={cn(
                            'text-sm font-semibold',
                            durationDelta > 0 ? 'text-orange-600' : 'text-emerald-600'
                          )}
                        >
                          {durationDelta > 0 ? '+' : '-'}
                          {formatMinutes(Math.abs(durationDelta))}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>現在の時間</span>
                      <span>{formatMinutes(reservationDurationMinutes)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>終了予定</span>
                      <span>
                        {computedEndTime ||
                          (reservation?.endTime ? format(reservation.endTime, 'HH:mm') : '-')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      内訳
                    </div>
                    <dl className="space-y-2">
                      <div className="flex items-center justify-between">
                        <dt>コース</dt>
                        <dd>{formatCurrency(priceBreakdown.basePrice)}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt>オプション</dt>
                        <dd>{formatCurrency(priceBreakdown.optionTotal)}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt>指名料</dt>
                        <dd>{formatCurrency(priceBreakdown.designation)}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt>交通費</dt>
                        <dd>{formatCurrency(priceBreakdown.transportation)}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt>追加料金</dt>
                        <dd>{formatCurrency(priceBreakdown.additional)}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span>選択オプション</span>
                      <span>
                        {selectedOptionDetails.length > 0
                          ? `${selectedOptionDetails.length}件`
                          : 'なし'}
                      </span>
                    </div>
                    {selectedOptionDetails.length > 0 ? (
                      <ul className="divide-y divide-muted/40 overflow-hidden rounded-md border border-muted/40 text-xs">
                        {selectedOptionDetails.map((option) => (
                          <li
                            key={option.id}
                            className="flex items-center justify-between gap-3 bg-white/30 px-3 py-2"
                          >
                            <div className="flex-1">
                              <div className="font-medium">{option.name}</div>
                              {option.note && (
                                <div className="text-[11px] text-muted-foreground">
                                  {option.note}
                                </div>
                              )}
                            </div>
                            <div className="text-right text-muted-foreground">
                              {option.duration ? (
                                <div>{formatMinutes(option.duration)}</div>
                              ) : null}
                              <div>{formatCurrency(toNumber(option.price, 0))}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        オプションは選択されていません。
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    変更内容は「保存する」で反映され、履歴にも記録されます。
                  </p>
                </CardContent>
              </Card>
            )}

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
                  <div className="text-muted-foreground">担当キャスト確認</div>
                  <div className="font-medium">{reservation.staffConfirmation}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">顧客確認</div>
                  <div className="font-medium">{reservation.customerConfirmation}</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="p-4 space-y-4">
            <Alert variant="default" className="bg-muted/40">
              <Info className="h-4 w-4" />
              <AlertDescription>
                ステータス・時間帯・料金などの更新は自動で記録されます。スタッフ間の共有メモや監査対応の証跡として活用してください。
              </AlertDescription>
            </Alert>
            {isHistoryLoading && (
              <p className="text-xs text-muted-foreground">履歴を読み込み中...</p>
            )}
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
  

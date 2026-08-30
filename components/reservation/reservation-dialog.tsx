'use client'

/**
 * @design_doc   refactor-instructions.md Phase 5 reservation dialog extraction
 * @related_to   reservation-dialog.utils: pure formatting and normalization helpers
 * @known_issues Large UI/state sections remain for later extraction proposals
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Edit, X, Check, Phone, Loader2, AlertCircle, ChevronDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { differenceInMinutes, addMinutes, format, parseISO } from 'date-fns'
import { buildModificationAlerts, getModificationHistory } from '@/lib/modification-history/data'
import { ReservationUpdatePayload } from '@/lib/types/reservation'
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
import {
  MARKETING_CHANNELS,
  PAYMENT_METHODS,
  type PaymentMethod,
  ReservationStatus,
} from '@/lib/constants'
import { toast } from '@/hooks/use-toast'
import { usePricing } from '@/hooks/use-pricing'
import { useLocations } from '@/hooks/use-locations'
import { useStore } from '@/contexts/store-context'
import { normalizeOptionalPaymentReference } from '@/lib/reservation/financial-reference'
import { ScrollArea } from '@/components/ui/scroll-area'
import { zonedTimeToUtc } from 'date-fns-tz'
import { CastTimelineModal } from '@/components/reservation/cast-timeline-modal'
import {
  isReservationStartBoundary,
  reservationStartMinuteHint,
} from '@/lib/reservation/time-boundary'
import {
  DiscardReservationEditDialog,
  ReservationCancellationDialog,
} from '@/components/reservation/reservation-cancellation-dialog'
import {
  PAYMENT_METHOD_OPTIONS,
  calculateReservationPriceBreakdown,
  composeMarketingChannel,
  formatCurrency,
  normalizeMarketingChannelValue,
  normalizePaymentMethodValue,
  parseMarketingChannel,
  partitionMarketingChannels,
  toNullableNumber,
  toNumber,
} from '@/components/reservation/reservation-dialog.utils'
import {
  formatRemainingTime,
  getReservationStatusLabel,
  NG_REASON_LABELS,
  parseEntryMeta,
  STATUS_META,
  STATUS_OPTIONS,
  StatusBadge,
  type EditFormState,
  type LineLogEntry,
  type ReservationDialogProps,
} from '@/components/reservation/reservation-dialog.shared'
import {
  ReservationDialogFooter,
  ReservationEditPricePreview,
  ReservationHistoryContent,
  ReservationNotesAndConfirmation,
  ReservationPrimarySummary,
} from '@/components/reservation/reservation-dialog-sections'

const MAX_LINE_MESSAGE_LENGTH = 1000

const DEFAULT_MARKETING_CHANNELS = [...MARKETING_CHANNELS]

export function ReservationDialog({
  open,
  onOpenChange,
  reservation,
  onSave,
  casts,
}: ReservationDialogProps) {
  const { currentStore } = useStore()
  const [isCastTimelineOpen, setIsCastTimelineOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview')
  const [isEditMode, setIsEditMode] = useState(false)
  const [discardEditConfirmOpen, setDiscardEditConfirmOpen] = useState(false)
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
    paymentMethod: PAYMENT_METHODS.CASH,
    paymentReference: '',
    marketingChannel: DEFAULT_MARKETING_CHANNELS[0] ?? 'WEB',
    transportationFee: 0,
    additionalFee: 0,
    discountAmount: 0,
    designationFee: 0,
    price: 0,
    pointsUsed: 0,
    areaId: null,
    stationId: null,
    optionIds: [],
    hotelName: '',
    roomNumber: '',
    locationMemo: '',
  })
  const [castOptions, setCastOptions] = useState<Cast[]>(casts ?? [])
  const [isLoadingCasts, setIsLoadingCasts] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [remainingTime, setRemainingTime] = useState<number | null>(null)
  const { data: session } = useSession()
  const canViewFinancialDetails = hasPermission(session?.user?.permissions ?? [], 'analytics:read')
  const { coursePrices, courses, optionPrices, options } = usePricing(currentStore.id)
  const { areas, stations, loading: locationsLoading } = useLocations()

  const [modificationHistory, setModificationHistory] = useState<ModificationHistory[]>([])
  const [modificationAlerts, setModificationAlerts] = useState<ModificationAlert[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [historyReloadToken, setHistoryReloadToken] = useState(0)
  const [marketingChannelOptions, setMarketingChannelOptions] = useState<string[]>(() => {
    const seed = new Set<string>(DEFAULT_MARKETING_CHANNELS)
    if (reservation?.marketingChannel) {
      seed.add(reservation.marketingChannel)
    }
    return Array.from(seed)
  })
  const partitionedMarketingChannels = useMemo(
    () => partitionMarketingChannels(marketingChannelOptions),
    [marketingChannelOptions]
  )

  const [lineMessage, setLineMessage] = useState('')
  const [lineLogs, setLineLogs] = useState<LineLogEntry[]>([])
  const [isLoadingLineLogs, setIsLoadingLineLogs] = useState(false)
  const [lineSending, setLineSending] = useState(false)
  const [lineSendError, setLineSendError] = useState<string | null>(null)
  const [lineSendSuccess, setLineSendSuccess] = useState<string | null>(null)
  const [lineConfirmOpen, setLineConfirmOpen] = useState(false)
  const [entryForm, setEntryForm] = useState({
    hotelName: '',
    roomNumber: '',
    entryMemo: '',
  })
  const [entryMeta, setEntryMeta] = useState({
    entryReceivedAt: null as Date | null,
    entryReceivedBy: null as string | null,
    entryNotifiedAt: null as Date | null,
    entryConfirmedAt: null as Date | null,
    entryReminderSentAt: null as Date | null,
  })
  const [entrySending, setEntrySending] = useState(false)
  const [entrySendError, setEntrySendError] = useState<string | null>(null)
  const [entrySendSuccess, setEntrySendSuccess] = useState<string | null>(null)
  const [entryReminderSending, setEntryReminderSending] = useState(false)
  const lastDefaultLineMessageRef = useRef<string>('')
  const lineMessageReservationIdRef = useRef<string | null>(null)
  const [customerNgEntries, setCustomerNgEntries] = useState<
    Array<{ castId: string; assignedBy?: 'customer' | 'cast' | 'staff'; notes?: string }>
  >([])
  const [, setCustomerNgLoading] = useState(false)
  const [cancelReasonDialogOpen, setCancelReasonDialogOpen] = useState(false)
  const [pendingStatusChange, setPendingStatusChange] = useState<
    ReservationStatus | 'completed' | null
  >(null)
  const [cancelReason, setCancelReason] = useState<'customer' | 'store'>('customer')
  const [cancellationReason, setCancellationReason] = useState('')
  const handleCancelReasonDialogToggle = (open: boolean) => {
    setCancelReasonDialogOpen(open)
    if (!open) {
      setPendingStatusChange(null)
      setCancellationReason('')
    }
  }

  useEffect(() => {
    let ignore = false
    const controller = new AbortController()

    const loadStoreSettings = async () => {
      try {
        const params = new URLSearchParams()
        if (currentStore?.id) {
          params.set('storeId', currentStore.id)
        }
        const response = await fetch(`/api/settings/store?${params.toString()}`, {
          method: 'GET',
          signal: controller.signal,
        })

        if (!response.ok) {
          return
        }

        const payload = await response.json().catch(() => null)
        const data = payload?.data ?? payload
        const channels = Array.isArray(data?.marketingChannels) ? data.marketingChannels : null
        if (!ignore && channels) {
          const normalized = channels
            .map((channel: unknown) => (typeof channel === 'string' ? channel.trim() : ''))
            .filter((channel: string) => channel.length > 0)
          const merged = Array.from(
            new Set(
              [
                ...normalized,
                ...DEFAULT_MARKETING_CHANNELS,
                reservation?.marketingChannel ?? '',
              ].filter((channel) => channel.length > 0)
            )
          )
          if (merged.length > 0) {
            setMarketingChannelOptions(merged)
          }
        }
      } catch (error) {
        if (!ignore && !(error instanceof DOMException && error.name === 'AbortError')) {
          console.warn('[ReservationDialog] Failed to load store marketing channels', error)
        }
      }
    }

    loadStoreSettings()

    return () => {
      ignore = true
      controller.abort()
    }
  }, [currentStore?.id, reservation?.marketingChannel])

  useEffect(() => {
    setFormState((prev) => {
      const normalized = normalizeMarketingChannelValue(
        prev.marketingChannel,
        marketingChannelOptions
      )
      if (normalized === prev.marketingChannel) {
        return prev
      }
      return {
        ...prev,
        marketingChannel: normalized,
      }
    })
  }, [marketingChannelOptions])

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

    const rawDesignation = (reservation.designationType ?? reservation.designation)?.trim()
    if (!rawDesignation || ['なし', '指名なし', 'none'].includes(rawDesignation.toLowerCase())) {
      return undefined
    }

    const configuredDesignation =
      findDesignationFeeByName(rawDesignation, designationOptions) ||
      findDesignationFeeByName(reservation.designation, designationOptions)
    if (configuredDesignation) {
      return configuredDesignation
    }

    const designationAmount = toNumber(reservation.designationFee, 0)
    const configuredByPrice =
      designationAmount > 0
        ? findDesignationFeeByPrice(designationAmount, designationOptions)
        : undefined
    if (configuredByPrice) {
      return configuredByPrice
    }

    return {
      id: `existing-designation-${reservation.id}`,
      name: rawDesignation,
      price: designationAmount,
      storeShare: 0,
      castShare: designationAmount,
      description: '既存予約の指名設定',
      sortOrder: Number.MAX_SAFE_INTEGER,
      isActive: false,
    }
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

  const persistedCoursePrice = useMemo(
    () =>
      (reservation?.courseItems ?? []).reduce(
        (sum, course) => sum + Math.max(0, toNumber(course.price, 0)),
        0
      ),
    [reservation?.courseItems]
  )

  const persistedCourseDuration = useMemo(
    () =>
      (reservation?.courseItems ?? []).reduce(
        (sum, course) => sum + Math.max(0, toNumber(course.duration, 0)),
        0
      ),
    [reservation?.courseItems]
  )

  const selectedOptionDetails = useMemo(
    () => optionChoices.filter((option) => formState.optionIds.includes(option.id)),
    [optionChoices, formState.optionIds]
  )

  const filteredStations = useMemo(() => {
    if (!formState.areaId) {
      return stations
    }
    return stations.filter((station) => station.areaId === formState.areaId)
  }, [stations, formState.areaId])

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
        const history = await getModificationHistory(reservationId, currentStore.id)
        const alerts = buildModificationAlerts(history)
        if (!ignore) {
          setModificationHistory(history)
          setModificationAlerts(alerts)
        }
      } catch (error) {
        if (!ignore) {
          toast({
            title: '履歴の取得に失敗しました',
            description: error instanceof Error ? error.message : '不明なエラーが発生しました。',
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
  }, [currentStore.id, reservation?.id, historyReloadToken])

  const performStatusUpdate = useCallback(
    async (
      nextStatus: ReservationStatus | 'completed',
      options?: {
        cancellationSource?: 'customer' | 'store'
        cancellationReason?: string
      }
    ) => {
      if (!reservation) {
        return
      }
      if (!onSave || status === nextStatus) {
        setStatus(nextStatus)
        return
      }

      setStatusUpdating(true)
      try {
        const statusPayload = {
          status: nextStatus as ReservationStatus,
          ...(options?.cancellationSource
            ? { cancellationSource: options.cancellationSource }
            : {}),
          ...(options?.cancellationReason
            ? { cancellationReason: options.cancellationReason }
            : {}),
        }
        await onSave(reservation.id, statusPayload)
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
    [onSave, reservation, status]
  )

  const handleStatusChange = useCallback(
    (nextStatus: ReservationStatus | 'completed') => {
      if (nextStatus === 'cancelled') {
        setPendingStatusChange(nextStatus)
        setCancelReason('customer')
        setCancellationReason('')
        setCancelReasonDialogOpen(true)
        return
      }
      void performStatusUpdate(nextStatus)
    },
    [performStatusUpdate]
  )

  const handleConfirmCancellation = useCallback(async () => {
    if (!pendingStatusChange) {
      return
    }
    await performStatusUpdate(pendingStatusChange, {
      cancellationSource: cancelReason,
      cancellationReason: cancellationReason.trim(),
    })
    setCancelReasonDialogOpen(false)
    setPendingStatusChange(null)
  }, [cancelReason, cancellationReason, pendingStatusChange, performStatusUpdate])

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
        const response = await fetch(`/api/cast?storeId=${encodeURIComponent(currentStore.id)}`, {
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

  useEffect(() => {
    if (!open || !reservation?.customerId) {
      setCustomerNgEntries([])
      return
    }

    let ignore = false
    const controller = new AbortController()

    const loadCustomerNg = async () => {
      setCustomerNgLoading(true)
      try {
        const response = await fetch(
          `/api/customer?id=${encodeURIComponent(reservation.customerId)}&storeId=${encodeURIComponent(currentStore.id)}`,
          {
            cache: 'no-store',
            credentials: 'include',
            signal: controller.signal,
          }
        )
        if (!response.ok) {
          throw new Error(`Failed to fetch customer: ${response.status}`)
        }
        const payload = await response.json()
        if (!ignore) {
          const entries = Array.isArray(payload?.ngCasts)
            ? payload.ngCasts.map((entry: any) => ({
                castId: entry.castId,
                assignedBy: entry.assignedBy ?? 'customer',
                notes: entry.notes ?? undefined,
              }))
            : []
          setCustomerNgEntries(entries)
        }
      } catch (error) {
        if (!ignore) {
          setCustomerNgEntries([])
        }
      } finally {
        if (!ignore) {
          setCustomerNgLoading(false)
        }
      }
    }

    loadCustomerNg()
    return () => {
      ignore = true
      controller.abort()
    }
  }, [currentStore.id, open, reservation?.customerId])

  const activeCastId = formState.castId || reservation?.staffId || ''

  const selectedCast = useMemo(
    () => castOptions.find((cast) => cast.id === activeCastId),
    [castOptions, activeCastId]
  )

  const timelineInitialDate = useMemo(() => {
    if (formState.date) {
      const parsed = new Date(`${formState.date}T00:00:00`)
      if (!Number.isNaN(parsed.getTime())) {
        return parsed
      }
    }
    return reservation?.startTime ?? new Date()
  }, [formState.date, reservation?.startTime])

  const selectedSlotIso = useMemo(() => {
    if (!formState.date || !formState.startTime) {
      return null
    }
    const start = new Date(`${formState.date}T${formState.startTime}:00`)
    if (Number.isNaN(start.getTime())) {
      return null
    }
    return start.toISOString()
  }, [formState.date, formState.startTime])

  const customerNgMap = useMemo(() => {
    const map = new Map<string, { assignedBy?: 'customer' | 'cast' | 'staff'; notes?: string }>()
    customerNgEntries.forEach((entry) => {
      map.set(entry.castId, { assignedBy: entry.assignedBy, notes: entry.notes })
    })
    return map
  }, [customerNgEntries])

  const activeNgEntry =
    activeCastId && customerNgMap.size > 0 ? customerNgMap.get(activeCastId) : undefined

  const paymentMethodOptions = useMemo(() => PAYMENT_METHOD_OPTIONS, [])

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

  const displayOptionNames = useMemo(
    () =>
      selectedOptionDetails.length > 0
        ? selectedOptionDetails.map((option) => option.name)
        : initialOptionNames,
    [selectedOptionDetails, initialOptionNames]
  )

  const selectedOptionDurationTotal = useMemo(
    () =>
      selectedOptionDetails.reduce(
        (sum, option) => sum + (typeof option.duration === 'number' ? option.duration : 0),
        0
      ),
    [selectedOptionDetails]
  )

  const effectiveDurationMinutes = useMemo(() => {
    const usesPersistedCourses =
      persistedCourseDuration > 0 &&
      (formState.courseId || reservation?.serviceId || '') === (reservation?.serviceId || '')
    if (usesPersistedCourses) {
      return persistedCourseDuration + selectedOptionDurationTotal
    }

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
    persistedCourseDuration,
    formState.courseId,
    reservation?.serviceId,
  ])

  const computedEndTime = useMemo(() => {
    if (!formState.date || !formState.startTime) return ''
    const start = new Date(`${formState.date}T${formState.startTime}:00`)
    if (Number.isNaN(start.getTime())) return ''
    const end = addMinutes(start, effectiveDurationMinutes)
    return format(end, 'HH:mm')
  }, [formState.date, formState.startTime, effectiveDurationMinutes])

  const originalTotal = useMemo(
    () => toNumber(reservation?.totalPayment ?? reservation?.price, 0),
    [reservation?.price, reservation?.totalPayment]
  )

  const rawDesignationId = formState.designationId

  const selectedDesignation = useMemo(() => {
    if (!rawDesignationId || rawDesignationId.length === 0) {
      return undefined
    }
    return selectableDesignationOptions.find((fee) => fee.id === rawDesignationId)
  }, [rawDesignationId, selectableDesignationOptions])

  const designationForDisplay = isEditMode ? selectedDesignation : reservationDesignation
  const reservationCastWelfareExpenseRate = (reservation as any)?.cast?.welfareExpenseRate

  const welfareRate = useMemo(() => {
    const candidateRates: Array<number | undefined | null> = [
      selectedCast?.welfareExpenseRate,
      reservationCastWelfareExpenseRate,
      currentStore?.welfareExpenseRate,
    ]

    for (const rate of candidateRates) {
      if (typeof rate === 'number' && Number.isFinite(rate)) {
        return rate
      }
    }

    if (reservation?.welfareExpense && reservation?.price) {
      const inferred = (reservation.welfareExpense / reservation.price) * 100
      if (Number.isFinite(inferred) && inferred > 0) {
        return inferred
      }
    }

    return 10
  }, [
    selectedCast?.welfareExpenseRate,
    reservationCastWelfareExpenseRate,
    currentStore?.welfareExpenseRate,
    reservation?.welfareExpense,
    reservation?.price,
  ])

  const mapLineLogEntry = useCallback(
    (raw: any): LineLogEntry => ({
      id: String(raw.id),
      message: String(raw.message ?? ''),
      status: String(raw.status ?? 'sent'),
      errorMessage: raw.errorMessage ? String(raw.errorMessage) : null,
      createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
      castName: raw.cast?.name ?? null,
    }),
    []
  )

  const refreshLineLogs = useCallback(async () => {
    if (!reservation?.id) {
      setLineLogs([])
      return
    }

    const storeQuery = currentStore?.id ? `?storeId=${currentStore.id}` : ''
    setIsLoadingLineLogs(true)
    try {
      const response = await fetch(`/api/reservation/${reservation.id}/line${storeQuery}`, {
        method: 'GET',
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch LINE logs (${response.status})`)
      }

      const payload = await response.json().catch(() => null)
      const rawLogs: any[] = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : []
      setLineLogs(
        rawLogs
          .map((entry: any) => mapLineLogEntry(entry))
          .sort((a: LineLogEntry, b: LineLogEntry) => b.createdAt.getTime() - a.createdAt.getTime())
      )
    } catch (error) {
      console.warn('[ReservationDialog] Failed to fetch LINE logs', error)
    } finally {
      setIsLoadingLineLogs(false)
    }
  }, [currentStore?.id, mapLineLogEntry, reservation?.id])

  useEffect(() => {
    if (!open) return
    refreshLineLogs()
  }, [open, refreshLineLogs])

  useEffect(() => {
    if (!reservation?.id) {
      setLineLogs([])
    }
  }, [reservation?.id])

  const buildDefaultLineMessage = useCallback(() => {
    if (!reservation) return ''
    const castName = selectedCast?.name ?? reservation.staff ?? 'キャスト'
    const customerName = reservation.customerName ?? 'お客様'
    const start = format(reservation.startTime, 'yyyy/MM/dd HH:mm')
    const end = format(reservation.endTime, 'HH:mm')
    const lines: string[] = [
      `【予約共有】${castName}さん`,
      '',
      `日時: ${start} 〜 ${end}`,
      `お客様: ${customerName}`,
    ]

    if (reservation.course) {
      lines.push(`コース: ${reservation.course}`)
    }
    if (reservation.designation) {
      lines.push(`指名: ${reservation.designation}`)
    }
    if (reservation.areaName) {
      lines.push(`エリア: ${reservation.areaName}`)
    }
    if (reservation.stationName) {
      lines.push(`目安駅: ${reservation.stationName}`)
    }
    if (reservation.location) {
      lines.push(`場所: ${reservation.location}`)
    }
    if (reservation.hotelName) {
      lines.push(`ホテル: ${reservation.hotelName}`)
    }
    if (reservation.roomNumber) {
      lines.push(`部屋番号: ${reservation.roomNumber}`)
    }
    if (reservation.locationMemo) {
      lines.push(`現地メモ: ${reservation.locationMemo}`)
    }
    if (reservation.options) {
      const enabledOptions = Object.entries(reservation.options)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name)
      if (enabledOptions.length > 0) {
        lines.push(`オプション: ${enabledOptions.join(' / ')}`)
      }
    }
    if (reservation.notes) {
      lines.push(`店舗メモ: ${reservation.notes}`)
    }

    const portalLink =
      typeof window !== 'undefined'
        ? `${window.location.origin}/cast/reservations?highlight=${reservation.id}`
        : null

    lines.push('')
    lines.push('ご対応よろしくお願いいたします。')
    if (portalLink) {
      lines.push(`詳細はこちら: ${portalLink}`)
    }

    return lines.join('\n')
  }, [reservation, selectedCast])

  useEffect(() => {
    if (!reservation) return
    const nextDefault = buildDefaultLineMessage()
    const reservationChanged = lineMessageReservationIdRef.current !== reservation.id
    if (reservationChanged) {
      lineMessageReservationIdRef.current = reservation.id
      lastDefaultLineMessageRef.current = nextDefault
      setLineMessage(nextDefault)
      setLineSendError(null)
      setLineSendSuccess(null)
      setLineConfirmOpen(false)
      return
    }
    setLineMessage((prev) => {
      if (!prev || prev === lastDefaultLineMessageRef.current) {
        lastDefaultLineMessageRef.current = nextDefault
        return nextDefault
      }
      return prev
    })
  }, [buildDefaultLineMessage, reservation])

  useEffect(() => {
    if (!open) {
      setLineSendError(null)
      setLineSendSuccess(null)
    }
  }, [open])

  const trimmedLineMessage = lineMessage.trim()
  const lineMessageLength = trimmedLineMessage.length
  const isLineMessageTooLong = lineMessageLength > MAX_LINE_MESSAGE_LENGTH

  const canSendLineMessage =
    lineMessageLength > 0 && !isLineMessageTooLong && Boolean(selectedCast?.lineUserId)

  const handleLineMessageChange = (value: string) => {
    setLineMessage(value)
    setLineSendError(null)
    setLineSendSuccess(null)
  }

  const handleResetLineMessage = () => {
    const template = buildDefaultLineMessage()
    lastDefaultLineMessageRef.current = template
    setLineMessage(template)
    setLineSendError(null)
    setLineSendSuccess(null)
  }

  const handleConfirmSendLineMessage = useCallback(async () => {
    if (!reservation?.id) {
      setLineConfirmOpen(false)
      return
    }

    if (!selectedCast?.lineUserId) {
      setLineSendError('キャストのLINEユーザーIDが登録されていません。')
      setLineConfirmOpen(false)
      return
    }

    const messageToSend = trimmedLineMessage
    if (messageToSend.length === 0) {
      setLineSendError('メッセージを入力してください。')
      setLineConfirmOpen(false)
      return
    }

    if (messageToSend.length > MAX_LINE_MESSAGE_LENGTH) {
      setLineSendError(`メッセージは${MAX_LINE_MESSAGE_LENGTH}文字以内で入力してください。`)
      setLineConfirmOpen(false)
      return
    }

    setLineSending(true)
    setLineSendError(null)
    setLineSendSuccess(null)

    const storeQuery = currentStore?.id ? `?storeId=${currentStore.id}` : ''

    try {
      const response = await fetch(`/api/reservation/${reservation.id}/line${storeQuery}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: messageToSend }),
      })

      const payload = await response.json().catch(() => null)
      const rawLog = payload?.data ?? payload

      if (response.ok) {
        if (rawLog) {
          const entry = mapLineLogEntry(rawLog)
          setLineLogs((prev) => [entry, ...prev.filter((log) => log.id !== entry.id)])
        } else {
          await refreshLineLogs()
        }
        setLineSendSuccess('LINE通知を送信しました。')
        lastDefaultLineMessageRef.current = messageToSend
      } else {
        if (rawLog) {
          const entry = mapLineLogEntry(rawLog)
          setLineLogs((prev) => [entry, ...prev.filter((log) => log.id !== entry.id)])
        }
        const apiError =
          (payload?.error as string | undefined) ??
          `LINE通知の送信に失敗しました（${response.status}）`
        setLineSendError(apiError)
      }
    } catch (error) {
      console.error('[ReservationDialog] Failed to send LINE message', error)
      setLineSendError('LINE通知の送信に失敗しました。時間を置いて再度お試しください。')
    } finally {
      setLineSending(false)
      setLineConfirmOpen(false)
    }
  }, [
    currentStore?.id,
    mapLineLogEntry,
    refreshLineLogs,
    reservation?.id,
    selectedCast?.lineUserId,
    trimmedLineMessage,
  ])

  const priceBreakdown = useMemo(() => {
    const usesPersistedCourses =
      persistedCoursePrice > 0 &&
      (formState.courseId || reservation?.serviceId || '') === (reservation?.serviceId || '')
    return calculateReservationPriceBreakdown({
      selectedCoursePrice: usesPersistedCourses ? persistedCoursePrice : selectedCourse?.price,
      fallbackCoursePrice: reservation?.price,
      options: selectedOptionDetails,
      transportationFee: formState.transportationFee,
      additionalFee: formState.additionalFee,
      discountAmount: formState.discountAmount,
      pointsUsed: formState.pointsUsed,
      creditCardFee:
        formState.paymentMethod === PAYMENT_METHODS.CARD ? reservation?.creditCardFee : 0,
      designationFee: formState.designationFee,
      designation: selectedDesignation || reservationDesignation,
      welfareRate,
    })
  }, [
    selectedCourse,
    persistedCoursePrice,
    reservation?.price,
    reservation?.serviceId,
    reservation?.creditCardFee,
    selectedOptionDetails,
    formState.transportationFee,
    formState.additionalFee,
    formState.discountAmount,
    formState.pointsUsed,
    formState.courseId,
    formState.paymentMethod,
    formState.designationFee,
    selectedDesignation,
    reservationDesignation,
    welfareRate,
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
        paymentMethod: normalizePaymentMethodValue(reservation.paymentMethod),
        paymentReference: reservation.paymentReference ?? '',
        marketingChannel: normalizeMarketingChannelValue(
          reservation.marketingChannel,
          marketingChannelOptions
        ),
        transportationFee: reservation.transportationFee ?? 0,
        additionalFee: reservation.additionalFee ?? 0,
        discountAmount: reservation.discountAmount ?? 0,
        designationFee: toNumber(reservation.designationFee, 0),
        price: Number(reservation.totalPayment ?? reservation.price ?? 0),
        pointsUsed: reservation.pointsUsed ?? 0,
        areaId: reservation.areaId ?? null,
        stationId: reservation.stationId ?? null,
        optionIds: normalizedInitialOptionIds,
        hotelName: reservation.hotelName ?? '',
        roomNumber: reservation.roomNumber ?? '',
        locationMemo: reservation.locationMemo ?? '',
      })
      setEntryForm({
        hotelName: reservation.hotelName ?? '',
        roomNumber: reservation.roomNumber ?? '',
        entryMemo: reservation.entryMemo ?? '',
      })
      setEntryMeta({
        entryReceivedAt: reservation.entryReceivedAt ?? null,
        entryReceivedBy: reservation.entryReceivedBy ?? null,
        entryNotifiedAt: reservation.entryNotifiedAt ?? null,
        entryConfirmedAt: reservation.entryConfirmedAt ?? null,
        entryReminderSentAt: reservation.entryReminderSentAt ?? null,
      })
      setValidationError(null)
    }
  }, [reservation, reservationDesignation, normalizedInitialOptionIds, marketingChannelOptions])

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

  const handleSendEntryReminder = useCallback(async () => {
    if (!reservation) return
    if (entryReminderSending) return
    setEntrySendError(null)
    setEntrySendSuccess(null)
    setEntryReminderSending(true)

    try {
      const storeQuery = currentStore?.id ? `?storeId=${currentStore.id}` : ''
      const response = await fetch(`/api/reservation/${reservation.id}/entry-info${storeQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remind' }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error ?? `再通知に失敗しました（${response.status}）`)
      }

      const payload = await response.json().catch(() => ({}))
      setEntryMeta(parseEntryMeta(payload))
      if (payload.notificationStatus !== 'sent') {
        setEntrySendError(
          payload.notificationError ||
            '再通知のLINE送信は完了しませんでした。時間を置いて再度お試しください。'
        )
      } else {
        setEntrySendSuccess('再通知を送信しました。')
      }
    } catch (error) {
      setEntrySendError(error instanceof Error ? error.message : '再通知の送信に失敗しました。')
    } finally {
      setEntryReminderSending(false)
    }
  }, [currentStore?.id, entryReminderSending, reservation])

  const statusMeta = STATUS_META[status] ?? {
    label: getReservationStatusLabel(status),
    description: '',
  }

  if (!reservation) {
    return null
  }

  const designationSelectValue =
    rawDesignationId && rawDesignationId.length > 0 ? rawDesignationId : 'none'
  const entryNotifiedAt = entryMeta.entryNotifiedAt
  const entryOverdue =
    entryNotifiedAt !== null &&
    !entryMeta.entryConfirmedAt &&
    Date.now() - entryNotifiedAt.getTime() > 10 * 60 * 1000

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
      paymentMethod: normalizePaymentMethodValue(reservation.paymentMethod),
      paymentReference: reservation.paymentReference ?? '',
      marketingChannel: normalizeMarketingChannelValue(
        reservation.marketingChannel,
        marketingChannelOptions
      ),
      transportationFee: reservation.transportationFee ?? 0,
      additionalFee: reservation.additionalFee ?? 0,
      discountAmount: reservation.discountAmount ?? 0,
      designationFee: toNumber(reservation.designationFee, 0),
      price: Number(reservation.totalPayment ?? reservation.price ?? 0),
      pointsUsed: reservation.pointsUsed ?? 0,
      areaId: reservation.areaId ?? null,
      stationId: reservation.stationId ?? null,
      optionIds: normalizedInitialOptionIds,
      hotelName: reservation.hotelName ?? '',
      roomNumber: reservation.roomNumber ?? '',
      locationMemo: reservation.locationMemo ?? '',
    })
  }

  const closeDialogWithoutSaving = () => {
    setIsEditMode(false)
    resetForm()
    setDiscardEditConfirmOpen(false)
    onOpenChange(false)
  }

  const requestDialogOpenChange = (next: boolean) => {
    if (!next && isEditMode) {
      setDiscardEditConfirmOpen(true)
      return
    }

    if (!next) {
      setIsEditMode(false)
      resetForm()
    }
    onOpenChange(next)
  }

  const handleTimelineSelection = (castId: string, slotIso: string) => {
    const slotDate = new Date(slotIso)
    if (Number.isNaN(slotDate.getTime())) {
      return
    }

    setFormState((prev) => ({
      ...prev,
      castId,
      date: format(slotDate, 'yyyy-MM-dd'),
      startTime: format(slotDate, 'HH:mm'),
    }))
    setValidationError(null)
    setIsCastTimelineOpen(false)
  }

  const handleCancelEdit = () => {
    resetForm()
    setValidationError(null)
    setIsEditMode(false)
  }

  const handleSaveEntryInfo = async (action: 'save' | 'notify') => {
    if (!reservation) return
    setEntrySendError(null)
    setEntrySendSuccess(null)
    setEntrySending(true)

    try {
      const storeQuery = currentStore?.id ? `?storeId=${currentStore.id}` : ''
      const response = await fetch(`/api/reservation/${reservation.id}/entry-info${storeQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelName: formState.hotelName,
          roomNumber: formState.roomNumber,
          locationMemo: formState.locationMemo,
          entryMemo: entryForm.entryMemo,
          action,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error ?? `入室情報の送信に失敗しました（${response.status}）`)
      }

      const payload = await response.json().catch(() => ({}))
      setEntryMeta(parseEntryMeta(payload))
      setEntryForm({
        hotelName: payload.hotelName ?? '',
        roomNumber: payload.roomNumber ?? '',
        entryMemo: payload.entryMemo ?? '',
      })
      setFormState((prev) => ({
        ...prev,
        hotelName: payload.hotelName ?? prev.hotelName,
        roomNumber: payload.roomNumber ?? prev.roomNumber,
      }))
      if (action === 'save') {
        setEntrySendSuccess('入室情報を保存しました。')
      } else if (payload.notificationStatus !== 'sent') {
        setEntrySendError(
          `入室情報は保存しましたが、LINE通知は完了しませんでした。${
            payload.notificationError ? ` ${payload.notificationError}` : ''
          }`
        )
      } else {
        setEntrySendSuccess('入室情報を保存し、LINE通知を送信しました。')
      }
    } catch (error) {
      setEntrySendError(error instanceof Error ? error.message : '入室情報の送信に失敗しました。')
    } finally {
      setEntrySending(false)
    }
  }

  const handleSaveChanges = async () => {
    if (!reservation || !onSave) {
      return
    }

    if (!formState.date || !formState.startTime) {
      setValidationError('予約日と開始時間を入力してください。')
      return
    }

    const enteredStart = new Date(`${formState.date}T${formState.startTime}:00`)
    if (Number.isNaN(enteredStart.getTime())) {
      setValidationError('日時の形式が正しくありません。')
      return
    }

    const startInputChanged =
      formState.date !== format(reservation.startTime, 'yyyy-MM-dd') ||
      formState.startTime !== format(reservation.startTime, 'HH:mm')

    if (startInputChanged && !isReservationStartBoundary(enteredStart)) {
      setValidationError(reservationStartMinuteHint())
      return
    }

    const castId = formState.castId || reservation.staffId || ''
    if (!castId) {
      setValidationError('担当キャストを選択してください。')
      return
    }

    const courseIdToSave = formState.courseId ?? reservation.serviceId ?? ''
    const originalCourseId = reservation.serviceId ?? ''
    const courseChanged = courseIdToSave !== originalCourseId
    const originalOptionIds = [...normalizedInitialOptionIds].sort()
    const selectedOptionIds = Array.from(new Set(formState.optionIds)).sort()
    const optionsChanged =
      originalOptionIds.length !== selectedOptionIds.length ||
      originalOptionIds.some((optionId, index) => optionId !== selectedOptionIds[index])
    const start = startInputChanged ? enteredStart : new Date(reservation.startTime)
    const durationMinutes =
      effectiveDurationMinutes > 0 ? effectiveDurationMinutes : reservationDurationMinutes
    const end =
      startInputChanged || courseChanged || optionsChanged
        ? addMinutes(start, durationMinutes)
        : new Date(reservation.endTime)

    const designationIdToSave = formState.designationId
    const designationForSave =
      designationIdToSave && designationIdToSave.length > 0
        ? selectableDesignationOptions.find((fee) => fee.id === designationIdToSave)
        : undefined
    const designationChanged = designationIdToSave !== (reservationDesignation?.id ?? '')
    const designationTypeToSave = designationChanged
      ? (designationForSave?.name ?? null)
      : reservation.designationType !== undefined
        ? reservation.designationType
        : (reservationDesignation?.name ?? null)
    const designationFeeToSave = designationChanged
      ? (designationForSave?.price ?? formState.designationFee)
      : toNumber(reservation.designationFee, 0)
    const paymentMethodChanged =
      formState.paymentMethod !== normalizePaymentMethodValue(reservation.paymentMethod)
    let paymentReferenceToSave: string | null = null
    if (formState.paymentMethod === PAYMENT_METHODS.CARD) {
      try {
        paymentReferenceToSave = normalizeOptionalPaymentReference(formState.paymentReference)
      } catch {
        setValidationError(
          'カード決済の管理番号を入力してください。カード番号は入力しないでください。'
        )
        return
      }
    }
    const paymentReferenceChanged =
      paymentReferenceToSave !== (reservation.paymentReference ?? null)

    setValidationError(null)
    setIsSaving(true)

    try {
      const updatePayload: ReservationUpdatePayload = {
        startTime: start,
        endTime: end,
        castId,
        storeMemo: formState.storeMemo,
        notes: formState.notes,
        designationType: designationTypeToSave,
        designationFee: designationFeeToSave,
        transportationFee: formState.transportationFee,
        additionalFee: formState.additionalFee,
        discountAmount: formState.discountAmount,
        pointsUsed: formState.pointsUsed,
        marketingChannel: formState.marketingChannel,
        areaId: formState.areaId ?? null,
        stationId: formState.stationId ?? null,
        hotelName: formState.hotelName || null,
        roomNumber: formState.roomNumber || null,
        locationMemo: formState.locationMemo,
      }

      if (courseChanged && courseIdToSave) {
        updatePayload.courseId = courseIdToSave
      }
      if (paymentMethodChanged) {
        updatePayload.paymentMethod = formState.paymentMethod
      }
      if (paymentMethodChanged || paymentReferenceChanged) {
        updatePayload.paymentReference = paymentReferenceToSave
      }
      if (optionsChanged) {
        updatePayload.options = formState.optionIds
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
    <>
      <Dialog open={open} onOpenChange={requestDialogOpenChange}>
        <DialogContent className="flex max-h-[90vh] max-w-6xl flex-col overflow-hidden p-0">
          <DialogTitle className="sr-only">{reservation.customerName} 様の予約詳細</DialogTitle>
          <DialogDescription className="sr-only">
            予約の詳細情報を表示し、必要に応じて編集できます。
          </DialogDescription>

          <div className="sticky top-0 z-20 border-b bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold">{reservation.customerName} 様</h2>
                  <StatusBadge status={status} marketingChannel={reservation.marketingChannel} />
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
                {status === 'cancelled' && reservation.cancellationReason ? (
                  <p className="mt-1 text-sm font-medium text-red-700">
                    キャンセル理由: {reservation.cancellationReason}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {reservation.phoneNumber ? (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`tel:${reservation.phoneNumber}`}
                      aria-label={`${reservation.phoneNumber}に電話`}
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      {reservation.phoneNumber}
                    </a>
                  </Button>
                ) : null}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={statusUpdating || !onSave || isEditMode || status === 'cancelled'}
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEnterEditMode}
                      disabled={!onSave || status === 'cancelled'}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      編集
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => requestDialogOpenChange(false)}
                      aria-label="予約詳細を閉じる"
                    >
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

            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as typeof activeTab)}
            >
              <div className="border-b bg-white px-4 pt-3">
                <TabsList className="grid w-full grid-cols-2 md:w-auto md:grid-cols-2">
                  <TabsTrigger value="overview">予約</TabsTrigger>
                  <TabsTrigger value="history" className="relative">
                    履歴
                    {modificationAlerts.length > 0 && (
                      <Badge variant="destructive" className="ml-2 h-4 px-1.5 py-0 text-xs">
                        {modificationAlerts.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="space-y-3 p-4">
                <ReservationPrimarySummary
                  reservation={reservation}
                  castWorkStatus={selectedCast?.workStatus}
                  courseName={selectedCourse?.name || reservation.course || '未設定'}
                  designationName={designationForDisplay?.name || reservation.designation || 'なし'}
                  optionNames={displayOptionNames}
                  canViewFinancialDetails={canViewFinancialDetails}
                  hotelName={formState.hotelName}
                  roomNumber={formState.roomNumber}
                  locationMemo={formState.locationMemo}
                  entrySending={entrySending}
                  canSave={Boolean(onSave)}
                  onHotelNameChange={(hotelName) => {
                    setFormState((prev) => ({ ...prev, hotelName }))
                    setEntryForm((prev) => ({ ...prev, hotelName }))
                  }}
                  onRoomNumberChange={(roomNumber) => {
                    setFormState((prev) => ({ ...prev, roomNumber }))
                    setEntryForm((prev) => ({ ...prev, roomNumber }))
                  }}
                  onLocationMemoChange={(locationMemo) =>
                    setFormState((prev) => ({ ...prev, locationMemo }))
                  }
                  onSaveEntryInfo={() => void handleSaveEntryInfo('save')}
                  onNotifyEntryInfo={() => void handleSaveEntryInfo('notify')}
                  isEditing={isEditMode}
                  courseOptions={courseOptions}
                  selectedCourseId={formState.courseId}
                  onCourseChange={(courseId) => setFormState((prev) => ({ ...prev, courseId }))}
                  optionChoices={optionChoices}
                  selectedOptionIds={formState.optionIds}
                  onOptionIdsChange={(optionIds) =>
                    setFormState((prev) => ({ ...prev, optionIds }))
                  }
                  priceBreakdown={priceBreakdown}
                  date={formState.date}
                  startTime={formState.startTime}
                  endTime={computedEndTime}
                  durationMinutes={effectiveDurationMinutes}
                  onDateChange={(date) => setFormState((prev) => ({ ...prev, date }))}
                  onStartTimeChange={(startTime) =>
                    setFormState((prev) => ({ ...prev, startTime }))
                  }
                  castId={activeCastId}
                  castChoices={castOptions}
                  onCastChange={(castId) => setFormState((prev) => ({ ...prev, castId }))}
                  onOpenCastTimeline={() => setIsCastTimelineOpen(true)}
                  ngWarning={
                    activeNgEntry
                      ? `この顧客は${
                          NG_REASON_LABELS[
                            (activeNgEntry.assignedBy ?? 'customer') as
                              | 'customer'
                              | 'cast'
                              | 'staff'
                          ]
                        }として現在のキャストをNG指定しています。別のキャストでのご案内をご検討ください。`
                      : null
                  }
                  additionalFee={formState.additionalFee}
                  discountAmount={formState.discountAmount}
                  pointsUsed={formState.pointsUsed}
                  paymentMethodValue={formState.paymentMethod}
                  paymentMethodOptions={paymentMethodOptions}
                  paymentReference={formState.paymentReference}
                  onAdditionalFeeChange={(additionalFee) =>
                    setFormState((prev) => ({ ...prev, additionalFee }))
                  }
                  onDiscountAmountChange={(discountAmount) =>
                    setFormState((prev) => ({ ...prev, discountAmount }))
                  }
                  onPointsUsedChange={(pointsUsed) =>
                    setFormState((prev) => ({ ...prev, pointsUsed }))
                  }
                  onPaymentMethodChange={(value) =>
                    setFormState((prev) => ({
                      ...prev,
                      paymentMethod: value as PaymentMethod,
                      paymentReference: value === PAYMENT_METHODS.CARD ? prev.paymentReference : '',
                    }))
                  }
                  onPaymentReferenceChange={(paymentReference) =>
                    setFormState((prev) => ({ ...prev, paymentReference }))
                  }
                  designationId={designationSelectValue === 'none' ? '' : designationSelectValue}
                  designationChoices={selectableDesignationOptions}
                  onDesignationChange={(value) => {
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
                  areaId={formState.areaId}
                  areaChoices={areas}
                  onAreaChange={(nextAreaId) =>
                    setFormState((prev) => {
                      const areaChanged = nextAreaId !== prev.areaId
                      return {
                        ...prev,
                        areaId: nextAreaId,
                        stationId: areaChanged ? null : prev.stationId,
                        transportationFee: areaChanged ? 0 : prev.transportationFee,
                      }
                    })
                  }
                  stationId={formState.stationId}
                  stationChoices={filteredStations}
                  onStationChange={(nextStationId) =>
                    setFormState((prev) => ({
                      ...prev,
                      stationId: nextStationId,
                      transportationFee: 0,
                    }))
                  }
                  locationsLoading={locationsLoading}
                />

                {isEditMode ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">集客</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <Label htmlFor="reservation-acquisition-method">集客手段</Label>
                        <Select
                          value={
                            parseMarketingChannel(formState.marketingChannel).method || undefined
                          }
                          onValueChange={(value) =>
                            setFormState((prev) => ({
                              ...prev,
                              marketingChannel: composeMarketingChannel(
                                value,
                                parseMarketingChannel(prev.marketingChannel).site
                              ),
                            }))
                          }
                        >
                          <SelectTrigger id="reservation-acquisition-method">
                            <SelectValue placeholder="手段を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {partitionedMarketingChannels.methods.map((channel) => (
                              <SelectItem key={channel} value={channel}>
                                {channel}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="reservation-channel">集客チャンネル</Label>
                        <Select
                          value={
                            parseMarketingChannel(formState.marketingChannel).site ?? '__none__'
                          }
                          onValueChange={(value) =>
                            setFormState((prev) => ({
                              ...prev,
                              marketingChannel: composeMarketingChannel(
                                parseMarketingChannel(prev.marketingChannel).method,
                                value === '__none__' ? null : value
                              ),
                            }))
                          }
                        >
                          <SelectTrigger id="reservation-channel">
                            <SelectValue placeholder="チャンネルを選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">なし</SelectItem>
                            {partitionedMarketingChannels.sites.map((channel) => (
                              <SelectItem key={channel} value={channel}>
                                {channel}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {isEditMode ? (
                  <div>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">店舗メモ</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          value={formState.storeMemo}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, storeMemo: event.target.value }))
                          }
                          rows={4}
                        />
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">予約内容</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <div className="text-muted-foreground">コース</div>
                        <div className="font-medium">{reservation.course || '未設定'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">オプション</div>
                        <div className="font-medium">
                          {initialOptionNames.length > 0 ? initialOptionNames.join('、') : 'なし'}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">指名区分</div>
                        <div className="font-medium">{reservation.designation || 'フリー'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">料金</div>
                        <div className="font-medium">
                          {formatCurrency(reservation.totalPayment)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {isEditMode ? (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">LINE通知</CardTitle>
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      {!selectedCast?.lineUserId && (
                        <Alert variant="destructive">
                          <AlertDescription>
                            キャストにLINEユーザーIDが未登録のため送信できません。キャスト管理でLINEユーザーIDを設定してください。
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="line-message">メッセージ本文</Label>
                        <Textarea
                          id="line-message"
                          value={lineMessage}
                          onChange={(event) => handleLineMessageChange(event.target.value)}
                          rows={6}
                          maxLength={MAX_LINE_MESSAGE_LENGTH}
                          placeholder={buildDefaultLineMessage()}
                        />
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={cn(
                              'text-muted-foreground',
                              isLineMessageTooLong && 'text-red-600'
                            )}
                          >
                            {lineMessageLength} / {MAX_LINE_MESSAGE_LENGTH} 文字
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleResetLineMessage}
                            disabled={lineSending}
                          >
                            テンプレートに戻す
                          </Button>
                        </div>
                        {isLineMessageTooLong && (
                          <p className="text-xs text-red-600">
                            メッセージは{MAX_LINE_MESSAGE_LENGTH}文字以内で入力してください。
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>送信プレビュー</Label>
                        <div className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
                          {lineMessageLength > 0 ? lineMessage : 'メッセージを入力してください。'}
                        </div>
                      </div>

                      {lineSendError && <p className="text-sm text-red-600">{lineSendError}</p>}
                      {lineSendSuccess && (
                        <p className="text-sm text-emerald-600">{lineSendSuccess}</p>
                      )}

                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <p className="text-xs text-muted-foreground">
                          送信先: {selectedCast?.name ?? 'キャスト未設定'}
                        </p>
                        <AlertDialog open={lineConfirmOpen} onOpenChange={setLineConfirmOpen}>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              disabled={lineSending || !canSendLineMessage || isEditMode || !onSave}
                            >
                              LINE送信
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>LINE通知を送信しますか？</AlertDialogTitle>
                              <AlertDialogDescription>
                                {selectedCast?.name
                                  ? `${selectedCast.name}さんに以下の内容でLINE通知を送信します。`
                                  : '以下の内容でLINE通知を送信します。'}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-mono text-sm leading-relaxed">
                              {lineMessageLength > 0
                                ? lineMessage
                                : 'メッセージを入力してください。'}
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={lineSending}>
                                キャンセル
                              </AlertDialogCancel>
                              <AlertDialogAction
                                disabled={lineSending}
                                onClick={handleConfirmSendLineMessage}
                              >
                                {lineSending ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    送信中...
                                  </>
                                ) : (
                                  '送信する'
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">送信ログ</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={refreshLineLogs}
                            disabled={isLoadingLineLogs}
                          >
                            {isLoadingLineLogs ? (
                              <span className="flex items-center gap-1">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> 更新中
                              </span>
                            ) : (
                              '更新'
                            )}
                          </Button>
                        </div>
                        {isLoadingLineLogs ? (
                          <p className="text-xs text-muted-foreground">
                            送信履歴を読み込んでいます...
                          </p>
                        ) : lineLogs.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            送信履歴はまだありません。
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {lineLogs.map((log) => (
                              <div key={log.id} className="rounded-md border p-3">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-medium">
                                    {format(log.createdAt, 'yyyy/MM/dd HH:mm')}
                                  </span>
                                  <Badge
                                    variant={log.status === 'sent' ? 'default' : 'destructive'}
                                  >
                                    {log.status === 'sent' ? '送信済み' : '送信失敗'}
                                  </Badge>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {log.castName ?? 'キャスト未設定'}
                                </p>
                                <pre className="mt-2 whitespace-pre-wrap rounded bg-muted/40 p-2 text-xs leading-relaxed">
                                  {log.message}
                                </pre>
                                {log.errorMessage && (
                                  <p className="mt-2 text-xs text-red-600">
                                    エラー: {log.errorMessage}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">予約詳細</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <div className="text-muted-foreground">コース</div>
                      <div className="font-medium">
                        {selectedCourse?.name || reservation.course || '未設定'}
                      </div>
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
                      {displayOptionNames.length > 0 ? (
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

                <Card>
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-sm font-medium">入室情報</CardTitle>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {entryMeta.entryNotifiedAt && (
                        <Badge variant="secondary" className="text-xs">
                          送信済み
                        </Badge>
                      )}
                      {entryMeta.entryConfirmedAt && (
                        <Badge className="bg-emerald-600 text-white">確認済み</Badge>
                      )}
                      {entryOverdue && !entryMeta.entryConfirmedAt && (
                        <Badge variant="destructive">未確認</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="entry-hotel-name">ホテル名</Label>
                        <Input
                          id="entry-hotel-name"
                          value={formState.hotelName}
                          onChange={(event) => {
                            const hotelName = event.target.value
                            setFormState((prev) => ({ ...prev, hotelName }))
                            setEntryForm((prev) => ({ ...prev, hotelName }))
                          }}
                          placeholder="例: 渋谷グランドホテル"
                          disabled={entrySending}
                        />
                      </div>
                      <div>
                        <Label htmlFor="entry-room-number">部屋番号</Label>
                        <Input
                          id="entry-room-number"
                          value={formState.roomNumber}
                          onChange={(event) => {
                            const roomNumber = event.target.value
                            setFormState((prev) => ({ ...prev, roomNumber }))
                            setEntryForm((prev) => ({ ...prev, roomNumber }))
                          }}
                          placeholder="例: 1203"
                          disabled={entrySending}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label htmlFor="entry-memo">連絡メモ</Label>
                        <Textarea
                          id="entry-memo"
                          value={entryForm.entryMemo}
                          onChange={(event) =>
                            setEntryForm((prev) => ({ ...prev, entryMemo: event.target.value }))
                          }
                          rows={3}
                          placeholder="例: フロントで鍵受け取り済み"
                          disabled={entrySending}
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
                      <div>
                        <div>受付時刻</div>
                        <div className="font-medium text-foreground">
                          {entryMeta.entryReceivedAt
                            ? format(entryMeta.entryReceivedAt, 'yyyy/MM/dd HH:mm')
                            : '未登録'}
                        </div>
                      </div>
                      <div>
                        <div>担当スタッフ</div>
                        <div className="font-medium text-foreground">
                          {entryMeta.entryReceivedBy || '未登録'}
                        </div>
                      </div>
                      <div>
                        <div>送信時刻</div>
                        <div className="font-medium text-foreground">
                          {entryMeta.entryNotifiedAt
                            ? format(entryMeta.entryNotifiedAt, 'yyyy/MM/dd HH:mm')
                            : '未送信'}
                        </div>
                      </div>
                      <div>
                        <div>確認時刻</div>
                        <div className="font-medium text-foreground">
                          {entryMeta.entryConfirmedAt
                            ? format(entryMeta.entryConfirmedAt, 'yyyy/MM/dd HH:mm')
                            : '未確認'}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => void handleSaveEntryInfo('notify')}
                        disabled={entrySending || isEditMode || !onSave}
                      >
                        {entrySending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        保存して通知
                      </Button>
                      {entryMeta.entryNotifiedAt && !entryMeta.entryConfirmedAt ? (
                        <Button
                          size="sm"
                          variant={entryOverdue ? 'destructive' : 'outline'}
                          onClick={handleSendEntryReminder}
                          disabled={entryReminderSending || isEditMode || !onSave}
                        >
                          {entryReminderSending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          再通知
                        </Button>
                      ) : null}
                    </div>

                    {entrySendError && <p className="text-sm text-red-600">{entrySendError}</p>}
                    {entrySendSuccess && (
                      <p className="text-sm text-emerald-600">{entrySendSuccess}</p>
                    )}
                  </CardContent>
                </Card>

                {isEditMode ? (
                  <ReservationEditPricePreview
                    priceBreakdown={priceBreakdown}
                    priceDelta={priceDelta}
                    originalTotal={originalTotal}
                    durationMinutes={effectiveDurationMinutes}
                    durationDelta={durationDelta}
                    originalDurationMinutes={reservationDurationMinutes}
                    endTime={
                      computedEndTime ||
                      (reservation?.endTime ? format(reservation.endTime, 'HH:mm') : '-')
                    }
                    options={selectedOptionDetails}
                  />
                ) : null}

                <ReservationNotesAndConfirmation
                  isEditMode={isEditMode}
                  notes={formState.notes}
                  staffConfirmation={reservation.staffConfirmation}
                  customerConfirmation={reservation.customerConfirmation}
                  onNotesChange={(notes) => setFormState((prev) => ({ ...prev, notes }))}
                />
              </TabsContent>

              <ReservationHistoryContent
                isLoading={isHistoryLoading}
                modifications={modificationHistory}
                alerts={modificationAlerts}
              />
            </Tabs>
          </div>
          <ReservationDialogFooter
            isEditMode={isEditMode}
            total={isEditMode ? priceBreakdown.total : originalTotal}
            priceDelta={priceDelta}
            durationMinutes={effectiveDurationMinutes}
            endTime={
              computedEndTime || (reservation?.endTime ? format(reservation.endTime, 'HH:mm') : '-')
            }
          />
        </DialogContent>
      </Dialog>
      <DiscardReservationEditDialog
        open={discardEditConfirmOpen}
        onOpenChange={setDiscardEditConfirmOpen}
        onDiscard={closeDialogWithoutSaving}
      />
      <ReservationCancellationDialog
        open={cancelReasonDialogOpen}
        onOpenChange={handleCancelReasonDialogToggle}
        source={cancelReason}
        onSourceChange={setCancelReason}
        reason={cancellationReason}
        onReasonChange={setCancellationReason}
        isSubmitting={statusUpdating}
        canConfirm={Boolean(pendingStatusChange) && cancellationReason.trim().length > 0}
        onConfirm={handleConfirmCancellation}
      />

      <CastTimelineModal
        open={isCastTimelineOpen}
        initialDate={timelineInitialDate}
        storeId={currentStore.id}
        selectedCastId={activeCastId || null}
        selectedSlotIso={selectedSlotIso}
        onClose={() => setIsCastTimelineOpen(false)}
        onSelectSlot={handleTimelineSelection}
      />
    </>
  )
}

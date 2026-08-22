/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md D-1 reservation module split
 * @related_to   TimeSlotPicker, reservation API, and quick-booking.utils reservation helpers
 * @known_issues None known within the one-page booking flow
 */
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { addMinutes, format } from 'date-fns'
import { formatInTimeZone, utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'
import { Phone, User, CreditCard, DollarSign, Check, Calendar, Users, Loader2 } from 'lucide-react'
import { Customer } from '@/lib/customer/types'
import { Cast } from '@/lib/cast/types'
import { usePricing } from '@/hooks/use-pricing'
import { useAvailability } from '@/hooks/use-availability'
import { TimeSlotPicker } from './time-slot-picker'
import { toast } from '@/hooks/use-toast'
import { isVipMember } from '@/lib/utils'
import { getDesignationFees } from '@/lib/designation/data'
import type { DesignationFee } from '@/lib/designation/types'
import { BusinessHoursRange, formatMinutesAsLabel } from '@/lib/settings/business-hours'
import { useStore } from '@/contexts/store-context'
import { calculateReservationRevenue } from '@/lib/reservation/revenue'
import { normalizePaymentReference } from '@/lib/reservation/financial-reference'
import { buildStoreCastEndpoint, buildStoreReservationEndpoint } from '@/lib/reservation/endpoints'
import { MARKETING_CHANNELS, PAYMENT_METHODS } from '@/lib/constants'
import {
  RESERVATION_START_STEP_MINUTES,
  RESERVATION_START_STEP_SECONDS,
} from '@/lib/reservation/time-boundary'
import {
  formatDateInJst,
  formatTimeInJst,
  formatYen,
  getCastAvailableOptions,
  getDesignationFeeAmount,
  getDesignationLabel,
  getUniqueSelectedOptionIds,
  normalizeToBusinessMinutes,
  type BookingDetails,
  type DesignationType,
  type NormalizedCourse,
  type NormalizedOption,
  type PriceBreakdown,
} from './quick-booking.utils'

const paymentMethods = Object.values(PAYMENT_METHODS)
const DEFAULT_MARKETING_CHANNELS = [...MARKETING_CHANNELS]

const JST_TIMEZONE = 'Asia/Tokyo'

interface QuickBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedStaff?: Cast
  selectedTime?: Date
  selectedSlot?: { startTime: Date; endTime: Date } | null
  selectedCustomer: Customer | null
  onReservationCreated?: (reservationId?: string) => void
  businessHours: BusinessHoursRange
}

interface InitialBookingDetailsInput {
  customer: Customer | null
  staffName: string
  selectedTime?: Date
  businessHoursStartLabel: string
  marketingChannel: string
}

function createInitialBookingDetails({
  customer,
  staffName,
  selectedTime,
  businessHoursStartLabel,
  marketingChannel,
}: InitialBookingDetailsInput): BookingDetails {
  return {
    customerName: customer?.name ?? '',
    customerType: customer ? (isVipMember(customer.memberType) ? 'VIP会員' : '通常会員') : '',
    phoneNumber: customer?.phone ?? '',
    points: customer?.points ?? 0,
    usePoints: false,
    pointsToUse: 0,
    areaId: '',
    stationId: '',
    stationName: '',
    stationTravelTime: 0,
    bookingStatus: '確定済',
    staff: staffName,
    marketingChannel,
    date: selectedTime ? formatDateInJst(selectedTime) : formatDateInJst(new Date()),
    time: selectedTime ? formatTimeInJst(selectedTime) : businessHoursStartLabel,
    options: {},
    transportationFee: 0,
    additionalFee: 0,
    discountAmount: 0,
    paymentMethod: PAYMENT_METHODS.CASH,
    paymentReference: '',
    locationMemo: '',
    notes: '',
  }
}

export function QuickBookingDialog({
  open,
  onOpenChange,
  selectedStaff,
  selectedTime,
  selectedSlot,
  selectedCustomer,
  onReservationCreated,
  businessHours,
}: QuickBookingDialogProps) {
  const { currentStore } = useStore()
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false)
  const wasOpenRef = useRef(false)
  const [staffDetails, setStaffDetails] = useState<Cast | null>(
    selectedStaff &&
      Array.isArray(selectedStaff.availableOptions) &&
      selectedStaff.availableOptions.length > 0
      ? selectedStaff
      : null
  )
  const [marketingChannels, setMarketingChannels] = useState<string[]>(DEFAULT_MARKETING_CHANNELS)

  const slotWindowStart = selectedSlot?.startTime ?? selectedTime ?? null
  const slotWindowEndLimit = selectedSlot?.endTime ?? null
  const slotHourWindowEnd =
    slotWindowStart !== null
      ? new Date(
          Math.min(
            slotWindowStart.getTime() + 60 * 60 * 1000,
            slotWindowEndLimit
              ? slotWindowEndLimit.getTime()
              : slotWindowStart.getTime() + 60 * 60 * 1000
          )
        )
      : (slotWindowEndLimit ?? null)
  const normalizedSlotHourWindowEnd =
    slotWindowStart && slotHourWindowEnd && slotHourWindowEnd.getTime() <= slotWindowStart.getTime()
      ? null
      : slotHourWindowEnd

  const {
    courses,
    options,
    coursePrices,
    optionPrices,
    loading: pricingLoading,
  } = usePricing(currentStore.id)

  const courseCatalog: NormalizedCourse[] = useMemo(() => {
    if (coursePrices.length > 0) {
      return coursePrices.map((course) => ({
        id: course.id,
        name: course.name,
        duration: course.duration,
        price: course.price,
        storeShare: course.storeShare ?? null,
        castShare: course.castShare ?? null,
      }))
    }

    return courses.map((course) => ({
      id: course.id,
      name: course.name,
      duration: course.duration,
      price: course.price,
      storeShare: null,
      castShare: null,
    }))
  }, [courses, coursePrices])

  const normalizedOptions: NormalizedOption[] = useMemo(() => {
    if (optionPrices.length > 0) {
      return optionPrices.map((option) => ({
        id: option.id,
        name: option.name,
        price: option.price,
        note: option.note,
        storeShare: option.storeShare ?? null,
        castShare: option.castShare ?? null,
      }))
    }

    return options.map((option) => ({
      id: option.id,
      name: option.name,
      price: option.price,
      note: option.note ?? null,
      storeShare: null,
      castShare: null,
    }))
  }, [optionPrices, options])

  const [designationFees, setDesignationFees] = useState<DesignationFee[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [designationType, setDesignationType] = useState<DesignationType>('none')
  const [selectedDesignationId, setSelectedDesignationId] = useState<string>('')

  useEffect(() => {
    let ignore = false

    if (!selectedStaff) {
      setStaffDetails(null)
      return
    }

    const hasDefinedOptions =
      Array.isArray(selectedStaff.availableOptions) && selectedStaff.availableOptions.length > 0

    if (hasDefinedOptions) {
      setStaffDetails(selectedStaff)
      return
    }

    const controller = new AbortController()

    ;(async () => {
      try {
        const response = await fetch(buildStoreCastEndpoint(currentStore.id, selectedStaff.id), {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch cast details for ${selectedStaff.id}`)
        }

        const payload = await response.json()
        const castData = (payload?.data ?? payload) as Cast

        if (!ignore) {
          setStaffDetails(castData)
        }
      } catch (error) {
        if (controller.signal.aborted || ignore) {
          return
        }
        console.error('Failed to load cast details:', error)
        setStaffDetails(null)
      }
    })()

    return () => {
      ignore = true
      controller.abort()
    }
  }, [currentStore.id, selectedStaff])

  const currentStaff = useMemo(
    () => staffDetails ?? selectedStaff ?? null,
    [staffDetails, selectedStaff]
  )

  const [bookingDetails, setBookingDetails] = useState<BookingDetails>(() =>
    createInitialBookingDetails({
      customer: selectedCustomer,
      staffName: selectedStaff?.name ?? '',
      selectedTime,
      businessHoursStartLabel: businessHours.startLabel,
      marketingChannel: DEFAULT_MARKETING_CHANNELS[0] ?? 'WEB',
    })
  )

  useEffect(() => {
    if (!pricingLoading && courseCatalog.length > 0) {
      setSelectedCourseId((prev) =>
        prev && courseCatalog.some((course) => course.id === prev) ? prev : courseCatalog[0].id
      )
    }
  }, [courseCatalog, pricingLoading])

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
          if (normalized.length > 0) {
            setMarketingChannels(Array.from(new Set(normalized)))
          }
        }
      } catch (error) {
        if (!ignore && !(error instanceof DOMException && error.name === 'AbortError')) {
          console.warn('[QuickBookingDialog] Failed to load store marketing channels', error)
        }
      }
    }

    loadStoreSettings()

    return () => {
      ignore = true
      controller.abort()
    }
  }, [currentStore?.id])

  useEffect(() => {
    if (marketingChannels.length === 0) {
      return
    }
    setBookingDetails((prev) => {
      if (prev.marketingChannel && marketingChannels.includes(prev.marketingChannel)) {
        return prev
      }
      return {
        ...prev,
        marketingChannel: marketingChannels[0],
      }
    })
  }, [marketingChannels])

  useEffect(() => {
    let ignore = false

    const loadDesignationFees = async () => {
      try {
        const fees = await getDesignationFees({
          storeId: currentStore.id,
        })
        if (!ignore) {
          setDesignationFees(fees)
        }
      } catch (error) {
        console.error('Failed to load designation fees:', error)
        if (!ignore) {
          setDesignationFees([])
        }
      }
    }

    loadDesignationFees()
    return () => {
      ignore = true
    }
  }, [currentStore.id])

  useEffect(() => {
    if (!open || designationFees.length === 0) {
      return
    }
    setSelectedDesignationId((prev) =>
      prev && designationFees.some((fee) => fee.id === prev) ? prev : designationFees[0].id
    )
  }, [designationFees, open])

  useEffect(() => {
    setBookingDetails((prev) => ({
      ...prev,
      customerName: selectedCustomer?.name ?? '',
      customerType: selectedCustomer
        ? isVipMember(selectedCustomer.memberType)
          ? 'VIP会員'
          : '通常会員'
        : '',
      phoneNumber: selectedCustomer?.phone ?? '',
      points: selectedCustomer?.points ?? 0,
      usePoints: false,
      pointsToUse: 0,
    }))
  }, [selectedCustomer])

  useEffect(() => {
    if (currentStaff) {
      setBookingDetails((prev) => ({
        ...prev,
        staff: currentStaff.name,
      }))

      setDesignationType((prev) => {
        if (prev === 'special' && currentStaff.specialDesignationFee) {
          return prev
        }
        if (prev === 'regular' && currentStaff.regularDesignationFee) {
          return prev
        }
        if (currentStaff.regularDesignationFee) {
          return 'regular'
        }
        if (currentStaff.specialDesignationFee) {
          return 'special'
        }
        return 'none'
      })
    } else {
      setDesignationType('none')
    }
  }, [currentStaff])

  useEffect(() => {
    if (selectedTime) {
      setBookingDetails((prev) => ({
        ...prev,
        date: formatDateInJst(selectedTime),
        time: formatTimeInJst(selectedTime),
      }))
    }
  }, [selectedTime])

  const selectedCourse = useMemo(
    () => courseCatalog.find((course) => course.id === selectedCourseId) ?? null,
    [courseCatalog, selectedCourseId]
  )

  const availableOptions = useMemo(
    () => getCastAvailableOptions(currentStaff ?? undefined, normalizedOptions),
    [normalizedOptions, currentStaff]
  )

  useEffect(() => {
    setBookingDetails((prev) => {
      if (Object.keys(prev.options).length === 0) {
        return prev
      }

      const validIds = new Set(availableOptions.map((option) => option.id))
      const nextOptions = Object.fromEntries(
        Object.entries(prev.options).filter(([optionId]) => validIds.has(optionId))
      )

      if (Object.keys(nextOptions).length === Object.keys(prev.options).length) {
        return prev
      }

      return {
        ...prev,
        options: nextOptions,
      }
    })
  }, [availableOptions])

  const optionSelections = useMemo(
    () =>
      Object.entries(bookingDetails.options)
        .filter(([, selected]) => selected)
        .map(([optionId]) => optionId),
    [bookingDetails.options]
  )

  const selectedOptionDetails = useMemo(
    () => availableOptions.filter((option) => optionSelections.includes(option.id)),
    [availableOptions, optionSelections]
  )

  const selectedDesignationFee = useMemo(() => {
    if (!selectedDesignationId) return null
    return designationFees.find((fee) => fee.id === selectedDesignationId) ?? null
  }, [selectedDesignationId, designationFees])

  const welfareRate = useMemo(() => {
    const castRate = currentStaff?.welfareExpenseRate
    if (typeof castRate === 'number' && Number.isFinite(castRate)) {
      return castRate
    }
    const storeRate = currentStore?.welfareExpenseRate
    if (typeof storeRate === 'number' && Number.isFinite(storeRate)) {
      return storeRate
    }
    return 10
  }, [currentStaff?.welfareExpenseRate, currentStore?.welfareExpenseRate])

  const priceBreakdown = useMemo<PriceBreakdown>(() => {
    const basePrice = selectedCourse?.price ?? 0
    const designationFeeAmount =
      selectedDesignationFee?.price ??
      getDesignationFeeAmount(designationType, currentStaff ?? undefined)
    const transportationFee = bookingDetails.transportationFee || 0
    const additionalFee = bookingDetails.additionalFee || 0
    const discountAmount = Math.max(bookingDetails.discountAmount || 0, 0)

    const revenue = calculateReservationRevenue({
      basePrice,
      options: selectedOptionDetails.map((option) => ({
        price: option.price,
        storeShare: option.storeShare ?? undefined,
        castShare: option.castShare ?? undefined,
      })),
      designation:
        designationFeeAmount > 0
          ? {
              amount: designationFeeAmount,
              storeShare: selectedDesignationFee?.storeShare ?? 0,
              castShare: selectedDesignationFee?.castShare ?? designationFeeAmount,
            }
          : null,
      transportationFee,
      additionalFee,
      discountAmount,
      welfareRate,
    })

    const availablePoints = selectedCustomer?.points ?? bookingDetails.points ?? 0
    const requestedPoints = bookingDetails.usePoints
      ? Math.max(0, Math.floor(bookingDetails.pointsToUse || 0))
      : 0
    const pointsApplied = Math.min(availablePoints, Math.min(requestedPoints, revenue.total))

    return {
      basePrice,
      designationFee: designationFeeAmount,
      optionsTotal: revenue.optionsTotal,
      transportationFee,
      additionalFee,
      discount: discountAmount,
      subtotal: revenue.total,
      pointsApplied,
      total: Math.max(revenue.total - pointsApplied, 0),
      storeRevenue: revenue.storeRevenue,
      staffRevenue: revenue.staffRevenue,
      welfareExpense: revenue.welfareExpense,
      welfareRate: revenue.welfareRate,
    }
  }, [
    bookingDetails.additionalFee,
    bookingDetails.transportationFee,
    bookingDetails.discountAmount,
    bookingDetails.points,
    bookingDetails.pointsToUse,
    bookingDetails.usePoints,
    designationType,
    selectedCustomer?.points,
    selectedCourse,
    selectedOptionDetails,
    currentStaff,
    selectedDesignationFee,
    welfareRate,
  ])

  const handleTextChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target
    setBookingDetails((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleNumberChange = (name: keyof BookingDetails, value: number) => {
    setBookingDetails((prev) => ({
      ...prev,
      [name]: Number.isNaN(value) ? 0 : value,
    }))
  }

  const handleCheckboxChange = (optionId: string, checked: boolean) => {
    setBookingDetails((prev) => ({
      ...prev,
      options: {
        ...prev.options,
        [optionId]: checked,
      },
    }))
  }

  const { checkAvailability } = useAvailability()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!currentStaff) {
      toast({
        title: '担当者未選択',
        description: '担当キャストを選択してください。',
        variant: 'destructive',
      })
      return
    }

    if (!selectedCourse) {
      toast({
        title: 'コース未選択',
        description: 'コースを選択してください。',
        variant: 'destructive',
      })
      return
    }

    if (!selectedCustomer) {
      toast({
        title: '顧客未選択',
        description: '顧客を選択してください。',
        variant: 'destructive',
      })
      return
    }

    if (!bookingDetails.date || !bookingDetails.time) {
      toast({
        title: '日時未設定',
        description: '予約日時を入力してください。',
        variant: 'destructive',
      })
      return
    }

    const courseDuration = selectedCourse?.duration ?? 0
    if (!selectedCourse || courseDuration <= 0) {
      toast({
        title: 'コース未選択',
        description: '予約するコースを選択してください。',
        variant: 'destructive',
      })
      return
    }

    const bookingStartMinutes = normalizeToBusinessMinutes(bookingDetails.time, businessHours)
    if (bookingStartMinutes === null) {
      toast({
        title: '時間の形式が不正です',
        description: '有効な時間を入力してください。',
        variant: 'destructive',
      })
      return
    }

    if (bookingStartMinutes % RESERVATION_START_STEP_MINUTES !== 0) {
      toast({
        title: '開始時間は30分単位で入力してください',
        description: '開始時間の分は00分または30分を指定してください。',
        variant: 'destructive',
      })
      return
    }

    if (bookingStartMinutes < businessHours.startMinutes) {
      toast({
        title: '営業時間外です',
        description: `開始時間は営業開始時刻（${formatMinutesAsLabel(businessHours.startMinutes)}）以降を指定してください。`,
        variant: 'destructive',
      })
      return
    }

    const bookingEndMinutes = bookingStartMinutes + courseDuration
    if (bookingEndMinutes > businessHours.endMinutes) {
      toast({
        title: '営業時間外です',
        description: `コース終了時刻が営業時間外になります。${formatMinutesAsLabel(businessHours.endMinutes)}までに終了する時間を選択してください。`,
        variant: 'destructive',
      })
      return
    }

    const startTime = zonedTimeToUtc(
      `${bookingDetails.date}T${bookingDetails.time}:00`,
      JST_TIMEZONE
    )
    const nowUtc = new Date()
    if (startTime.getTime() <= nowUtc.getTime()) {
      toast({
        title: '過去の時間は選択できません',
        description: '現在時刻より後の時間を選択してください。',
        variant: 'destructive',
      })
      return
    }

    const endTime = addMinutes(startTime, courseDuration)

    try {
      setIsSubmitting(true)

      const availability = await checkAvailability(currentStaff.id, startTime, endTime)
      if (!availability.available) {
        toast({
          title: '予約不可',
          description: 'この時間帯は既に予約が入っています。別の時間を選択してください。',
          variant: 'destructive',
        })
        return
      }

      const selectedOptionIds = getUniqueSelectedOptionIds(optionSelections)

      const response = await fetch(buildStoreReservationEndpoint(currentStore.id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          castId: currentStaff.id,
          courseId: selectedCourseId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          status: bookingDetails.bookingStatus === '仮予約' ? 'pending' : 'confirmed',
          options: selectedOptionIds,
          price: priceBreakdown.total,
          designationType:
            selectedDesignationFee?.name ??
            getDesignationLabel(designationType, currentStaff ?? undefined),
          designationFee: priceBreakdown.designationFee,
          transportationFee: 0,
          additionalFee: priceBreakdown.additionalFee,
          discountAmount: priceBreakdown.discount,
          pointsUsed: priceBreakdown.pointsApplied,
          paymentMethod: bookingDetails.paymentMethod,
          paymentReference:
            bookingDetails.paymentMethod === PAYMENT_METHODS.CARD
              ? normalizePaymentReference(bookingDetails.paymentReference)
              : null,
          marketingChannel: bookingDetails.marketingChannel,
          areaId: null,
          stationId: null,
          locationMemo: '',
          notes: bookingDetails.notes,
          storeRevenue: priceBreakdown.storeRevenue,
          staffRevenue: priceBreakdown.staffRevenue,
          welfareExpense: priceBreakdown.welfareExpense,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        let errorMessage =
          data?.error ||
          (response.status === 409 ? 'この時間帯は予約できません。' : '予約の作成に失敗しました')

        if (
          response.status === 409 &&
          data &&
          Array.isArray(data.conflicts) &&
          data.conflicts.length > 0
        ) {
          const conflict = data.conflicts[0]
          try {
            const conflictStart = new Date(conflict.startTime)
            const conflictEnd = new Date(conflict.endTime)
            if (!Number.isNaN(conflictStart.getTime()) && !Number.isNaN(conflictEnd.getTime())) {
              const startLabel = formatInTimeZone(conflictStart, JST_TIMEZONE, 'HH:mm')
              const endLabel = formatInTimeZone(conflictEnd, JST_TIMEZONE, 'HH:mm')
              errorMessage = `この時間帯（${startLabel}〜${endLabel}）は既に予約済みです。`
            }
          } catch {
            // ignore parsing errors, fallback to default message
          }
        }

        throw new Error(errorMessage)
      }

      const reservationId =
        data && typeof data === 'object'
          ? (data.id as string | undefined) || (data.data?.id as string | undefined)
          : undefined

      toast({
        title: '予約完了',
        description: '予約が正常に作成されました。',
      })

      if (onReservationCreated) {
        onReservationCreated(reservationId)
      }

      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '予約の作成に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedTimeIso =
    bookingDetails.date && bookingDetails.time
      ? zonedTimeToUtc(
          `${bookingDetails.date}T${bookingDetails.time}:00`,
          JST_TIMEZONE
        ).toISOString()
      : undefined

  const hasUnsavedInput =
    bookingDetails.usePoints ||
    bookingDetails.pointsToUse > 0 ||
    bookingDetails.additionalFee > 0 ||
    bookingDetails.discountAmount > 0 ||
    bookingDetails.notes.trim().length > 0 ||
    bookingDetails.paymentReference.trim().length > 0 ||
    Object.values(bookingDetails.options).some(Boolean)

  const closeWithoutSaving = () => {
    setDiscardConfirmOpen(false)
    onOpenChange(false)
  }

  const handleDialogOpenChange = (next: boolean) => {
    if (!next && hasUnsavedInput && !isSubmitting) {
      setDiscardConfirmOpen(true)
      return
    }

    onOpenChange(next)
  }

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current
    wasOpenRef.current = open
    if (!justOpened) return

    setDiscardConfirmOpen(false)
    setSelectedCourseId(courseCatalog[0]?.id ?? '')
    setSelectedDesignationId(designationFees[0]?.id ?? '')
    setBookingDetails(
      createInitialBookingDetails({
        customer: selectedCustomer,
        staffName: currentStaff?.name ?? '',
        selectedTime,
        businessHoursStartLabel: businessHours.startLabel,
        marketingChannel: marketingChannels[0] ?? DEFAULT_MARKETING_CHANNELS[0] ?? 'WEB',
      })
    )
    setDesignationType('none')
  }, [
    open,
    selectedCustomer,
    currentStaff,
    selectedTime,
    courseCatalog,
    designationFees,
    businessHours.startLabel,
    marketingChannels,
  ])

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="flex max-h-[90vh] max-w-6xl flex-col overflow-hidden">
          <DialogDescription className="sr-only">
            基本情報から確認内容までを一画面で入力し、予約を確定します。
          </DialogDescription>
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold">予約受付</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-2">
            <div className="grid gap-4 pb-6 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <User className="mr-2 h-5 w-5" />
                    お客様情報
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {bookingDetails.customerName || '未選択'}
                        </h3>
                        <Badge variant="secondary" className="mt-1">
                          {bookingDetails.customerType || '---'}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center">
                          <Phone className="mr-1 h-4 w-4" />
                          <span className="font-semibold">
                            {bookingDetails.phoneNumber || '未設定'}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          現在 {bookingDetails.points.toLocaleString()}pt
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    サービス詳細
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>日付</Label>
                      <Input
                        type="date"
                        name="date"
                        value={bookingDetails.date}
                        onChange={handleTextChange}
                      />
                    </div>
                    <div>
                      <Label>時間</Label>
                      <Input
                        type="time"
                        name="time"
                        step={RESERVATION_START_STEP_SECONDS}
                        value={bookingDetails.time}
                        onChange={handleTextChange}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>時間帯を選択</Label>
                      {currentStaff && bookingDetails.date && selectedCourse ? (
                        <TimeSlotPicker
                          castId={currentStaff.id}
                          date={bookingDetails.date}
                          duration={selectedCourse.duration}
                          selectedTime={selectedTimeIso}
                          onTimeSelect={(time) => {
                            const zoned = utcToZonedTime(new Date(time), JST_TIMEZONE)
                            setBookingDetails((prev) => ({
                              ...prev,
                              time: format(zoned, 'HH:mm'),
                              date: format(zoned, 'yyyy-MM-dd'),
                            }))
                          }}
                          businessHours={businessHours}
                          windowStart={slotWindowStart ?? undefined}
                          windowEnd={normalizedSlotHourWindowEnd ?? undefined}
                          stepMinutes={RESERVATION_START_STEP_MINUTES}
                        />
                      ) : (
                        <div className="rounded-lg bg-gray-50 p-4 text-center text-gray-500">
                          担当者・日付・コースを選択すると空き時間が表示されます
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>キャスト</Label>
                    <Input
                      value={bookingDetails.staff || '未選択'}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>

                  <div>
                    <Label>コース選択</Label>
                    <Select
                      value={selectedCourseId}
                      onValueChange={(value) => setSelectedCourseId(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="コースを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {pricingLoading ? (
                          <div className="px-4 py-2 text-sm text-gray-500">読み込み中...</div>
                        ) : courseCatalog.length === 0 ? (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            利用可能なコースがありません
                          </div>
                        ) : (
                          courseCatalog.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.name} {course.duration}分 {course.price.toLocaleString()}円
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <DollarSign className="mr-2 h-5 w-5" />
                    指名設定
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {designationFees.map((fee) => (
                      <Button
                        key={fee.id}
                        type="button"
                        size="sm"
                        variant={selectedDesignationId === fee.id ? 'default' : 'outline'}
                        onClick={() => setSelectedDesignationId(fee.id)}
                      >
                        {fee.name}
                        <span className="ml-2 text-xs text-gray-500">
                          {fee.price > 0 ? formatYen(fee.price) : '0円'}
                        </span>
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    {selectedDesignationFee?.name?.includes('フリー') ||
                    selectedDesignationFee?.price === 0
                      ? '指名欄: フリー（担当キャストを固定しない）'
                      : `選択中: ${selectedDesignationFee?.name ?? 'なし'}`}
                    {priceBreakdown.designationFee > 0
                      ? `（${formatYen(priceBreakdown.designationFee)}）`
                      : ''}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    オプション選択
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {availableOptions.length === 0 ? (
                    <div className="rounded-lg bg-gray-50 p-4 text-center text-gray-500">
                      利用可能なオプションがありません
                    </div>
                  ) : (
                    availableOptions.map((option) => {
                      const optionCheckboxId = `quick-booking-option-${option.id}`
                      const isSelected = Boolean(bookingDetails.options[option.id])

                      return (
                        <Label
                          key={option.id}
                          htmlFor={optionCheckboxId}
                          data-testid={`option-row-${option.id}`}
                          className={`flex w-full cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'hover:border-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          <span className="flex items-center">
                            <Checkbox
                              id={optionCheckboxId}
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                handleCheckboxChange(option.id, Boolean(checked))
                              }
                            />
                            <span className="ml-3 font-medium">
                              {option.name}
                              {option.note ? (
                                <span className="ml-2 text-xs text-gray-500">({option.note})</span>
                              ) : null}
                            </span>
                          </span>
                          <Badge variant="secondary">
                            {option.price === 0 ? '無料' : `+${option.price.toLocaleString()}円`}
                          </Badge>
                        </Label>
                      )
                    })
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <CreditCard className="mr-2 h-5 w-5" />
                    支払い・受付情報
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quick-booking-payment-method">支払い方法</Label>
                      <Select
                        value={bookingDetails.paymentMethod}
                        onValueChange={(value) =>
                          setBookingDetails((prev) => ({
                            ...prev,
                            paymentMethod: value,
                            paymentReference:
                              value === PAYMENT_METHODS.CARD ? prev.paymentReference : '',
                          }))
                        }
                      >
                        <SelectTrigger id="quick-booking-payment-method">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map((method) => (
                            <SelectItem key={method} value={method}>
                              {method}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>集客チャネル</Label>
                      <Select
                        value={bookingDetails.marketingChannel}
                        onValueChange={(value) =>
                          setBookingDetails((prev) => ({ ...prev, marketingChannel: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {marketingChannels.map((channel) => (
                            <SelectItem key={channel} value={channel}>
                              {channel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {bookingDetails.paymentMethod === PAYMENT_METHODS.CARD ? (
                    <div>
                      <Label htmlFor="quick-booking-payment-reference">
                        カード決済管理番号を入力してください
                      </Label>
                      <Input
                        id="quick-booking-payment-reference"
                        name="paymentReference"
                        aria-label="カード決済管理番号"
                        value={bookingDetails.paymentReference}
                        onChange={handleTextChange}
                        maxLength={100}
                        autoComplete="off"
                        placeholder="決済伝票の管理番号（カード番号は入力しない）"
                        className={
                          bookingDetails.paymentReference.trim()
                            ? 'border-emerald-400 bg-emerald-50'
                            : 'border-amber-400 bg-amber-50'
                        }
                      />
                    </div>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>追加料金（円）</Label>
                      <Input
                        type="number"
                        value={bookingDetails.additionalFee}
                        onChange={(event) =>
                          handleNumberChange('additionalFee', Number(event.target.value))
                        }
                        min={0}
                      />
                    </div>
                    <div>
                      <Label>割引（円）</Label>
                      <Input
                        type="number"
                        value={bookingDetails.discountAmount}
                        onChange={(event) =>
                          handleNumberChange(
                            'discountAmount',
                            Math.max(Number(event.target.value), 0)
                          )
                        }
                        min={0}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label htmlFor="provisional-booking" className="text-sm font-medium">
                          仮予約として保存
                        </Label>
                        <p className="text-xs text-gray-500">
                          確定前の予約として登録する場合のみ選択してください
                        </p>
                      </div>
                      <Switch
                        id="provisional-booking"
                        checked={bookingDetails.bookingStatus === '仮予約'}
                        onCheckedChange={(checked) =>
                          setBookingDetails((prev) => ({
                            ...prev,
                            bookingStatus: checked ? '仮予約' : '確定済',
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">ポイントを利用</Label>
                        <p className="text-xs text-gray-500">
                          利用可能ポイント: {bookingDetails.points.toLocaleString()}pt
                        </p>
                      </div>
                      <Switch
                        disabled={!selectedCustomer}
                        checked={bookingDetails.usePoints}
                        onCheckedChange={(checked) =>
                          setBookingDetails((prev) => ({
                            ...prev,
                            usePoints: Boolean(checked),
                            pointsToUse: checked ? prev.pointsToUse : 0,
                          }))
                        }
                      />
                    </div>
                    {bookingDetails.usePoints && (
                      <div className="mt-3">
                        <Label htmlFor="pointsToUse">利用ポイント数</Label>
                        <Input
                          id="pointsToUse"
                          type="number"
                          min={0}
                          value={bookingDetails.pointsToUse}
                          onChange={(event) =>
                            setBookingDetails((prev) => ({
                              ...prev,
                              pointsToUse: Number(event.target.value),
                            }))
                          }
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          入力したポイントが自動で差し引かれます
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>メモ</Label>
                    <Textarea
                      name="notes"
                      value={bookingDetails.notes}
                      onChange={handleTextChange}
                      placeholder="店舗用メモがあれば記載してください"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>料金内訳</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>基本料金</span>
                      <span>{formatYen(priceBreakdown.basePrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{selectedDesignationFee?.name ?? 'フリー'}料</span>
                      <span>{formatYen(priceBreakdown.designationFee)}</span>
                    </div>
                    {priceBreakdown.optionsTotal > 0 && (
                      <div className="flex justify-between">
                        <span>オプション</span>
                        <span>{formatYen(priceBreakdown.optionsTotal)}</span>
                      </div>
                    )}
                    {priceBreakdown.additionalFee > 0 && (
                      <div className="flex justify-between">
                        <span>追加料金</span>
                        <span>{formatYen(priceBreakdown.additionalFee)}</span>
                      </div>
                    )}
                    {priceBreakdown.discount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>割引</span>
                        <span>-{formatYen(priceBreakdown.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>小計</span>
                      <span>{formatYen(priceBreakdown.subtotal)}</span>
                    </div>
                    {priceBreakdown.pointsApplied > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>ポイント利用</span>
                        <span>-{formatYen(priceBreakdown.pointsApplied)}</span>
                      </div>
                    )}
                    <hr className="my-2" />
                    <div className="flex justify-between text-lg font-bold">
                      <span>合計</span>
                      <span className="font-bold">{formatYen(priceBreakdown.total)}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-xs text-gray-500">
                      <div className="rounded-md bg-gray-100 p-2">
                        店舗売上: {formatYen(priceBreakdown.storeRevenue)}
                      </div>
                      <div className="rounded-md bg-gray-100 p-2">
                        キャスト売上: {formatYen(priceBreakdown.staffRevenue)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div
            data-testid="quick-booking-sticky-footer"
            className="sticky bottom-0 z-10 -mx-6 -mb-6 shrink-0 border-t bg-background px-6 py-4 shadow-[0_-8px_18px_-16px_rgba(0,0,0,0.45)]"
          >
            <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  処理中...
                </>
              ) : (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  {bookingDetails.bookingStatus === '仮予約' ? '仮予約として保存' : '予約を確定'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>入力内容を破棄しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              保存していない受付内容があります。閉じると入力内容は破棄されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>戻る</AlertDialogCancel>
            <AlertDialogAction onClick={closeWithoutSaving}>破棄する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { format, addMinutes } from 'date-fns'
import { utcToZonedTime, zonedTimeToUtc, formatInTimeZone } from 'date-fns-tz'
import {
  Phone,
  Clock,
  User,
  MapPin,
  CreditCard,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  Check,
  Calendar,
  Users,
  Loader2,
  Train,
} from 'lucide-react'
import { Customer } from '@/lib/customer/types'
import { Cast } from '@/lib/cast/types'
import { usePricing } from '@/hooks/use-pricing'
import { useAvailability } from '@/hooks/use-availability'
import { useLocations } from '@/hooks/use-locations'
import { TimeSlotPicker } from './time-slot-picker'
import { toast } from '@/hooks/use-toast'
import { isVipMember } from '@/lib/utils'
import { resolveOptionId } from '@/lib/options/data'
import { getDesignationFees } from '@/lib/designation/data'
import type { DesignationFee } from '@/lib/designation/types'
import { BusinessHoursRange, formatMinutesAsLabel } from '@/lib/settings/business-hours'
import { useStore } from '@/contexts/store-context'
import { calculateReservationRevenue } from '@/lib/reservation/revenue'
import { MARKETING_CHANNELS, PAYMENT_METHODS } from '@/lib/constants'

type DesignationType = 'none' | 'regular' | 'special'

type PriceBreakdown = {
  basePrice: number
  designationFee: number
  optionsTotal: number
  transportationFee: number
  additionalFee: number
  discount: number
  total: number
  subtotal: number
  pointsApplied: number
  storeRevenue: number
  staffRevenue: number
  welfareExpense: number
  welfareRate: number
}

const paymentMethods = Object.values(PAYMENT_METHODS)
const DEFAULT_MARKETING_CHANNELS = [...MARKETING_CHANNELS]

const formatYen = (amount: number) => `${amount.toLocaleString()}円`

const JST_TIMEZONE = 'Asia/Tokyo'
const formatDateInJst = (date: Date) =>
  format(utcToZonedTime(date, JST_TIMEZONE), 'yyyy-MM-dd')

const formatTimeInJst = (date: Date) =>
  format(utcToZonedTime(date, JST_TIMEZONE), 'HH:mm')

const MINUTES_IN_DAY = 24 * 60

const timeStringToMinutes = (value: string): number | null => {
  const match = value.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return hours * 60 + minutes
}

const normalizeToBusinessMinutes = (
  timeValue: string,
  range: BusinessHoursRange
): number | null => {
  const base = timeStringToMinutes(timeValue)
  if (base === null) return null
  if (range.endMinutes > MINUTES_IN_DAY && base < range.startMinutes) {
    return base + MINUTES_IN_DAY
  }
  return base
}

const getDesignationFeeAmount = (type: DesignationType, cast?: Cast) => {
  if (!cast) return 0
  if (type === 'special') {
    return cast.specialDesignationFee ?? 0
  }
  if (type === 'regular') {
    return cast.regularDesignationFee ?? 0
  }
  return 0
}

const getDesignationLabel = (type: DesignationType, cast?: Cast) => {
  if (!cast) return 'フリー'
  if (type === 'special' && cast.specialDesignationFee) {
    return '特別指名'
  }
  if (type === 'regular' && cast.regularDesignationFee) {
    return '本指名'
  }
  return 'フリー'
}

interface NormalizedCourse {
  id: string
  name: string
  duration: number
  price: number
  storeShare?: number | null
  castShare?: number | null
}

interface NormalizedOption {
  id: string
  name: string
  price: number
  note?: string | null
  storeShare?: number | null
  castShare?: number | null
}

export function getCastAvailableOptions(
  cast: Cast | null | undefined,
  options: NormalizedOption[]
): NormalizedOption[] {
  if (!cast) {
    return []
  }

  const allowedIds = new Set((cast.availableOptions ?? []).map((value) => resolveOptionId(value)))

  if (allowedIds.size === 0) {
    return []
  }

  return options.filter((option) => {
    const optionId = option.id
    const resolvedOptionId = resolveOptionId(optionId)
    return allowedIds.has(optionId) || allowedIds.has(resolvedOptionId)
  })
}

interface BookingDetails {
  customerName: string
  customerType: string
  phoneNumber: string
  points: number
  usePoints: boolean
  pointsToUse: number
  areaId: string
  stationId: string
  stationName: string
  stationTravelTime: number
  bookingStatus: string
  staff: string
  marketingChannel: string
  date: string
  time: string
  options: Record<string, boolean>
  transportationFee: number
  additionalFee: number
  discountAmount: number
  paymentMethod: string
  locationMemo: string
  notes: string
}

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
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 3
  const [staffDetails, setStaffDetails] = useState<Cast | null>(
    selectedStaff && Array.isArray(selectedStaff.availableOptions) && selectedStaff.availableOptions.length > 0
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
            slotWindowEndLimit ? slotWindowEndLimit.getTime() : slotWindowStart.getTime() + 60 * 60 * 1000
          )
        )
      : slotWindowEndLimit ?? null
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
  const { areas, stations, loading: locationsLoading } = useLocations()

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

  const [selectedAreaId, setSelectedAreaId] = useState<string>('')
  const [selectedStationId, setSelectedStationId] = useState<string>('')

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
        const response = await fetch(`/api/cast?id=${selectedStaff.id}`, {
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
  }, [selectedStaff])

  const currentStaff = useMemo(() => staffDetails ?? selectedStaff ?? null, [staffDetails, selectedStaff])

  const [bookingDetails, setBookingDetails] = useState<BookingDetails>({
    customerName: selectedCustomer?.name ?? '',
    customerType: selectedCustomer ? (isVipMember(selectedCustomer.memberType) ? 'VIP会員' : '通常会員') : '',
    phoneNumber: selectedCustomer?.phone ?? '',
    points: selectedCustomer?.points ?? 0,
    usePoints: false,
    pointsToUse: 0,
    areaId: '',
    stationId: '',
    stationName: '',
    stationTravelTime: 0,
    bookingStatus: '仮予約',
    staff: selectedStaff?.name ?? '',
    marketingChannel: DEFAULT_MARKETING_CHANNELS[0] ?? 'WEB',
    date: selectedTime ? formatDateInJst(selectedTime) : formatDateInJst(new Date()),
    time: selectedTime ? formatTimeInJst(selectedTime) : businessHours.startLabel,
    options: {},
    transportationFee: 0,
    additionalFee: 0,
    discountAmount: 0,
    paymentMethod: PAYMENT_METHODS.CASH,
    locationMemo: '',
    notes: '',
  })

  useEffect(() => {
    if (!pricingLoading && courseCatalog.length > 0) {
      setSelectedCourseId((prev) => prev || courseCatalog[0].id)
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
    if (!locationsLoading && areas.length > 0) {
      setSelectedAreaId((prev) => prev || areas[0].id)
    }
  }, [areas, locationsLoading])

  useEffect(() => {
    if (!selectedAreaId) {
      setSelectedStationId('')
      return
    }
    const areaStations = stations.filter((station) => station.areaId === selectedAreaId)
    if (areaStations.length === 0) {
      setSelectedStationId('')
      return
    }
    setSelectedStationId((prev) =>
      prev && areaStations.some((station) => station.id === prev) ? prev : areaStations[0].id
    )
  }, [selectedAreaId, stations])

  useEffect(() => {
    const area = areas.find((entry) => entry.id === selectedAreaId)
    const station = stations.find((entry) => entry.id === selectedStationId)

    setBookingDetails((prev) => ({
      ...prev,
      areaId: selectedAreaId,
      stationId: selectedStationId,
      stationName: station?.name ?? '',
      stationTravelTime: station?.travelTime ?? 0,
      locationMemo: prev.locationMemo || station?.name || '',
      transportationFee: station?.transportationFee ?? prev.transportationFee,
    }))

    if (area) {
      setBookingDetails((prev) => ({
        ...prev,
        marketingChannel:
          prev.marketingChannel && marketingChannels.includes(prev.marketingChannel)
            ? prev.marketingChannel
            : marketingChannels[0] ?? prev.marketingChannel ?? DEFAULT_MARKETING_CHANNELS[0] ?? 'WEB',
      }))
    }
  }, [selectedAreaId, selectedStationId, areas, stations, marketingChannels])

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
      selectedDesignationFee?.price ?? getDesignationFeeAmount(designationType, currentStaff ?? undefined)
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

  const validateStep = () => {
    if (currentStep === 1) {
      if (!selectedCustomer) {
        toast({
          title: '顧客未選択',
          description: '顧客を選択してから進めてください。',
          variant: 'destructive',
        })
        return false
      }
      if (!selectedCourse) {
        toast({
          title: 'コース未選択',
          description: 'コースを選択してください。',
          variant: 'destructive',
        })
        return false
      }
      if (!bookingDetails.date || !bookingDetails.time) {
        toast({
          title: '日時未設定',
          description: '予約日時を入力してください。',
          variant: 'destructive',
        })
        return false
      }

      const bookingStartMinutes = normalizeToBusinessMinutes(
        bookingDetails.time,
        businessHours
      )

      if (bookingStartMinutes === null) {
        toast({
          title: '時間形式エラー',
          description: '有効な時間を入力してください。',
          variant: 'destructive',
        })
        return false
      }

      if (selectedCourse) {
        const bookingEndMinutes = bookingStartMinutes + selectedCourse.duration
        if (
          bookingStartMinutes < businessHours.startMinutes ||
          bookingEndMinutes > businessHours.endMinutes
        ) {
          toast({
            title: '営業時間外',
            description: `営業時間内（${businessHours.startLabel}〜${businessHours.endLabel}）で時間を選択してください。`,
            variant: 'destructive',
          })
          return false
        }
      }
    }

    return true
  }

  const nextStep = () => {
    if (!validateStep()) return
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

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

    const bookingStartMinutes = normalizeToBusinessMinutes(
      bookingDetails.time,
      businessHours
    )
    if (bookingStartMinutes === null) {
      toast({
        title: '時間の形式が不正です',
        description: '有効な時間を入力してください。',
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

      const selectedOptionIds = Object.entries(optionSelections)
        .filter(([, selected]) => Boolean(selected))
        .map(([optionId]) => optionId)

      const response = await fetch('/api/reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          castId: currentStaff.id,
          courseId: selectedCourseId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          status: bookingDetails.bookingStatus === '確定済' ? 'confirmed' : 'pending',
          options: selectedOptionIds,
          price: priceBreakdown.total,
          designationType:
            selectedDesignationFee?.name ?? getDesignationLabel(designationType, currentStaff ?? undefined),
          designationFee: priceBreakdown.designationFee,
          transportationFee: priceBreakdown.transportationFee,
          additionalFee: priceBreakdown.additionalFee,
          discountAmount: priceBreakdown.discount,
          pointsUsed: priceBreakdown.pointsApplied,
          paymentMethod: bookingDetails.paymentMethod,
          marketingChannel: bookingDetails.marketingChannel,
          areaId: bookingDetails.areaId || null,
          stationId: bookingDetails.stationId || null,
          locationMemo: bookingDetails.locationMemo,
          notes: bookingDetails.notes,
          storeRevenue: priceBreakdown.storeRevenue,
          staffRevenue: priceBreakdown.staffRevenue,
          welfareExpense: priceBreakdown.welfareExpense,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        let errorMessage =
          data?.error || (response.status === 409 ? 'この時間帯は予約できません。' : '予約の作成に失敗しました')

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

  const StepIndicator = () => (
    <div className="mb-6 flex items-center justify-center">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
              step === currentStep
                ? 'bg-gray-900 text-white'
                : step < currentStep
                  ? 'bg-gray-100 text-gray-900'
                  : 'bg-gray-200 text-gray-500'
            }`}
          >
            {step < currentStep ? <Check className="h-4 w-4" /> : step}
          </div>
          {step < 3 && (
            <div
              className={`mx-2 h-1 w-12 ${step < currentStep ? 'bg-gray-900' : 'bg-gray-200'}`}
            />
          )}
        </div>
      ))}
    </div>
  )

  const stepTitles = ['基本情報', '詳細設定', '確認・完了']

  const selectedTimeIso =
    bookingDetails.date && bookingDetails.time
      ? zonedTimeToUtc(
          `${bookingDetails.date}T${bookingDetails.time}:00`,
          JST_TIMEZONE
        ).toISOString()
      : undefined

  const stationOptions = stations.filter((station) => !selectedAreaId || station.areaId === selectedAreaId)
  const selectedStation = stations.find((station) => station.id === selectedStationId) ?? null
  const selectedArea = areas.find((area) => area.id === selectedAreaId) ?? null

  useEffect(() => {
    if (!open) return

    setCurrentStep(1)
    if (courseCatalog.length > 0) {
      setSelectedCourseId(courseCatalog[0].id)
    }
    if (areas.length > 0) {
      setSelectedAreaId(areas[0].id)
    }

    const stationOptions = stations.filter((station) =>
      areas.length > 0 ? station.areaId === (areas[0]?.id ?? station.areaId) : true
    )
    if (stationOptions.length > 0) {
      setSelectedStationId(stationOptions[0].id)
    }

    // Set default designation fee (first one, which should be "フリー指名")
    if (designationFees.length > 0) {
      setSelectedDesignationId(designationFees[0].id)
    }

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
      staff: currentStaff?.name ?? '',
      date: selectedTime ? formatDateInJst(selectedTime) : prev.date || formatDateInJst(new Date()),
      time: selectedTime ? formatTimeInJst(selectedTime) : businessHours.startLabel,
      options: {},
      transportationFee: stationOptions[0]?.transportationFee ?? 0,
      additionalFee: 0,
      discountAmount: 0,
      paymentMethod: PAYMENT_METHODS.CASH,
      marketingChannel:
        marketingChannels.includes(prev.marketingChannel) && prev.marketingChannel.length > 0
          ? prev.marketingChannel
          : marketingChannels[0] ?? DEFAULT_MARKETING_CHANNELS[0] ?? 'WEB',
      locationMemo: stationOptions[0]?.name ?? '',
      notes: '',
    }))
    setDesignationType('none')
  }, [
    open,
    selectedCustomer,
    currentStaff,
    selectedTime,
    courseCatalog,
    areas,
    stations,
    designationFees,
    businessHours.startLabel,
    marketingChannels,
  ])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
        <DialogDescription className="sr-only">
          予約受付の各ステップを完了し、情報を確認して予約を確定します。
        </DialogDescription>
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">簡単受付</DialogTitle>
          <StepIndicator />
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800">{stepTitles[currentStep - 1]}</h3>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-2">
          {currentStep === 1 && (
            <div className="space-y-6">
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
                        <h3 className="text-lg font-semibold">{bookingDetails.customerName || '未選択'}</h3>
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
                          stepMinutes={10}
                        />
                      ) : (
                        <div className="rounded-lg bg-gray-50 p-4 text-center text-gray-500">
                          担当者・日付・コースを選択すると空き時間が表示されます
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>担当キャスト</Label>
                    <Input value={bookingDetails.staff || '未選択'} readOnly className="bg-gray-50" />
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
                    <MapPin className="mr-2 h-5 w-5" />
                    出張エリア・待ち合わせ場所
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>エリア</Label>
                      <Select
                        value={selectedAreaId}
                        onValueChange={(value) => setSelectedAreaId(value)}
                        disabled={locationsLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="エリアを選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {areas.length === 0 ? (
                            <div className="px-4 py-2 text-sm text-gray-500">
                              エリア情報がありません
                            </div>
                          ) : (
                            areas.map((area) => (
                              <SelectItem key={area.id} value={area.id}>
                                {area.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>待ち合わせ駅</Label>
                      <Select
                        value={selectedStationId}
                        onValueChange={(value) => setSelectedStationId(value)}
                        disabled={locationsLoading || stationOptions.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="駅を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {stationOptions.length === 0 ? (
                            <div className="px-4 py-2 text-sm text-gray-500">
                              駅情報がありません
                            </div>
                          ) : (
                            stationOptions.map((station) => (
                              <SelectItem key={station.id} value={station.id}>
                                {station.name}
                                {station.transportationFee
                                  ? `（+${station.transportationFee}円）`
                                  : ''}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Train className="h-4 w-4" />
                      <span>
                        {selectedStation
                          ? `${selectedStation.name} / 目安移動時間 ${
                              selectedStation.travelTime ?? 0
                            }分 / 交通費 ${formatYen(selectedStation.transportationFee ?? 0)}`
                          : '駅情報が選択されていません'}
                      </span>
                    </div>
                    {selectedArea?.description && (
                      <div className="mt-2">{selectedArea.description}</div>
                    )}
                  </div>

                  <div>
                    <Label>現地情報メモ</Label>
                    <Textarea
                      name="locationMemo"
                      value={bookingDetails.locationMemo}
                      onChange={handleTextChange}
                      placeholder="ホテル名や部屋番号などがあれば入力してください"
                      rows={2}
                    />
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
                    選択中: {selectedDesignationFee?.name ?? 'なし'}
                    {priceBreakdown.designationFee > 0
                      ? `（${formatYen(priceBreakdown.designationFee)}）`
                      : ''}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
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
                    availableOptions.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center">
                          <Checkbox
                            id={option.id}
                            checked={Boolean(bookingDetails.options[option.id])}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(option.id, Boolean(checked))
                            }
                          />
                          <Label htmlFor={option.id} className="ml-3 font-medium">
                            {option.name}
                            {option.note ? (
                              <span className="ml-2 text-xs text-gray-500">({option.note})</span>
                            ) : null}
                          </Label>
                        </div>
                        <Badge variant="secondary">
                          {option.price === 0 ? '無料' : `+${option.price.toLocaleString()}円`}
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <CreditCard className="mr-2 h-5 w-5" />
                    支払い・経路情報
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>支払い方法</Label>
                      <Select
                        value={bookingDetails.paymentMethod}
                        onValueChange={(value) =>
                          setBookingDetails((prev) => ({ ...prev, paymentMethod: value }))
                        }
                      >
                        <SelectTrigger>
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

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label>交通費（円）</Label>
                      <Input
                        type="number"
                        value={bookingDetails.transportationFee}
                        readOnly
                        disabled
                        className="bg-gray-100"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        エリア・駅の選択内容から自動設定されます
                      </p>
                    </div>
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
                          handleNumberChange('discountAmount', Math.max(Number(event.target.value), 0))
                        }
                        min={0}
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
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <Check className="mr-2 h-5 w-5" />
                    予約内容確認
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-600">お客様:</span>
                        <span className="ml-2 font-semibold">
                          {bookingDetails.customerName || '未選択'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">日時:</span>
                        <span className="ml-2 font-semibold">
                          {bookingDetails.date} {bookingDetails.time}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">担当:</span>
                        <span className="ml-2 font-semibold">
                          {bookingDetails.staff || '未選択'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-600">コース:</span>
                        <span className="ml-2 font-semibold">
                          {selectedCourse
                            ? `${selectedCourse.name} ${selectedCourse.duration}分 ${formatYen(selectedCourse.price)}`
                            : '未選択'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">エリア:</span>
                        <span className="ml-2 font-semibold">
                          {selectedArea?.name || '未設定'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">駅:</span>
                        <span className="ml-2 font-semibold">
                          {selectedStation?.name || '未設定'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3 text-sm">
                    <div>
                      <span className="text-gray-600">現地メモ:</span>
                      <span className="ml-2">{bookingDetails.locationMemo || '記載なし'}</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-gray-600">支払い方法:</span>
                      <span className="ml-2">{bookingDetails.paymentMethod}</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-gray-600">集客チャネル:</span>
                      <span className="ml-2">{bookingDetails.marketingChannel}</span>
                    </div>
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
                    {priceBreakdown.transportationFee > 0 && (
                      <div className="flex justify-between">
                        <span>交通費</span>
                        <span>{formatYen(priceBreakdown.transportationFee)}</span>
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
                    {priceBreakdown.welfareExpense > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>
                          厚生費（{priceBreakdown.welfareRate.toFixed(1).replace(/\.0$/, '')}%）
                        </span>
                        <span>{formatYen(priceBreakdown.welfareExpense)}</span>
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
                        店舗取り分: {formatYen(priceBreakdown.storeRevenue)}
                      </div>
                      <div className="rounded-md bg-gray-100 p-2">
                        キャスト取り分: {formatYen(priceBreakdown.staffRevenue)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="border-t px-6 pb-6 pt-4">
          <div className="flex justify-between">
            <Button onClick={prevStep} disabled={currentStep === 1} variant="outline">
              <ChevronLeft className="mr-1 h-4 w-4" />
              戻る
            </Button>

            {currentStep < totalSteps ? (
              <Button onClick={nextStep}>
                次へ
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    処理中...
                  </>
                ) : (
                  <>
                    <Check className="mr-1 h-4 w-4" />
                    予約を確定
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

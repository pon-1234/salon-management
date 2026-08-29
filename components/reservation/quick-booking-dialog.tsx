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
import { Check, Calendar, Users, Loader2 } from 'lucide-react'
import { Customer } from '@/lib/customer/types'
import { Cast } from '@/lib/cast/types'
import { usePricing } from '@/hooks/use-pricing'
import { useLocations } from '@/hooks/use-locations'
import { useAvailability } from '@/hooks/use-availability'
import { TimeSlotPicker } from './time-slot-picker'
import { toast } from '@/hooks/use-toast'
import { isVipMember } from '@/lib/utils'
import { getDesignationFees } from '@/lib/designation/data'
import { pickAutoDesignationFee, payloadHasCompletedVisit } from '@/lib/designation/kind'
import type { DesignationFee } from '@/lib/designation/types'
import { BusinessHoursRange } from '@/lib/settings/business-hours'
import { useStore } from '@/contexts/store-context'
import { calculateReservationRevenue } from '@/lib/reservation/revenue'
import { normalizeOptionalPaymentReference } from '@/lib/reservation/financial-reference'
import { buildStoreCastEndpoint, buildStoreReservationEndpoint } from '@/lib/reservation/endpoints'
import { buildStoreScopedEndpoint } from '@/lib/store/endpoints'
import { MARKETING_CHANNELS, PAYMENT_METHODS } from '@/lib/constants'
import {
  RESERVATION_START_STEP_MINUTES,
  RESERVATION_START_STEP_SECONDS,
  reservationStartBoundaryToastTitle,
  reservationStartMinuteHint,
} from '@/lib/reservation/time-boundary'
import { TIMELINE_BOOKING_INTERVAL_MINUTES } from '@/lib/reservation/booking-slot-window'
import {
  composeMarketingChannel,
  parseMarketingChannel,
  partitionMarketingChannels,
} from '@/components/reservation/reservation-dialog.utils'
import {
  formatDateInJst,
  formatTimeInJst,
  formatYen,
  getCastAvailableOptions,
  getDesignationFeeAmount,
  getDesignationLabel,
  getUniqueSelectedOptionIds,
  ensureBookingDesignationOptions,
  normalizeToBusinessMinutes,
  type BookingDetails,
  type DesignationType,
  type NormalizedCourse,
  type NormalizedOption,
  type PriceBreakdown,
} from './quick-booking.utils'
import {
  QuickBookingPanelGrid,
  QuickBookingPricePanel,
  QuickBookingReceptionPanel,
  type ReceptionStaffOption,
} from './quick-booking-panels'

const paymentMethods = Object.values(PAYMENT_METHODS)
const DEFAULT_MARKETING_CHANNELS = [...MARKETING_CHANNELS]

const JST_TIMEZONE = 'Asia/Tokyo'

interface QuickBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedStaff?: Cast
  staffOptions?: Cast[]
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
    bookingStatus: '事前確認',
    staff: staffName,
    receptionStaffId: '',
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
    hotelName: '',
    roomNumber: '',
  }
}

export function QuickBookingDialog({
  open,
  onOpenChange,
  selectedStaff,
  staffOptions = [],
  selectedTime,
  selectedSlot,
  selectedCustomer,
  onReservationCreated,
  businessHours,
}: QuickBookingDialogProps) {
  const { currentStore } = useStore()
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false)
  const [createdReservationId, setCreatedReservationId] = useState<string | null>(null)
  const [activeStaffId, setActiveStaffId] = useState<string | null>(selectedStaff?.id ?? null)
  const wasOpenRef = useRef(false)
  const designationTouchedRef = useRef(false)
  const statusTouchedRef = useRef(false)
  const { areas, stations } = useLocations()
  const UNASSIGNED_VALUE = '__unassigned__'
  const [staffDetails, setStaffDetails] = useState<Cast | null>(
    selectedStaff &&
      Array.isArray(selectedStaff.availableOptions) &&
      selectedStaff.availableOptions.length > 0
      ? selectedStaff
      : null
  )
  const [marketingChannels, setMarketingChannels] = useState<string[]>(DEFAULT_MARKETING_CHANNELS)
  const [receptionStaffOptions, setReceptionStaffOptions] = useState<ReceptionStaffOption[]>([])
  const [customerHistory, setCustomerHistory] = useState<
    Array<{ id: string; startTime?: string; staffName?: string; serviceName?: string }>
  >([])

  const assignedStaff = useMemo(() => {
    const id = activeStaffId ?? selectedStaff?.id
    if (!id) return selectedStaff ?? null
    return staffOptions.find((member) => member.id === id) ?? selectedStaff ?? null
  }, [activeStaffId, selectedStaff, staffOptions])

  const partitionedChannels = useMemo(
    () => partitionMarketingChannels(marketingChannels),
    [marketingChannels]
  )

  const slotWindowStart = selectedSlot?.startTime ?? selectedTime ?? null
  const slotWindowEndLimit = selectedSlot?.endTime ?? null
  const slotHourWindowEnd =
    slotWindowStart !== null
      ? new Date(
          Math.min(
            slotWindowStart.getTime() + TIMELINE_BOOKING_INTERVAL_MINUTES * 60 * 1000,
            slotWindowEndLimit
              ? slotWindowEndLimit.getTime()
              : slotWindowStart.getTime() + TIMELINE_BOOKING_INTERVAL_MINUTES * 60 * 1000
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
    const mapped: NormalizedCourse[] =
      coursePrices.length > 0
        ? coursePrices.map((course) => ({
            id: course.id,
            name: course.name,
            duration: course.duration,
            price: course.price,
            storeShare: course.storeShare ?? null,
            castShare: course.castShare ?? null,
          }))
        : courses.map((course) => ({
            id: course.id,
            name: course.name,
            duration: course.duration,
            price: course.price,
            storeShare: null,
            castShare: null,
          }))
    return mapped
      .filter((course) => Number.isFinite(course.duration) && course.duration > 0)
      .sort((left, right) => left.duration - right.duration || left.price - right.price)
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

    if (!assignedStaff) {
      setStaffDetails(null)
      return
    }

    const hasDefinedOptions =
      Array.isArray(assignedStaff.availableOptions) && assignedStaff.availableOptions.length > 0

    if (hasDefinedOptions) {
      setStaffDetails(assignedStaff)
      return
    }

    const controller = new AbortController()

    ;(async () => {
      try {
        const response = await fetch(buildStoreCastEndpoint(currentStore.id, assignedStaff.id), {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch cast details for ${assignedStaff.id}`)
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
  }, [currentStore.id, assignedStaff])

  const currentStaff = useMemo(
    () => staffDetails ?? assignedStaff ?? null,
    [staffDetails, assignedStaff]
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
  const filteredStations = useMemo(
    () =>
      stations.filter(
        (station) => !bookingDetails.areaId || station.areaId === bookingDetails.areaId
      ),
    [stations, bookingDetails.areaId]
  )
  const designationOptions = useMemo(
    () => ensureBookingDesignationOptions(designationFees, currentStaff?.specialDesignationFee),
    [designationFees, currentStaff?.specialDesignationFee]
  )

  useEffect(() => {
    if (pricingLoading || courseCatalog.length === 0) {
      return
    }
    setSelectedCourseId((prev) => {
      if (prev && courseCatalog.some((course) => course.id === prev)) {
        return prev
      }
      if (prev) {
        return prev
      }
      return courseCatalog[0].id
    })
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
            setMarketingChannels(
              Array.from(new Set([...normalized, ...DEFAULT_MARKETING_CHANNELS]))
            )
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
    if (!open || !currentStore?.id) return
    let ignore = false
    const controller = new AbortController()

    const loadReceptionStaff = async () => {
      try {
        const response = await fetch(buildStoreScopedEndpoint('/api/admin', currentStore.id), {
          signal: controller.signal,
        })
        if (!response.ok) return
        const payload = await response.json().catch(() => null)
        const admins = Array.isArray(payload?.admins) ? payload.admins : []
        const options = admins
          .filter(
            (admin: ReceptionStaffOption & { isActive?: boolean }) => admin.isActive !== false
          )
          .map((admin: ReceptionStaffOption) => ({ id: admin.id, name: admin.name }))
        if (ignore) return
        setReceptionStaffOptions(options)
        setBookingDetails((prev) => ({
          ...prev,
          receptionStaffId:
            prev.receptionStaffId &&
            options.some((admin: ReceptionStaffOption) => admin.id === prev.receptionStaffId)
              ? prev.receptionStaffId
              : (options[0]?.id ?? ''),
        }))
      } catch (error) {
        if (!ignore && !(error instanceof DOMException && error.name === 'AbortError')) {
          console.warn('[QuickBookingDialog] Failed to load reception staff', error)
        }
      }
    }

    void loadReceptionStaff()
    return () => {
      ignore = true
      controller.abort()
    }
  }, [open, currentStore?.id])

  useEffect(() => {
    if (marketingChannels.length === 0) {
      return
    }
    const { methods, sites } = partitionMarketingChannels(marketingChannels)
    setBookingDetails((prev) => {
      if (prev.marketingChannel && marketingChannels.includes(prev.marketingChannel)) {
        return prev
      }
      const parsed = parseMarketingChannel(prev.marketingChannel)
      if (
        (parsed.method && methods.includes(parsed.method)) ||
        (parsed.site && sites.includes(parsed.site))
      ) {
        return prev
      }
      return {
        ...prev,
        marketingChannel: methods[0] ?? marketingChannels[0],
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
    if (!open || designationOptions.length === 0) {
      return
    }
    if (designationTouchedRef.current) {
      return
    }
    const fallback = pickAutoDesignationFee(designationOptions, false)
    setSelectedDesignationId((prev) =>
      prev && designationOptions.some((fee) => fee.id === prev) ? prev : (fallback?.id ?? '')
    )
  }, [designationOptions, open])

  useEffect(() => {
    if (!open || !selectedCustomer?.id || !currentStaff?.id || designationOptions.length === 0) {
      return
    }

    let ignore = false
    const controller = new AbortController()

    const loadHistory = async () => {
      try {
        const response = await fetch(
          buildStoreScopedEndpoint(
            `/api/reservation?customerId=${encodeURIComponent(selectedCustomer.id)}&castId=${encodeURIComponent(currentStaff.id)}&status=completed&limit=1`,
            currentStore.id
          ),
          { cache: 'no-store', credentials: 'include', signal: controller.signal }
        )
        if (!response.ok) {
          throw new Error('Failed to load designation history')
        }
        const payload: unknown = await response.json()
        if (ignore || designationTouchedRef.current) return
        const selected = pickAutoDesignationFee(
          designationOptions,
          payloadHasCompletedVisit(payload)
        )
        if (selected) {
          setSelectedDesignationId(selected.id)
        }
      } catch (error) {
        if (controller.signal.aborted || ignore) return
        console.error('Failed to auto-select designation from visit history:', error)
      }
    }

    void loadHistory()
    return () => {
      ignore = true
      controller.abort()
    }
  }, [open, selectedCustomer?.id, currentStaff?.id, designationOptions, currentStore.id])

  useEffect(() => {
    if (!open || !selectedCustomer?.id) {
      setCustomerHistory([])
      return
    }

    let ignore = false
    const controller = new AbortController()

    const loadCustomerHistory = async () => {
      try {
        const response = await fetch(
          buildStoreScopedEndpoint(
            `/api/reservation?customerId=${encodeURIComponent(selectedCustomer.id)}&limit=5`,
            currentStore.id
          ),
          { cache: 'no-store', credentials: 'include', signal: controller.signal }
        )
        if (!response.ok) {
          throw new Error('Failed to load customer history')
        }
        const payload: unknown = await response.json()
        const rows = Array.isArray(payload)
          ? payload
          : Array.isArray((payload as { data?: unknown })?.data)
            ? ((payload as { data: unknown[] }).data ?? [])
            : []
        if (ignore) return
        if (!statusTouchedRef.current) {
          setBookingDetails((prev) => ({
            ...prev,
            bookingStatus: rows.length > 0 ? '確定済' : '事前確認',
          }))
        }
        setCustomerHistory(
          rows.slice(0, 5).map((row) => {
            const record = row as {
              id?: string
              startTime?: string
              staffName?: string
              cast?: { name?: string }
              course?: { name?: string }
              serviceName?: string
            }
            return {
              id: String(record.id ?? ''),
              startTime: record.startTime,
              staffName: record.staffName ?? record.cast?.name,
              serviceName: record.serviceName ?? record.course?.name,
            }
          })
        )
      } catch (error) {
        if (controller.signal.aborted || ignore) return
        console.error('Failed to load customer history:', error)
      }
    }

    void loadCustomerHistory()
    return () => {
      ignore = true
      controller.abort()
    }
  }, [open, selectedCustomer?.id, currentStore.id])

  const lastCustomerIdRef = useRef<string | null>(null)
  useEffect(() => {
    const nextId = selectedCustomer?.id ?? null
    const customerChanged = lastCustomerIdRef.current !== nextId
    lastCustomerIdRef.current = nextId
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
      ...(customerChanged ? { usePoints: false, pointsToUse: 0 } : {}),
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
    return designationOptions.find((fee) => fee.id === selectedDesignationId) ?? null
  }, [selectedDesignationId, designationOptions])

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
        title: reservationStartBoundaryToastTitle(),
        description: reservationStartMinuteHint(),
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

      const isUpdate =
        typeof createdReservationId === 'string' &&
        createdReservationId.length > 0 &&
        createdReservationId !== 'created'
      if (!isUpdate) {
        const availability = await checkAvailability(currentStaff.id, startTime, endTime)
        if (!availability.available) {
          toast({
            title: '予約不可',
            description: 'この時間帯は既に予約が入っています。別の時間を選択してください。',
            variant: 'destructive',
          })
          return
        }
      }

      const selectedOptionIds = getUniqueSelectedOptionIds(optionSelections)
      const payload = {
        ...(isUpdate ? { id: createdReservationId } : {}),
        customerId: selectedCustomer.id,
        castId: currentStaff.id,
        receptionStaffId: bookingDetails.receptionStaffId || null,
        courseId: selectedCourseId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status:
          bookingDetails.bookingStatus === '仮予約'
            ? 'pending'
            : bookingDetails.bookingStatus === '事前確認'
              ? 'preconfirmed'
              : 'confirmed',
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
            ? normalizeOptionalPaymentReference(bookingDetails.paymentReference)
            : null,
        marketingChannel: bookingDetails.marketingChannel,
        areaId: bookingDetails.areaId || null,
        stationId: bookingDetails.stationId || null,
        hotelName: bookingDetails.hotelName.trim() || null,
        roomNumber: bookingDetails.roomNumber.trim() || null,
        locationMemo: bookingDetails.locationMemo.trim(),
        notes: bookingDetails.notes,
        storeRevenue: priceBreakdown.storeRevenue,
        staffRevenue: priceBreakdown.staffRevenue,
        welfareExpense: priceBreakdown.welfareExpense,
      }

      const response = await fetch(buildStoreReservationEndpoint(currentStore.id), {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
        title: isUpdate ? '予約を更新しました' : '予約完了',
        description: isUpdate ? '予約内容を更新しました。' : '予約が正常に作成されました。',
      })

      if (onReservationCreated) {
        onReservationCreated(reservationId)
      }

      if (!isUpdate) {
        setCreatedReservationId(reservationId ?? 'created')
      }
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
    !createdReservationId &&
    (bookingDetails.usePoints ||
      bookingDetails.pointsToUse > 0 ||
      bookingDetails.additionalFee > 0 ||
      bookingDetails.discountAmount > 0 ||
      bookingDetails.notes.trim().length > 0 ||
      bookingDetails.locationMemo.trim().length > 0 ||
      bookingDetails.paymentReference.trim().length > 0 ||
      Object.values(bookingDetails.options).some(Boolean))

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
    setCreatedReservationId(null)
    lastCustomerIdRef.current = selectedCustomer?.id ?? null
    setActiveStaffId(selectedStaff?.id ?? null)
    setSelectedCourseId(courseCatalog[0]?.id ?? '')
    designationTouchedRef.current = false
    statusTouchedRef.current = false
    setSelectedDesignationId(pickAutoDesignationFee(designationOptions, false)?.id ?? '')
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
    designationOptions,
    businessHours.startLabel,
    marketingChannels,
    selectedStaff?.id,
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
          {createdReservationId ? (
            <div
              role="status"
              className="mx-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
            >
              予約を作成しました。内容を確認できます。
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto px-2">
            <div
              data-testid="quick-booking-customer-summary"
              className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border bg-gray-50 px-3 py-1.5 text-sm"
            >
              <span className="text-xs font-medium text-gray-500">お客様情報</span>
              <span className="font-medium">{bookingDetails.customerName || '未選択'}</span>
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {bookingDetails.customerType || '---'}
              </Badge>
              <span className="text-gray-600">{bookingDetails.phoneNumber || '未設定'}</span>
              <span className="text-gray-600">{bookingDetails.points.toLocaleString()}pt</span>
              {customerHistory.length > 0 ? (
                <span className="w-full text-xs text-gray-500">
                  過去の履歴:{' '}
                  {customerHistory
                    .map((entry) => {
                      const when = entry.startTime
                        ? formatInTimeZone(new Date(entry.startTime), JST_TIMEZONE, 'MM/dd HH:mm')
                        : ''
                      return [when, entry.staffName, entry.serviceName].filter(Boolean).join(' ')
                    })
                    .join(' / ')}
                </span>
              ) : null}
            </div>
            <QuickBookingPanelGrid>
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quick-booking-area">対応エリア</Label>
                      <Select
                        value={bookingDetails.areaId || UNASSIGNED_VALUE}
                        onValueChange={(value) => {
                          const nextAreaId = value === UNASSIGNED_VALUE ? '' : value
                          setBookingDetails((prev) => ({
                            ...prev,
                            areaId: nextAreaId,
                            stationId: '',
                            stationName: '',
                          }))
                        }}
                      >
                        <SelectTrigger id="quick-booking-area">
                          <SelectValue placeholder="エリアを選択" />
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
                      <Label htmlFor="quick-booking-station">最寄り駅</Label>
                      <Select
                        value={bookingDetails.stationId || UNASSIGNED_VALUE}
                        onValueChange={(value) => {
                          const nextStation =
                            value === UNASSIGNED_VALUE
                              ? null
                              : (filteredStations.find((station) => station.id === value) ?? null)
                          setBookingDetails((prev) => ({
                            ...prev,
                            stationId: nextStation?.id ?? '',
                            stationName: nextStation?.name ?? '',
                            stationTravelTime: nextStation?.travelTime ?? 0,
                          }))
                        }}
                        disabled={filteredStations.length === 0}
                      >
                        <SelectTrigger id="quick-booking-station">
                          <SelectValue
                            placeholder={
                              bookingDetails.areaId ? '駅を選択' : 'エリアを選択してください'
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quick-booking-hotel-name">ホテル名</Label>
                      <Input
                        id="quick-booking-hotel-name"
                        name="hotelName"
                        value={bookingDetails.hotelName}
                        onChange={handleTextChange}
                        placeholder="例: 池袋ホテル"
                      />
                    </div>
                    <div>
                      <Label htmlFor="quick-booking-room-number">部屋番号</Label>
                      <Input
                        id="quick-booking-room-number"
                        name="roomNumber"
                        value={bookingDetails.roomNumber}
                        onChange={handleTextChange}
                        placeholder="例: 1203"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="quick-booking-location-memo">訪問先メモ</Label>
                    <Textarea
                      id="quick-booking-location-memo"
                      name="locationMemo"
                      value={bookingDetails.locationMemo}
                      onChange={handleTextChange}
                      placeholder="訪問先の目印や注意事項"
                      rows={2}
                      className="max-h-24 overflow-y-auto"
                    />
                  </div>

                  <div>
                    <Label>コース選択</Label>
                    {pricingLoading ? (
                      <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">
                        読み込み中...
                      </div>
                    ) : courseCatalog.length === 0 ? (
                      <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">
                        利用可能なコースがありません
                      </div>
                    ) : (
                      <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto">
                        {courseCatalog.map((course) => {
                          const selected = course.id === selectedCourseId
                          const label = `${course.name} ${course.duration}分 ${course.price.toLocaleString()}円`
                          return (
                            <Button
                              key={course.id}
                              type="button"
                              variant={selected ? 'default' : 'outline'}
                              className="h-auto whitespace-normal px-2 py-2 text-left text-xs leading-4"
                              onClick={() => setSelectedCourseId(course.id)}
                            >
                              {label}
                            </Button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="quick-booking-staff">担当キャスト</Label>
                    <Select
                      value={currentStaff?.id ?? undefined}
                      onValueChange={(value) => {
                        setActiveStaffId(value)
                        const next = staffOptions.find((member) => member.id === value)
                        setBookingDetails((prev) => ({
                          ...prev,
                          staff: next?.name ?? prev.staff,
                        }))
                      }}
                    >
                      <SelectTrigger id="quick-booking-staff">
                        <SelectValue placeholder="担当キャストを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {(staffOptions.length > 0
                          ? staffOptions
                          : currentStaff
                            ? [currentStaff]
                            : []
                        ).map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="quick-booking-designation">指名設定</Label>
                    <Select
                      value={selectedDesignationId || undefined}
                      onValueChange={(value) => {
                        designationTouchedRef.current = true
                        setSelectedDesignationId(value)
                      }}
                    >
                      <SelectTrigger id="quick-booking-designation">
                        <SelectValue placeholder="指名を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {designationOptions.map((fee) => (
                          <SelectItem key={fee.id} value={fee.id}>
                            {fee.name}（{fee.price > 0 ? formatYen(fee.price) : '0円'}）
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    オプション選択・支払い情報
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    data-testid="quick-booking-option-grid"
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    {availableOptions.length === 0 ? (
                      <div className="rounded-lg bg-gray-50 p-4 text-center text-gray-500 sm:col-span-2">
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
                                  <span className="ml-2 text-xs text-gray-500">
                                    ({option.note})
                                  </span>
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
                  </div>

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
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="quick-booking-use-points" className="text-sm font-medium">
                          ポイントを利用
                        </Label>
                        <p className="text-xs text-gray-500">
                          利用可能ポイント: {bookingDetails.points.toLocaleString()}pt
                        </p>
                      </div>
                      <Switch
                        id="quick-booking-use-points"
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
                </CardContent>
              </Card>

              <QuickBookingReceptionPanel
                marketingChannel={bookingDetails.marketingChannel}
                channelGroups={partitionedChannels}
                receptionStaffId={bookingDetails.receptionStaffId}
                receptionStaffOptions={receptionStaffOptions}
                bookingStatus={bookingDetails.bookingStatus}
                notes={bookingDetails.notes}
                onMarketingChannelChange={(marketingChannel) =>
                  setBookingDetails((prev) => ({ ...prev, marketingChannel }))
                }
                onReceptionStaffChange={(receptionStaffId) =>
                  setBookingDetails((prev) => ({ ...prev, receptionStaffId }))
                }
                onBookingStatusChange={(bookingStatus) => {
                  statusTouchedRef.current = true
                  setBookingDetails((prev) => ({ ...prev, bookingStatus }))
                }}
                onNotesChange={(notes) => setBookingDetails((prev) => ({ ...prev, notes }))}
              />

              <QuickBookingPricePanel
                priceBreakdown={priceBreakdown}
                designationName={selectedDesignationFee?.name ?? 'フリー'}
              />
            </QuickBookingPanelGrid>
          </div>

          <div
            data-testid="quick-booking-sticky-footer"
            className="sticky bottom-0 z-10 -mx-6 -mb-6 shrink-0 border-t bg-background px-6 py-4 shadow-[0_-8px_18px_-16px_rgba(0,0,0,0.45)]"
          >
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-28"
                onClick={() => handleDialogOpenChange(false)}
                disabled={isSubmitting}
              >
                閉じる
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    処理中...
                  </>
                ) : createdReservationId ? (
                  <>
                    <Check className="mr-1 h-4 w-4" />
                    予約を更新
                  </>
                ) : (
                  <>
                    <Check className="mr-1 h-4 w-4" />
                    {bookingDetails.bookingStatus === '仮予約'
                      ? '仮予約として保存'
                      : bookingDetails.bookingStatus === '事前確認'
                        ? '事前確認として保存'
                        : '予約を確定'}
                  </>
                )}
              </Button>
            </div>
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

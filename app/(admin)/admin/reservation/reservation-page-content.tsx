'use client'

/**
 * @design_doc   Admin reservation timeline/list orchestration and persistence boundary
 * @related_to   ReservationDialog, ReservationRepositoryImpl, Timeline
 * @known_issues None
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { DateNavigation } from '@/components/reservation/date-navigation'
import { ActionButtons } from '@/components/reservation/action-buttons'
import { Timeline } from '@/components/reservation/timeline'
import { ReservationList } from '@/components/reservation/reservation-list'
import { ViewToggle } from '@/components/reservation/view-toggle'
import { FilterDialog } from '@/components/reservation/filter-dialog'
import { Cast, Appointment } from '@/lib/cast/types'
import { getAllReservations } from '@/lib/reservation/data'
import { ReservationTable } from '@/components/reservation/reservation-table'
import {
  Reservation,
  ReservationApiUpdatePayload,
  ReservationData,
  ReservationSavePayload,
} from '@/lib/types/reservation'
import { customers as fallbackCustomers } from '@/lib/customer/data'
import { Customer } from '@/lib/customer/types'
import { ReservationDialog } from '@/components/reservation/reservation-dialog'
import { InfoBar } from '@/components/reservation/info-bar'
import { normalizeCastList } from '@/lib/cast/mapper'
import { mapReservationToReservationData } from '@/lib/reservation/transformers'
import { ReservationRepositoryImpl } from '@/lib/reservation/repository-impl'
import { toast } from '@/hooks/use-toast'
import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz'
import { CustomerUseCases } from '@/lib/customer/usecases'
import { CustomerRepositoryImpl } from '@/lib/customer/repository-impl'
import { shouldUseMockFallbacks } from '@/lib/config/feature-flags'
import {
  BusinessHoursRange,
  DEFAULT_BUSINESS_HOURS,
  parseBusinessHoursString,
  minutesToIsoInJst,
} from '@/lib/settings/business-hours'
import { useStore } from '@/contexts/store-context'
import { usePricing } from '@/hooks/use-pricing'
import {
  DEFAULT_TIMELINE_FILTERS,
  filterAndSortTimelineCasts,
  type TimelineFilterOptions,
} from '@/lib/reservation/timeline-filters'
import { hasPermission } from '@/lib/auth/permissions'
import { computeStoreCastRanks } from '@/lib/cast/rank'
import { buildReservationCustomerSelectionHref } from '@/lib/reservation/customer-selection-url'

interface ScheduleEntry {
  castId: string
  date?: string | Date
  startTime?: string
  endTime?: string
  isAvailable?: boolean
}

const JST_TIMEZONE = 'Asia/Tokyo'
const API_PAGE_SIZE = 100
const formatDateKey = (date: Date) => formatInTimeZone(date, JST_TIMEZONE, 'yyyy-MM-dd')

interface ReservationPageQuery {
  storeId: string
  startDate: string
  endDate: string
  limit: number
  offset: number
}

type ReservationPageFetcher = (query: ReservationPageQuery) => Promise<Reservation[]>

interface ReservationTimelineRefreshers {
  reloadCasts: () => Promise<unknown>
  reloadReservations: () => Promise<unknown>
}

interface StoreRequestVersion {
  storeId: string
  generation: number
}

export function acceptStoreScopedResponse<T>(
  requestVersion: StoreRequestVersion,
  activeVersion: StoreRequestVersion,
  response: T
): T | undefined {
  if (
    requestVersion.storeId !== activeVersion.storeId ||
    requestVersion.generation !== activeVersion.generation
  ) {
    return undefined
  }

  return response
}

export function buildCastListEndpoint(storeId: string): string {
  return `/api/cast?storeId=${encodeURIComponent(storeId)}&limit=${API_PAGE_SIZE}`
}

export async function refreshReservationTimeline({
  reloadCasts,
  reloadReservations,
}: ReservationTimelineRefreshers): Promise<void> {
  await Promise.all([reloadCasts(), reloadReservations()])
}

export function buildJstDayQueryRange(dateKey: string): {
  startDate: string
  endDate: string
} {
  const start = zonedTimeToUtc(`${dateKey}T00:00:00`, JST_TIMEZONE)
  const nextDayStart = zonedTimeToUtc(minutesToIsoInJst(dateKey, 24 * 60), JST_TIMEZONE)

  return {
    startDate: start.toISOString(),
    endDate: new Date(nextDayStart.getTime() - 1).toISOString(),
  }
}

export async function loadReservationsForJstDay({
  storeId,
  dateKey,
  fetchPage,
}: {
  storeId: string
  dateKey: string
  fetchPage: ReservationPageFetcher
}): Promise<Reservation[]> {
  const range = buildJstDayQueryRange(dateKey)
  const reservations: Reservation[] = []

  for (let offset = 0; ; offset += API_PAGE_SIZE) {
    const page = await fetchPage({
      storeId,
      ...range,
      limit: API_PAGE_SIZE,
      offset,
    })
    reservations.push(...page)

    if (page.length < API_PAGE_SIZE) {
      return reservations
    }
  }
}

export function indexSchedulesForJstDay(
  schedules: ScheduleEntry[],
  dateKey: string
): Map<string, ScheduleEntry> {
  const schedulesByCast = new Map<string, ScheduleEntry>()

  for (const entry of schedules) {
    if (!entry.date || formatDateKey(new Date(entry.date)) !== dateKey) {
      continue
    }
    schedulesByCast.set(entry.castId, entry)
  }

  return schedulesByCast
}

export function getActiveReservationData(reservations: ReservationData[]): ReservationData[] {
  return reservations.filter((reservation) => reservation.status !== 'cancelled')
}

export function applyReservationUpdate(
  reservations: ReservationData[],
  updatedReservation: ReservationData
): ReservationData[] {
  if (updatedReservation.status === 'cancelled') {
    return reservations.filter((reservation) => reservation.id !== updatedReservation.id)
  }

  const existingIndex = reservations.findIndex(
    (reservation) => reservation.id === updatedReservation.id
  )
  if (existingIndex === -1) {
    return [...reservations, updatedReservation]
  }

  return reservations.map((reservation) =>
    reservation.id === updatedReservation.id ? updatedReservation : reservation
  )
}

function toTimelineAppointmentStatus(status?: Reservation['status'] | string) {
  const normalized = typeof status === 'string' ? status : ''
  return normalized === 'pending' || normalized === 'tentative' || normalized === 'provisional'
    ? 'provisional'
    : 'confirmed'
}

function mapReservationDataToAppointment(reservation: ReservationData): Appointment {
  return {
    id: reservation.id,
    customerId: reservation.customerId,
    serviceId: reservation.serviceId || '',
    staffId: reservation.staffId || '',
    serviceName: reservation.course || '未設定',
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    customerName: reservation.customerName,
    customerPhone: reservation.phoneNumber || '未登録',
    customerEmail: reservation.email || '',
    reservationTime: reservation.time,
    status: toTimelineAppointmentStatus(reservation.status),
    location: reservation.location,
    price: reservation.totalPayment,
  }
}

export function applyReservationUpdateToCasts(
  casts: Cast[],
  updatedReservation: ReservationData
): Cast[] {
  const withoutExisting = casts.map((member) => ({
    ...member,
    appointments: member.appointments.filter(
      (appointment) => appointment.id !== updatedReservation.id
    ),
  }))

  if (updatedReservation.status === 'cancelled' || !updatedReservation.staffId) {
    return withoutExisting
  }

  const appointment = mapReservationDataToAppointment(updatedReservation)
  return withoutExisting.map((member) =>
    member.id === updatedReservation.staffId
      ? { ...member, appointments: [...member.appointments, appointment] }
      : member
  )
}

export function ReservationPageContent() {
  const useMockFallbacks = shouldUseMockFallbacks()
  const { currentStore } = useStore()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [allCasts, setAllCasts] = useState<Cast[]>([])
  const [castData, setCastData] = useState<Cast[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [view, setView] = useState<'timeline' | 'list'>('timeline')
  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
  const [timelineFilters, setTimelineFilters] =
    useState<TimelineFilterOptions>(DEFAULT_TIMELINE_FILTERS)
  const [selectedAppointment, setSelectedAppointment] = useState<ReservationData | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customers, setCustomers] = useState<Customer[]>(useMockFallbacks ? fallbackCustomers : [])
  const [rawReservations, setRawReservations] = useState<Reservation[]>([])
  const [currentDayReservations, setCurrentDayReservations] = useState<ReservationData[]>([])
  const [businessHours, setBusinessHours] = useState<BusinessHoursRange>(DEFAULT_BUSINESS_HOURS)
  const castRequestVersionRef = useRef<StoreRequestVersion>({
    storeId: currentStore.id,
    generation: 0,
  })
  const reservationRequestVersionRef = useRef<StoreRequestVersion>({
    storeId: currentStore.id,
    generation: 0,
  })
  const loadedCastStoreIdRef = useRef<string | null>(null)
  const { optionPrices } = usePricing(currentStore.id)
  const activeOptionCatalog = useMemo(
    () =>
      optionPrices
        .filter((option) => option.isActive && !option.archivedAt)
        .sort((left, right) => left.displayOrder - right.displayOrder)
        .map((option) => ({
          id: option.id,
          name: option.name,
          price: option.price,
          note: option.note,
        })),
    [optionPrices]
  )
  const reservationRepository = useMemo(
    () => new ReservationRepositoryImpl(undefined, currentStore.id),
    [currentStore.id]
  )
  const { data: session } = useSession()
  const grantedPermissions = session?.user?.permissions ?? []
  const canCreateReservation =
    hasPermission(grantedPermissions, 'customer:read') &&
    hasPermission(grantedPermissions, 'reservation:create')
  const canUpdateReservation = hasPermission(grantedPermissions, 'reservation:update')
  const customerUseCases = useMemo(
    () => new CustomerUseCases(new CustomerRepositoryImpl(currentStore.id)),
    [currentStore.id]
  )

  const customerId = searchParams.get('customerId')

  const selectedDateKey = useMemo(() => formatDateKey(selectedDate), [selectedDate])

  useEffect(() => {
    let ignore = false
    setCustomers(useMockFallbacks ? fallbackCustomers : [])

    const loadCustomers = async () => {
      try {
        const fetched = await customerUseCases.getAll()
        if (!ignore && Array.isArray(fetched)) {
          setCustomers(fetched)
        }
      } catch (error) {
        console.error('Failed to load customers:', error)
        if (!ignore) {
          setCustomers(useMockFallbacks ? fallbackCustomers : [])
        }
      }
    }

    loadCustomers()

    return () => {
      ignore = true
    }
  }, [customerUseCases, useMockFallbacks])

  useEffect(() => {
    if (customerId) {
      let ignore = false

      const resolveCustomer = async () => {
        const localMatch = customers.find((c) => c.id === customerId)
        if (localMatch) {
          setSelectedCustomer(localMatch)
          return
        }

        try {
          const fetchedCustomer = await customerUseCases.getById(customerId)
          if (!ignore) {
            if (fetchedCustomer) {
              setSelectedCustomer(fetchedCustomer)
            } else if (useMockFallbacks) {
              const fallback = fallbackCustomers.find((c) => c.id === customerId) || null
              setSelectedCustomer(fallback)
            } else {
              setSelectedCustomer(null)
            }
          }
        } catch (error) {
          console.error('Failed to load customer by id:', error)
          if (!ignore) {
            if (useMockFallbacks) {
              const fallback = fallbackCustomers.find((c) => c.id === customerId) || null
              setSelectedCustomer(fallback)
            } else {
              setSelectedCustomer(null)
            }
          }
        }
      }

      resolveCustomer()

      return () => {
        ignore = true
      }
    } else {
      setSelectedCustomer(null)
    }
  }, [customerId, customerUseCases, customers, useMockFallbacks])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    const loadBusinessHours = async () => {
      try {
        const response = await fetch(
          `/api/settings/store?storeId=${encodeURIComponent(currentStore.id)}`,
          {
            cache: 'no-store',
            credentials: 'include',
            signal: controller.signal,
          }
        )
        if (!response.ok) {
          throw new Error(`Failed to fetch store settings: ${response.status}`)
        }
        const payload = await response.json()
        const settings = payload?.data ?? payload
        if (settings?.businessHours) {
          setBusinessHours(parseBusinessHoursString(settings.businessHours))
        } else {
          setBusinessHours(DEFAULT_BUSINESS_HOURS)
        }
      } catch (error) {
        if ((error as any)?.name === 'AbortError') return
        console.error('Failed to load store settings:', error)
        setBusinessHours(DEFAULT_BUSINESS_HOURS)
      }
    }

    loadBusinessHours()

    return () => {
      controller.abort()
    }
  }, [currentStore.id])

  const loadCasts = useCallback(async () => {
    const requestVersion = {
      storeId: currentStore.id,
      generation: castRequestVersionRef.current.generation + 1,
    }
    castRequestVersionRef.current = requestVersion

    try {
      const response = await fetch(buildCastListEndpoint(currentStore.id), {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error(`Failed to fetch casts: ${response.status}`)
      }
      const payload = await response.json()
      const normalized = normalizeCastList(payload)
      const currentCasts = acceptStoreScopedResponse(
        requestVersion,
        castRequestVersionRef.current,
        normalized
      )
      if (currentCasts === undefined) {
        return
      }

      loadedCastStoreIdRef.current = requestVersion.storeId
      setAllCasts(currentCasts)
      setCastData([]) // wait for fetchData to populate based on schedules
    } catch (error) {
      if (acceptStoreScopedResponse(requestVersion, castRequestVersionRef.current, true)) {
        console.error('Failed to load cast data:', error)
      }
    }
  }, [currentStore.id])

  useEffect(() => {
    loadedCastStoreIdRef.current = null
    setAllCasts([])
    setCastData([])

    loadCasts()

    return () => {
      const activeRequest = castRequestVersionRef.current
      castRequestVersionRef.current = {
        storeId: activeRequest.storeId,
        generation: activeRequest.generation + 1,
      }
      loadedCastStoreIdRef.current = null
    }
  }, [currentStore.id, loadCasts])

  const fetchData = useCallback(async (): Promise<ReservationData[]> => {
    const requestVersion = {
      storeId: currentStore.id,
      generation: reservationRequestVersionRef.current.generation + 1,
    }
    reservationRequestVersionRef.current = requestVersion

    if (allCasts.length === 0 || loadedCastStoreIdRef.current !== currentStore.id) {
      if (acceptStoreScopedResponse(requestVersion, reservationRequestVersionRef.current, true)) {
        setCastData([])
        setCurrentDayReservations([])
        setRawReservations([])
      }
      return []
    }

    const allReservations = await loadReservationsForJstDay({
      storeId: currentStore.id,
      dateKey: selectedDateKey,
      fetchPage: getAllReservations,
    })
    const normalizedReservations = allReservations.map((reservation) => ({
      ...reservation,
      startTime: new Date(reservation.startTime),
      endTime: new Date(reservation.endTime),
    })) as Reservation[]
    const currentReservations = acceptStoreScopedResponse(
      requestVersion,
      reservationRequestVersionRef.current,
      normalizedReservations
    )
    if (currentReservations === undefined) {
      return []
    }
    setRawReservations(currentReservations)

    const todaysReservationData = currentReservations
      .filter((reservation) => formatDateKey(reservation.startTime) === selectedDateKey)
      .map((reservation) =>
        mapReservationToReservationData(reservation, { casts: allCasts, customers })
      )
    const activeReservationData = getActiveReservationData(todaysReservationData)
    setCurrentDayReservations(activeReservationData)

    let schedulesByCast = new Map<string, ScheduleEntry>()
    try {
      const { startDate: scheduleStartUtc, endDate: scheduleEndUtc } =
        buildJstDayQueryRange(selectedDateKey)

      const response = await fetch(
        `/api/cast-schedule?startDate=${scheduleStartUtc}&endDate=${scheduleEndUtc}&storeId=${encodeURIComponent(currentStore.id)}`,
        {
          credentials: 'include',
          cache: 'no-store',
        }
      )

      if (response.ok) {
        const payload = await response.json()
        const data = Array.isArray(payload?.data) ? payload.data : payload
        if (Array.isArray(data)) {
          schedulesByCast = indexSchedulesForJstDay(data, selectedDateKey)
        }
      }
    } catch (error) {
      if (acceptStoreScopedResponse(requestVersion, reservationRequestVersionRef.current, true)) {
        console.error('Failed to load schedule data:', error)
      }
    }

    if (!acceptStoreScopedResponse(requestVersion, reservationRequestVersionRef.current, true)) {
      return []
    }

    let updatedCastData: Cast[] = allCasts
      .map<Cast | null>((member) => {
        const scheduleEntry = schedulesByCast.get(member.id)
        const baseWorkStart = member.workStart ? new Date(member.workStart) : undefined
        const baseWorkEnd = member.workEnd ? new Date(member.workEnd) : undefined

        const workStart = scheduleEntry?.startTime
          ? new Date(scheduleEntry.startTime)
          : baseWorkStart
        const workEnd = scheduleEntry?.endTime ? new Date(scheduleEntry.endTime) : baseWorkEnd

        const isWorking = scheduleEntry
          ? scheduleEntry.isAvailable !== false &&
            Boolean(scheduleEntry.startTime && scheduleEntry.endTime)
          : Boolean(workStart && workEnd)

        const appointments: Appointment[] = activeReservationData
          .filter((reservation) => reservation.staffId === member.id)
          .map((reservation) => ({
            id: reservation.id,
            customerId: reservation.customerId,
            serviceId: reservation.serviceId || '',
            staffId: reservation.staffId || member.id,
            serviceName: reservation.course || '未設定',
            startTime: reservation.startTime,
            endTime: reservation.endTime,
            customerName: reservation.customerName,
            customerPhone: reservation.phoneNumber || '未登録',
            customerEmail: reservation.email || '',
            reservationTime: reservation.time,
            status: toTimelineAppointmentStatus(reservation.status),
            location: reservation.location,
            price: reservation.totalPayment,
            designationType: reservation.designationType ?? reservation.designation,
          }))

        const hasAppointments = appointments.length > 0
        if (!isWorking && !hasAppointments) {
          return null
        }

        return {
          ...member,
          appointments,
          workStart,
          workEnd,
          workStatus: scheduleEntry?.isAvailable === false ? '休日' : member.workStatus,
        } satisfies Cast
      })
      .filter((member): member is Cast => member !== null)

    if (selectedCustomer) {
      const ngCastIds =
        selectedCustomer.ngCasts?.map((ng) => ng.castId) || selectedCustomer.ngCastIds || []
      updatedCastData = updatedCastData.filter((member) => !ngCastIds.includes(member.id))
    }

    const computedRanks = computeStoreCastRanks(
      activeReservationData.map((reservation) => ({
        castId: reservation.staffId ?? null,
        castName: reservation.staff,
        designationType: reservation.designation,
      }))
    )
    updatedCastData = updatedCastData.map((member) => {
      const computed = computedRanks.get(member.id)
      if (!computed) return member
      return {
        ...member,
        regularDesignationRank: member.regularDesignationRank || computed.regularDesignationRank,
        panelDesignationRank: member.panelDesignationRank || computed.panelDesignationRank,
      }
    })

    setCastData(updatedCastData)
    return activeReservationData
  }, [allCasts, selectedDateKey, selectedCustomer, customers, currentStore.id])

  useEffect(() => {
    fetchData()

    return () => {
      reservationRequestVersionRef.current = {
        storeId: currentStore.id,
        generation: reservationRequestVersionRef.current.generation + 1,
      }
    }
  }, [currentStore.id, fetchData, selectedCustomer, selectedDateKey])

  const handleRefresh = () => {
    void refreshReservationTimeline({
      reloadCasts: loadCasts,
      reloadReservations: fetchData,
    })
  }

  const handleReservationSave = async (reservationId: string, payload: ReservationSavePayload) => {
    const targetReservation = rawReservations.find(
      (reservation) => reservation.id === reservationId
    )
    if (!targetReservation) {
      toast({
        title: '予約が見つかりません',
        description: '対象の予約が存在しないか、読み込みに失敗しました。',
        variant: 'destructive',
      })
      return
    }

    try {
      const updatePayload: ReservationApiUpdatePayload = { ...payload }

      const updatedReservation = await reservationRepository.update(reservationId, updatePayload)
      const normalizedUpdated = {
        ...updatedReservation,
        startTime: new Date(updatedReservation.startTime),
        endTime: new Date(updatedReservation.endTime),
        modifiableUntil: updatedReservation.modifiableUntil
          ? new Date(updatedReservation.modifiableUntil)
          : undefined,
      } as Reservation
      const updatedData = mapReservationToReservationData(normalizedUpdated, {
        casts: allCasts,
        customers,
      })

      setRawReservations((current) =>
        current.map((reservation) =>
          reservation.id === reservationId ? normalizedUpdated : reservation
        )
      )
      setCurrentDayReservations((current) => applyReservationUpdate(current, updatedData))
      setCastData((current) => applyReservationUpdateToCasts(current, updatedData))
      setSelectedAppointment(updatedData.status === 'cancelled' ? null : updatedData)

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

  const visibleCastData = useMemo(
    () => filterAndSortTimelineCasts(castData, timelineFilters),
    [castData, timelineFilters]
  )

  const handleFilterDialogOpen = () => {
    setFilterDialogOpen(true)
  }

  const handleFilterDialogApply = (filters: TimelineFilterOptions) => {
    setTimelineFilters(filters)
    setFilterDialogOpen(false)
  }

  const handleCustomerSelection = (customer: Customer | null) => {
    setSelectedCustomer(customer)
    router.replace(
      buildReservationCustomerSelectionHref(
        pathname,
        searchParams.toString(),
        customer?.id ?? null
      ),
      { scroll: false }
    )
  }

  const allAppointments = getActiveReservationData(currentDayReservations)

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-30 border-b bg-white">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <DateNavigation selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          <div className="flex flex-wrap items-center">
            <ViewToggle view={view} onViewChange={setView} />
            <ActionButtons
              onRefresh={handleRefresh}
              onFilter={handleFilterDialogOpen}
              onCustomerSelect={handleCustomerSelection}
              selectedCustomer={selectedCustomer}
              canCreateReservation={canCreateReservation}
            />
          </div>
        </div>
        <InfoBar selectedCustomer={selectedCustomer} />
      </div>

      <FilterDialog
        open={filterDialogOpen}
        onOpenChange={setFilterDialogOpen}
        onApplyFilters={handleFilterDialogApply}
        filters={timelineFilters}
        selectedDate={selectedDate}
        options={activeOptionCatalog.map(({ id, name }) => ({ id, name }))}
      />

      {view === 'timeline' ? (
        <Timeline
          staff={visibleCastData}
          selectedDate={selectedDate}
          selectedCustomer={selectedCustomer}
          setSelectedAppointment={setSelectedAppointment}
          reservations={currentDayReservations}
          onReservationCreated={handleRefresh}
          businessHours={businessHours}
          optionCatalog={activeOptionCatalog}
          canCreateReservation={canCreateReservation}
          onScheduleSaved={handleRefresh}
        />
      ) : (
        <ReservationTable
          reservations={allAppointments}
          onOpenReservation={setSelectedAppointment}
        />
      )}

      {selectedAppointment && (
        <ReservationDialog
          open={!!selectedAppointment}
          onOpenChange={(open) => !open && setSelectedAppointment(null)}
          reservation={selectedAppointment}
          casts={allCasts}
          onSave={canUpdateReservation ? handleReservationSave : undefined}
        />
      )}
    </div>
  )
}

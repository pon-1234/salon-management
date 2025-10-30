'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Header } from '@/components/header'
import { DateNavigation } from '@/components/reservation/date-navigation'
import { ActionButtons } from '@/components/reservation/action-buttons'
import { Timeline } from '@/components/reservation/timeline'
import { ReservationList } from '@/components/reservation/reservation-list'
import { ViewToggle } from '@/components/reservation/view-toggle'
import { FilterDialog, FilterOptions } from '@/components/reservation/filter-dialog'
import { Cast, Appointment } from '@/lib/cast/types'
import { getAllReservations } from '@/lib/reservation/data'
import { ReservationTable } from '@/components/reservation/reservation-table'
import { Reservation, ReservationData, ReservationUpdatePayload } from '@/lib/types/reservation'
import { customers as fallbackCustomers } from '@/lib/customer/data'
import { Customer } from '@/lib/customer/types'
import { ReservationDialog } from '@/components/reservation/reservation-dialog'
import { InfoBar } from '@/components/reservation/info-bar'
import { normalizeCastList } from '@/lib/cast/mapper'
import { mapReservationToReservationData } from '@/lib/reservation/transformers'
import { ReservationRepositoryImpl } from '@/lib/reservation/repository-impl'
import { toast } from '@/hooks/use-toast'
import tz from 'date-fns-tz'
import { CustomerUseCases } from '@/lib/customer/usecases'
import { CustomerRepositoryImpl } from '@/lib/customer/repository-impl'
import { shouldUseMockFallbacks } from '@/lib/config/feature-flags'
import {
  BusinessHoursRange,
  DEFAULT_BUSINESS_HOURS,
  parseBusinessHoursString,
  minutesToIsoInJst,
} from '@/lib/settings/business-hours'


interface ScheduleEntry {
  castId: string
  startTime?: string
  endTime?: string
  isAvailable?: boolean
}

const JST_TIMEZONE = 'Asia/Tokyo'

export function ReservationPageContent() {
  const useMockFallbacks = shouldUseMockFallbacks()
  const [allCasts, setAllCasts] = useState<Cast[]>([])
  const [castData, setCastData] = useState<Cast[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [view, setView] = useState<'timeline' | 'list'>('timeline')
  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<ReservationData | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customers, setCustomers] = useState<Customer[]>(
    useMockFallbacks ? fallbackCustomers : []
  )
  const [rawReservations, setRawReservations] = useState<Reservation[]>([])
  const [currentDayReservations, setCurrentDayReservations] = useState<ReservationData[]>([])
  const [businessHours, setBusinessHours] = useState<BusinessHoursRange>(DEFAULT_BUSINESS_HOURS)
  const reservationRepository = useMemo(() => new ReservationRepositoryImpl(), [])
  const { data: session } = useSession()
  const customerUseCases = useMemo(
    () => new CustomerUseCases(new CustomerRepositoryImpl()),
    []
  )

  const searchParams = useSearchParams()
  const customerId = searchParams.get('customerId')

  const { formatInTimeZone, zonedTimeToUtc } = tz

  const selectedDateKey = useMemo(
    () => formatInTimeZone(selectedDate, JST_TIMEZONE, 'yyyy-MM-dd'),
    [selectedDate, formatInTimeZone]
  )

  useEffect(() => {
    let ignore = false

    const loadCustomers = async () => {
      try {
        const fetched = await customerUseCases.getAll()
        if (!ignore && Array.isArray(fetched) && fetched.length > 0) {
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
        const response = await fetch('/api/settings/store', {
          cache: 'no-store',
          credentials: 'include',
          signal: controller.signal,
        })
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
  }, [])

  useEffect(() => {
    const loadCasts = async () => {
      try {
        const response = await fetch('/api/cast', {
          cache: 'no-store',
          credentials: 'include',
        })
        if (!response.ok) {
          throw new Error(`Failed to fetch casts: ${response.status}`)
        }
        const payload = await response.json()
        const normalized = normalizeCastList(payload)
        setAllCasts(normalized)
        setCastData([]) // wait for fetchData to populate based on schedules
      } catch (error) {
        console.error('Failed to load cast data:', error)
      }
    }

    loadCasts()
  }, [])

  const fetchData = useCallback(async (): Promise<ReservationData[]> => {
    if (allCasts.length === 0) {
      setCastData([])
      setCurrentDayReservations([])
      setRawReservations([])
      return []
    }

    const allReservations = await getAllReservations()
    const normalizedReservations = allReservations.map((reservation) => ({
      ...reservation,
      startTime: new Date(reservation.startTime),
      endTime: new Date(reservation.endTime),
    })) as Reservation[]
    setRawReservations(normalizedReservations)

    const todaysReservationData = normalizedReservations
      .filter(
        (reservation) =>
          formatInTimeZone(reservation.startTime, JST_TIMEZONE, 'yyyy-MM-dd') === selectedDateKey
      )
      .map((reservation) =>
        mapReservationToReservationData(reservation, { casts: allCasts, customers })
      )
    setCurrentDayReservations(todaysReservationData)

    let schedulesByCast = new Map<string, ScheduleEntry>()
    try {
      const scheduleStartUtc = zonedTimeToUtc(
        `${selectedDateKey}T00:00:00`,
        JST_TIMEZONE
      ).toISOString()
      const scheduleEndLocal = minutesToIsoInJst(selectedDateKey, businessHours.endMinutes)
      const scheduleEndUtc = zonedTimeToUtc(scheduleEndLocal, JST_TIMEZONE).toISOString()

      const response = await fetch(
        `/api/cast-schedule?startDate=${scheduleStartUtc}&endDate=${scheduleEndUtc}`,
        {
          credentials: 'include',
          cache: 'no-store',
        }
      )

      if (response.ok) {
        const payload = await response.json()
        const data = Array.isArray(payload?.data) ? payload.data : payload
        if (Array.isArray(data)) {
          data.forEach((entry: ScheduleEntry) => {
            schedulesByCast.set(entry.castId, entry)
          })
        }
      }
    } catch (error) {
      console.error('Failed to load schedule data:', error)
    }

    let updatedCastData = allCasts
      .map((member) => {
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

        const appointments: Appointment[] = todaysReservationData
          .filter(
            (reservation) => reservation.staffId === member.id && reservation.status !== 'cancelled'
          )
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
            status: reservation.status === 'confirmed' ? 'confirmed' : 'provisional',
            location: reservation.location,
            price: reservation.totalPayment,
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
        }
      })
      .filter((member): member is Cast & { appointments: Appointment[] } => member !== null)

    if (selectedCustomer) {
      const ngCastIds =
        selectedCustomer.ngCasts?.map((ng) => ng.castId) || selectedCustomer.ngCastIds || []
      updatedCastData = updatedCastData.filter((member) => !ngCastIds.includes(member.id))
    }

    setCastData(updatedCastData)
    return todaysReservationData
  }, [
    allCasts,
    selectedDateKey,
    selectedCustomer,
    customers,
    businessHours,
    formatInTimeZone,
    zonedTimeToUtc,
  ])

  useEffect(() => {
    fetchData()
  }, [selectedDateKey, selectedCustomer, fetchData])

  const handleRefresh = () => {
    fetchData()
  }

  const handleReservationSave = async (
    reservationId: string,
    payload: ReservationUpdatePayload
  ) => {
    const targetReservation = rawReservations.find((reservation) => reservation.id === reservationId)
    if (!targetReservation) {
      toast({
        title: '予約が見つかりません',
        description: '対象の予約が存在しないか、読み込みに失敗しました。',
        variant: 'destructive',
      })
      return
    }

    try {
      const updatePayload: Partial<Reservation> & { castId?: string } = {
        castId: payload.castId,
        startTime: payload.startTime,
        endTime: payload.endTime,
      }

      if (payload.status) {
        updatePayload.status = payload.status as Reservation['status']
      }

      if (payload.notes !== undefined) {
        updatePayload.notes = payload.notes
      }

      if (payload.storeMemo !== undefined) {
        ;(updatePayload as any).storeMemo = payload.storeMemo
      }

      if (payload.designationType !== undefined) {
        updatePayload.designationType = payload.designationType
      }
      if (payload.designationFee !== undefined) {
        updatePayload.designationFee = payload.designationFee
      }
      if (payload.transportationFee !== undefined) {
        updatePayload.transportationFee = payload.transportationFee
      }
      if (payload.additionalFee !== undefined) {
        updatePayload.additionalFee = payload.additionalFee
      }
      if (payload.paymentMethod !== undefined) {
        updatePayload.paymentMethod = payload.paymentMethod
      }
      if (payload.marketingChannel !== undefined) {
        updatePayload.marketingChannel = payload.marketingChannel
      }
      if (payload.areaId !== undefined) {
        updatePayload.areaId = payload.areaId
      }
      if (payload.stationId !== undefined) {
        updatePayload.stationId = payload.stationId
      }
      if (payload.locationMemo !== undefined) {
        updatePayload.locationMemo = payload.locationMemo
      }
      if (payload.price !== undefined) {
        updatePayload.price = payload.price
      }

      await reservationRepository.update(reservationId, updatePayload)

      const updatedReservations = await fetchData()
      const refreshed = updatedReservations.find((entry) => entry.id === reservationId)
      if (refreshed) {
        setSelectedAppointment(refreshed)
      }

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

  const handleFilter = (filters: FilterOptions) => {
    if (allCasts.length === 0) return
    let filtered = [...allCasts]

    if (selectedCustomer) {
      const ngCastIds =
        selectedCustomer.ngCasts?.map((ng) => ng.castId) || selectedCustomer.ngCastIds || []
      filtered = filtered.filter((staff) => !ngCastIds.includes(staff.id))
    }

    if (filters.workStatus !== 'すべて') {
      filtered = filtered.filter((staff) => staff.workStatus === filters.workStatus)
    }

    if (filters.name) {
      const searchTerm = filters.name.toLowerCase()
      filtered = filtered.filter(
        (staff) =>
          staff.name.toLowerCase().includes(searchTerm) ||
          staff.nameKana.toLowerCase().includes(searchTerm)
      )
    }

    if (filters.ageRange) {
      const [min, max] = filters.ageRange.split('-').map((num) => parseInt(num))
      filtered = filtered.filter((staff) => {
        if (filters.ageRange.includes('以上')) {
          return staff.age >= min
        }
        return staff.age >= min && staff.age <= (max || min)
      })
    }

    if (filters.heightRange) {
      const [min, max] = filters.heightRange.split('-').map((num) => parseInt(num))
      filtered = filtered.filter((staff) => {
        if (filters.heightRange.includes('以上')) {
          return staff.height >= min
        }
        if (filters.heightRange.includes('以下')) {
          return staff.height <= min
        }
        return staff.height >= min && staff.height <= (max || min)
      })
    }

    if (filters.bustSize) {
      filtered = filtered.filter((staff) => {
        if (filters.bustSize.includes('以上')) {
          return staff.bust >= filters.bustSize.replace('以上', '')
        }
        return staff.bust === filters.bustSize
      })
    }

    if (filters.waistRange) {
      const [min, max] = filters.waistRange.split('-').map((num) => parseInt(num))
      filtered = filtered.filter((staff) => {
        if (filters.waistRange.includes('以上')) {
          return staff.waist >= min
        }
        if (filters.waistRange.includes('以下')) {
          return staff.waist <= min
        }
        return staff.waist >= min && staff.waist <= (max || min)
      })
    }

    if (filters.type) {
      filtered = filtered.filter((staff) => staff.type === filters.type)
    }

    setCastData(filtered)
  }

  const handleFilterDialogOpen = () => {
    setFilterDialogOpen(true)
  }

  const handleFilterDialogClose = () => {
    setFilterDialogOpen(false)
  }

  const handleFilterDialogApply = (filters: FilterOptions) => {
    handleFilter(filters)
    handleFilterDialogClose()
  }

  const handleCustomerSelection = (customer: Customer | null) => {
    setSelectedCustomer(customer)
    if (customer) {
      const params = new URLSearchParams(window.location.search)
      params.set('customerId', customer.id)
      const newUrl = `${window.location.pathname}?${params.toString()}`
      window.history.replaceState(null, '', newUrl)
    } else {
      const params = new URLSearchParams(window.location.search)
      params.delete('customerId')
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname
      window.history.replaceState(null, '', newUrl)
    }
  }

  const allAppointments = currentDayReservations

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <InfoBar selectedCustomer={selectedCustomer} />
      <DateNavigation selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      <ViewToggle view={view} onViewChange={setView} />
      <ActionButtons
        onRefresh={handleRefresh}
        onFilter={handleFilterDialogOpen}
        onCustomerSelect={handleCustomerSelection}
        selectedCustomer={selectedCustomer}
        onReservationCreated={handleRefresh}
        businessHours={businessHours}
      />

      <FilterDialog
        open={filterDialogOpen}
        onOpenChange={setFilterDialogOpen}
        onApplyFilters={handleFilterDialogApply}
      />

      {view === 'timeline' ? (
        <Timeline
          staff={castData}
          selectedDate={selectedDate}
          selectedCustomer={selectedCustomer}
          setSelectedAppointment={setSelectedAppointment}
          reservations={currentDayReservations}
          onReservationCreated={handleRefresh}
          businessHours={businessHours}
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
          onSave={handleReservationSave}
        />
      )}
    </div>
  )
}

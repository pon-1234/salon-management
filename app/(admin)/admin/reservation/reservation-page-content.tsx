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
import { customers as fallbackCustomers, Customer } from '@/lib/customer/data'
import { ReservationDialog } from '@/components/reservation/reservation-dialog'
import { InfoBar } from '@/components/reservation/info-bar'
import { normalizeCastList } from '@/lib/cast/mapper'
import { mapReservationToReservationData } from '@/lib/reservation/transformers'
import { ReservationRepositoryImpl } from '@/lib/reservation/repository-impl'
import { toast } from '@/hooks/use-toast'
import { recordModification } from '@/lib/modification-history/data'
import { startOfDay, endOfDay } from 'date-fns'
import { CustomerUseCases } from '@/lib/customer/usecases'
import { CustomerRepositoryImpl } from '@/lib/customer/repository-impl'

const isSameDay = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

interface ScheduleEntry {
  castId: string
  startTime?: string
  endTime?: string
  isAvailable?: boolean
}

export function ReservationPageContent() {
  const [allCasts, setAllCasts] = useState<Cast[]>([])
  const [castData, setCastData] = useState<Cast[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [view, setView] = useState<'timeline' | 'list'>('timeline')
  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<ReservationData | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customers, setCustomers] = useState<Customer[]>(fallbackCustomers)
  const [rawReservations, setRawReservations] = useState<Reservation[]>([])
  const [currentDayReservations, setCurrentDayReservations] = useState<ReservationData[]>([])
  const reservationRepository = useMemo(() => new ReservationRepositoryImpl(), [])
  const { data: session } = useSession()
  const customerUseCases = useMemo(
    () => new CustomerUseCases(new CustomerRepositoryImpl()),
    []
  )

  const searchParams = useSearchParams()
  const customerId = searchParams.get('customerId')

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
          setCustomers(fallbackCustomers)
        }
      }
    }

    loadCustomers()

    return () => {
      ignore = true
    }
  }, [customerUseCases])

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
            } else {
              const fallback = fallbackCustomers.find((c) => c.id === customerId) || null
              setSelectedCustomer(fallback)
            }
          }
        } catch (error) {
          console.error('Failed to load customer by id:', error)
          if (!ignore) {
            const fallback = fallbackCustomers.find((c) => c.id === customerId) || null
            setSelectedCustomer(fallback)
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
  }, [customerId, customers, customerUseCases])

  useEffect(() => {
    window.scrollTo(0, 0)
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
        setCastData(normalized)
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

    const dayStart = startOfDay(selectedDate)
    const dayEnd = endOfDay(selectedDate)

    let schedulesByCast = new Map<string, ScheduleEntry>()
    try {
      const response = await fetch(
        `/api/cast-schedule?startDate=${dayStart.toISOString()}&endDate=${dayEnd.toISOString()}`,
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

    const todaysReservations = normalizedReservations.filter((reservation) =>
      isSameDay(new Date(reservation.startTime), selectedDate)
    )

    const todaysReservationData = todaysReservations.map((reservation) =>
      mapReservationToReservationData(reservation, { casts: allCasts, customers })
    )
    setCurrentDayReservations(todaysReservationData)

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
  }, [allCasts, selectedDate, selectedCustomer, customers])

  useEffect(() => {
    fetchData()
  }, [selectedDate, selectedCustomer, fetchData])

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

      if (payload.notes !== undefined) {
        updatePayload.notes = payload.notes
      }

      if (payload.storeMemo !== undefined) {
        ;(updatePayload as any).storeMemo = payload.storeMemo
      }

      await reservationRepository.update(reservationId, updatePayload)

      const updatedReservations = await fetchData()
      const refreshed = updatedReservations.find((entry) => entry.id === reservationId)
      if (refreshed) {
        setSelectedAppointment(refreshed)
      }

      const actorId = session?.user?.id || 'admin-ui'
      const actorName = session?.user?.name || '管理ユーザー'

      if ((targetReservation as any).castId !== payload.castId) {
        recordModification(
          reservationId,
          actorId,
          actorName,
          'castId',
          '担当キャスト',
          (targetReservation as any).castId,
          payload.castId,
          '担当キャストを変更',
          '0.0.0.0',
          'browser',
          'session'
        )
      }

      if (
        targetReservation.startTime.getTime() !== payload.startTime.getTime() ||
        targetReservation.endTime.getTime() !== payload.endTime.getTime()
      ) {
        recordModification(
          reservationId,
          actorId,
          actorName,
          'schedule',
          '予約時間',
          `${targetReservation.startTime.toISOString()} - ${targetReservation.endTime.toISOString()}`,
          `${payload.startTime.toISOString()} - ${payload.endTime.toISOString()}`,
          '予約時間を変更',
          '0.0.0.0',
          'browser',
          'session'
        )
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

  const handleCustomerSelection = (customer: { id: string; name: string } | null) => {
    if (customer) {
      const fullCustomer = customerList.find((c) => c.id === customer.id)
      setSelectedCustomer(fullCustomer || null)
    } else {
      setSelectedCustomer(null)
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

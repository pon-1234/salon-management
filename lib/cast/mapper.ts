import { Cast, Appointment } from './types'
import { resolveOptionId } from '@/lib/options/data'

const toDate = (value: unknown): Date | undefined => {
  if (!value) return undefined
  const date = new Date(value as string)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export const FALLBACK_IMAGE = '/images/non-photo.svg'

const normalizeImages = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0)
      }
    } catch {
      return value ? [value] : []
    }
  }

  return []
}

const normalizeAvailableOptions = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }
  const mapped = value
    .map((item) => (typeof item === 'string' ? item : String(item ?? '')))
    .filter((id) => id.length > 0)
    .map((id) => resolveOptionId(id))
  return Array.from(new Set(mapped))
}

const normalizeAvailableOptionSettings = (value: unknown) => {
  if (!Array.isArray(value)) {
    return []
  }

  const normalized = value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const optionId = resolveOptionId(String((item as any).optionId ?? ''))
      if (!optionId) return null
      const visibility = (item as any).visibility === 'internal' ? 'internal' : 'public'
      return { optionId, visibility }
    })
    .filter((entry): entry is { optionId: string; visibility: 'public' | 'internal' } => Boolean(entry))

  const seen = new Set<string>()
  return normalized.filter((entry) => {
    if (seen.has(entry.optionId)) {
      return false
    }
    seen.add(entry.optionId)
    return true
  })
}

const isAppointment = (value: Appointment | null): value is Appointment => Boolean(value)

const toAppointmentStatus = (status: unknown): Appointment['status'] => {
  if (typeof status !== 'string') return 'provisional'
  const normalized = status.toLowerCase()
  if (normalized === 'confirmed' || normalized === 'completed' || normalized === 'modifiable') {
    return 'confirmed'
  }
  if (normalized === 'pending' || normalized === 'tentative' || normalized === 'provisional') {
    return 'provisional'
  }
  return 'provisional'
}

const normalizeAppointment = (raw: any): Appointment | null => {
  if (!raw) return null
  const start = toDate(raw.startTime)
  const end = toDate(raw.endTime)
  if (!start || !end) return null

  const availableOptionSettings = normalizeAvailableOptionSettings(
    (raw as any).castOptionSettings ?? (raw as any).availableOptionSettings
  )
  const availableOptions =
    availableOptionSettings.length > 0
      ? availableOptionSettings.map((entry) => entry.optionId)
      : normalizeAvailableOptions(raw.availableOptions)

  return {
    id: String(raw.id ?? ''),
    customerId: String(raw.customerId ?? ''),
    serviceId: String(raw.serviceId ?? ''),
    staffId: String(raw.staffId ?? raw.castId ?? ''),
    serviceName: raw.service?.name ?? raw.serviceName ?? '未設定',
    startTime: start,
    endTime: end,
    customerName: raw.customer?.name ?? raw.customerName ?? 'お客様',
    customerPhone: raw.customer?.phone ?? raw.customerPhone ?? '',
    customerEmail: raw.customer?.email ?? raw.customerEmail ?? '',
    reservationTime: raw.reservationTime ?? '',
    status: toAppointmentStatus(raw.status),
    location: raw.location,
    price: typeof raw.price === 'number' ? raw.price : Number(raw.price ?? 0),
  }
}

export const normalizeCast = (raw: any): Cast => {
  const appointmentsFromApi = Array.isArray(raw.appointments)
    ? raw.appointments
        .map(normalizeAppointment)
        .filter(isAppointment)
    : []

  const reservationAppointments = Array.isArray(raw.reservations)
    ? raw.reservations
        .map(normalizeAppointment)
        .filter(isAppointment)
    : []

  const appointments =
    appointmentsFromApi.length > 0 ? appointmentsFromApi : reservationAppointments

  const availableOptionSettings = normalizeAvailableOptionSettings(
    (raw as any).castOptionSettings ?? (raw as any).availableOptionSettings
  )
  const availableOptions =
    availableOptionSettings.length > 0
      ? availableOptionSettings.map((entry) => entry.optionId)
      : normalizeAvailableOptions(raw.availableOptions)

  return {
    id: String(raw.id ?? ''),
    name: raw.name ?? '',
    nameKana: raw.nameKana ?? raw.name ?? '',
    age: typeof raw.age === 'number' ? raw.age : Number(raw.age ?? 0),
    height: typeof raw.height === 'number' ? raw.height : Number(raw.height ?? 0),
    bust: String(raw.bust ?? ''),
    waist: typeof raw.waist === 'number' ? raw.waist : Number(raw.waist ?? 0),
    hip: typeof raw.hip === 'number' ? raw.hip : Number(raw.hip ?? 0),
    type: raw.type ?? '',
    image:
      typeof raw.image === 'string' && raw.image.trim().length > 0
        ? raw.image
        : normalizeImages(raw.images)[0] ?? FALLBACK_IMAGE,
    images: (() => {
      const normalized = normalizeImages(raw.images ?? raw.image)
      return normalized.length > 0 ? normalized : [FALLBACK_IMAGE]
    })(),
    description: raw.description ?? '',
    netReservation: Boolean(raw.netReservation),
    requestAttendanceEnabled: Boolean(raw.requestAttendanceEnabled),
    specialDesignationFee:
      raw.specialDesignationFee === null || raw.specialDesignationFee === undefined
        ? null
        : Number(raw.specialDesignationFee),
    regularDesignationFee:
      raw.regularDesignationFee === null || raw.regularDesignationFee === undefined
        ? null
        : Number(raw.regularDesignationFee),
    panelDesignationRank: Number(raw.panelDesignationRank ?? 0),
    regularDesignationRank: Number(raw.regularDesignationRank ?? 0),
    workStatus: raw.workStatus ?? '出勤',
    lineUserId: raw.lineUserId ?? null,
    welfareExpenseRate:
      raw.welfareExpenseRate === null || raw.welfareExpenseRate === undefined
        ? null
        : Number(raw.welfareExpenseRate),
    loginEmail: raw.loginEmail ?? null,
    workStart: toDate(raw.workStart),
    workEnd: toDate(raw.workEnd),
    appointments,
    availableOptions,
    availableOptionSettings,
    publicProfile: raw.publicProfile,
    createdAt: toDate(raw.createdAt) ?? new Date(),
    updatedAt: toDate(raw.updatedAt) ?? new Date(),
  }
}

export const normalizeCastList = (rawList: any[]): Cast[] => {
  if (!Array.isArray(rawList)) {
    return []
  }
  return rawList.map(normalizeCast)
}
